const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log('Navigating to Google Maps...');
    await page.goto('https://www.google.com/maps/search/restaurantes+medellin', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Waiting for place link...');
    await page.waitForSelector('a[href*="/maps/place"]');

    const cards = await page.$$('a[href*="/maps/place"]');
    if (cards.length > 0) {
      await page.evaluate(el => el.scrollIntoView({ block: 'center' }), cards[0]);
      await new Promise(r => setTimeout(r, 500));
      await cards[0].click();
      console.log('Clicked. Waiting 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));

      const paths = await page.evaluate(() => {
        // Find the H1 in the detail panel (not 'Resultados')
        const h1s = Array.from(document.querySelectorAll('h1'));
        const detailH1 = h1s.find(h1 => h1.textContent.trim() !== 'Resultados');
        
        if (!detailH1) return { error: 'Detail H1 not found' };

        const getPath = (el) => {
          const path = [];
          let current = el;
          while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
              selector += '#' + current.id;
            } else if (current.className) {
              selector += '.' + Array.from(current.classList).join('.');
            }
            const role = current.getAttribute('role');
            if (role) {
              selector += `[role="${role}"]`;
            }
            path.push(selector);
            current = current.parentElement;
          }
          return path.reverse().join(' > ');
        };

        // Find all buttons or links with data-item-id nearby or in the same main container
        return {
          h1Text: detailH1.textContent.trim(),
          h1Path: getPath(detailH1),
          containers: Array.from(document.querySelectorAll('[role="main"]')).map(el => getPath(el))
        };
      });

      console.log(JSON.stringify(paths, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

test();
