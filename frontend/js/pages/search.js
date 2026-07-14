/**
 * Search Page - Key feature page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';

let searchResults = [];
let selectedIds = new Set();
let localState = null;

export function renderSearch(container, state) {
  searchResults = [];
  selectedIds.clear();
  localState = state;

  container.innerHTML = `
    <div class="page-header animate-fade-in">
      <h1>🔍 Buscar Leads</h1>
      <p class="page-subtitle">Encuentra negocios por ciudad y nicho</p>
    </div>

    <div class="search-form-container animate-slide-up stagger-1">
      <form id="search-form" class="search-form">
        <div class="form-group">
          <label class="form-label" for="search-city">🏙️ Ciudad</label>
          <input
            type="text"
            id="search-city"
            class="input input-lg"
            placeholder="Ej: Bogotá, Medellín..."
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="search-niche">🏢 Nicho</label>
          <input
            type="text"
            id="search-niche"
            class="input input-lg"
            placeholder="Ej: Restaurantes, Gimnasios..."
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="search-limit">📊 Cantidad</label>
          <select id="search-limit" class="select input-lg">
            <option value="10" selected>10 resultados</option>
            <option value="15">15 resultados</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">&nbsp;</label>
          <button type="submit" id="search-btn" class="btn btn-primary btn-lg w-full">
            🔍 Buscar Leads
          </button>
        </div>
      </form>
    </div>

    <div id="search-status"></div>
    <div id="search-results"></div>
  `;

  document.getElementById('search-form').addEventListener('submit', handleSearch);
}

async function handleSearch(e) {
  e.preventDefault();

  const city = document.getElementById('search-city').value.trim();
  const niche = document.getElementById('search-niche').value.trim();
  const limit = parseInt(document.getElementById('search-limit').value);
  const btn = document.getElementById('search-btn');
  const statusEl = document.getElementById('search-status');
  const resultsEl = document.getElementById('search-results');

  if (!city || !niche) {
    showToast('Por favor, ingresa ciudad y nicho', 'warning');
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Buscando...';
  resultsEl.innerHTML = '';

  const messages = [
    'Abriendo Google Maps...',
    'Buscando negocios...',
    'Extrayendo datos de contacto...',
    'Verificando emails...',
    'Procesando resultados...',
    'Casi listo...'
  ];

  let msgIndex = 0;
  statusEl.innerHTML = `
    <div class="search-loading animate-fade-in">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="search-progress-text" id="search-progress-text">${messages[0]}</span>
      <div class="progress-bar" style="width: 300px; max-width: 100%;">
        <div class="progress-fill" id="search-progress-fill" style="width: 10%"></div>
      </div>
    </div>
  `;

  const msgInterval = setInterval(() => {
    msgIndex = Math.min(msgIndex + 1, messages.length - 1);
    const textEl = document.getElementById('search-progress-text');
    const fillEl = document.getElementById('search-progress-fill');
    if (textEl) textEl.textContent = messages[msgIndex];
    if (fillEl) fillEl.style.width = `${Math.min(10 + (msgIndex + 1) * 15, 90)}%`;
  }, 3000);

  try {
    const data = await api.searchLeads(city, niche, limit);
    clearInterval(msgInterval);
    let rawList = Array.isArray(data) ? data : (data.leads || data.results || []);
    
    // Filter out already claimed leads for advisors so they only see free leads
    if (localState && localState.user && localState.user.role !== 'admin') {
      rawList = rawList.filter(lead => !lead.already_saved);
    }

    searchResults = rawList;
    selectedIds.clear();

    statusEl.innerHTML = '';

    if (searchResults.length === 0) {
      resultsEl.innerHTML = `
        <div class="empty-state animate-fade-in">
          <span class="empty-icon">🔍</span>
          <h4 class="empty-title">No se encontraron resultados</h4>
          <p class="empty-description">Intenta con una ciudad o nicho diferente.</p>
        </div>
      `;
    } else {
      renderResults(resultsEl);
    }

    btn.disabled = false;
    btn.innerHTML = '🔍 Buscar Leads';
  } catch (err) {
    clearInterval(msgInterval);
    statusEl.innerHTML = '';
    showToast('Error en la búsqueda: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '🔍 Buscar Leads';
  }
}

function renderResults(container) {
  container.innerHTML = `
    <div class="results-header animate-fade-in">
      <span class="results-count">Se encontraron <span>${searchResults.length}</span> negocios</span>
    </div>

    <div class="table-container animate-slide-up">
      <table>
        <thead>
          <tr>
            <th class="checkbox-cell">
              <input type="checkbox" id="select-all" title="Seleccionar todos" />
            </th>
            <th>Negocio</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Website</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody id="results-tbody">
          ${searchResults.map((lead, i) => renderResultRow(lead, i)).join('')}
        </tbody>
      </table>
    </div>

    <div class="actions-bar animate-slide-up" id="actions-bar">
      <span class="selected-count" id="selected-count">${selectedIds.size} seleccionados</span>
      <div class="flex gap-3">
        <button class="btn btn-success" id="save-selected-btn" onclick="window.__saveSelectedLeads()">
          💾 Guardar Seleccionados
        </button>
      </div>
    </div>
  `;

  // Select all handler
  document.getElementById('select-all').addEventListener('change', (e) => {
    const checked = e.target.checked;
    searchResults.forEach((lead, i) => {
      if (lead.already_saved) return; // Skip already saved leads
      const cb = document.getElementById(`lead-cb-${i}`);
      if (cb) cb.checked = checked;
      if (checked) selectedIds.add(i);
      else selectedIds.delete(i);
    });
    updateSelectedCount();
  });

  // Save handler
  window.__saveSelectedLeads = async () => {
    if (selectedIds.size === 0) {
      showToast('Selecciona al menos un lead para guardar', 'warning');
      return;
    }

    const btn = document.getElementById('save-selected-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

    const leadsToSave = Array.from(selectedIds).map(i => searchResults[i]);

    try {
      await api.saveLeads(leadsToSave);
      showToast(`✅ ${leadsToSave.length} leads guardados correctamente`, 'success');
      btn.innerHTML = '✅ Guardados';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar Seleccionados';
      }, 2000);
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar Seleccionados';
    }
  };
}

function renderResultRow(lead, index) {
  const name = escapeHtml(lead.name || lead.business_name || '-');
  const address = escapeHtml(lead.address || '-');
  const phone = lead.phone || '';
  const email = lead.email || '';
  const website = lead.website || '';
  const rating = lead.rating || lead.stars || 0;
  const hasContact = phone || email;
  
  const alreadySaved = lead.already_saved;
  const savedByName = lead.saved_by_name;

  let nameHTML = name;
  if (alreadySaved) {
    nameHTML += ` <span class="badge badge-danger" style="margin-left: 8px; font-size: 0.7rem; font-weight: normal; padding: 2px 6px;">🔴 Ocupado por ${escapeHtml(savedByName)}</span>`;
  }

  return `
    <tr class="animate-fade-in stagger-${Math.min(index + 1, 10)}" style="${alreadySaved ? 'opacity: 0.5;' : (!hasContact ? 'opacity: 0.7;' : '')}">
      <td class="checkbox-cell">
        <input
          type="checkbox"
          id="lead-cb-${index}"
          ${selectedIds.has(index) ? 'checked' : ''}
          ${alreadySaved ? 'disabled' : ''}
          onchange="window.__toggleLead(${index}, this.checked)"
        />
      </td>
      <td class="font-semibold">${nameHTML}</td>
      <td class="text-muted text-sm">${address}</td>
      <td>
        ${phone
          ? `<a href="tel:${phone}" style="color: var(--color-success)">${escapeHtml(phone)}</a>`
          : '<span class="text-dim">-</span>'
        }
      </td>
      <td>
        ${email
          ? `<a href="mailto:${email}" style="color: var(--color-secondary)">${escapeHtml(email)}</a>`
          : '<span class="text-dim">-</span>'
        }
      </td>
      <td>
        ${website
          ? `<a href="${website}" target="_blank" rel="noopener" class="text-sm">🔗 Ver</a>`
          : '<span class="text-dim">-</span>'
        }
      </td>
      <td>${renderStars(rating)}</td>
    </tr>
  `;
}

// Global toggle
window.__toggleLead = (index, checked) => {
  if (checked) selectedIds.add(index);
  else selectedIds.delete(index);
  updateSelectedCount();
};

function updateSelectedCount() {
  const el = document.getElementById('selected-count');
  if (el) el.textContent = `${selectedIds.size} seleccionados`;
}

function renderStars(rating) {
  if (!rating) return '<span class="text-dim">-</span>';
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '⭐';
  if (half) stars += '✨';
  return `<span title="${rating}">${stars} <span class="text-muted text-xs">${rating}</span></span>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
