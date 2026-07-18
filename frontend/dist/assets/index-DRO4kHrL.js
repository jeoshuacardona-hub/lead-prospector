(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const l of t)if(l.type==="childList")for(const d of l.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function s(t){const l={};return t.integrity&&(l.integrity=t.integrity),t.referrerPolicy&&(l.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?l.credentials="include":t.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function n(t){if(t.ep)return;t.ep=!0;const l=s(t);fetch(t.href,l)}})();const Z=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:3001/api":"/api";let j=localStorage.getItem("token");async function g(a,e={}){const s={"Content-Type":"application/json",...e.headers};j&&(s.Authorization=`Bearer ${j}`);const n=await fetch(`${Z}${a}`,{...e,headers:s});if(!n.ok){const l=await n.json().catch(()=>({error:"Error de conexión"}));throw new Error(l.error||`HTTP ${n.status}`)}const t=n.headers.get("content-type");return t&&(t.includes("spreadsheet")||t.includes("csv")||t.includes("octet-stream"))?n:n.json()}const u={setToken(a){j=a},login:(a,e)=>g("/auth/login",{method:"POST",body:JSON.stringify({username:a,password:e})}),getMe:()=>g("/auth/me"),searchLeads:(a,e,s)=>g("/leads/search",{method:"POST",body:JSON.stringify({city:a,niche:e,limit:s})}),getLeads:(a={})=>{const e=new URLSearchParams(a).toString();return g(`/leads?${e}`)},saveLeads:a=>g("/leads/save",{method:"POST",body:JSON.stringify({leads:a})}),saveManualLead:a=>g("/leads/manual",{method:"POST",body:JSON.stringify(a)}),enrichLead:(a,e)=>g(`/leads/${a}/enrich`,{method:"PUT",body:JSON.stringify(e)}),updateLeadStatus:(a,e)=>g(`/leads/${a}/status`,{method:"PUT",body:JSON.stringify({status:e})}),deleteLead:a=>g(`/leads/${a}`,{method:"DELETE"}),exportCSV:async(a={})=>{const e=new URLSearchParams(a).toString(),n=await(await g(`/export/csv?${e}`)).blob(),t=URL.createObjectURL(n),l=document.createElement("a");l.href=t,l.download=`leads_${new Date().toISOString().split("T")[0]}.csv`,l.click(),URL.revokeObjectURL(t)},exportExcel:async(a={})=>{const e=new URLSearchParams(a).toString(),n=await(await g(`/export/excel?${e}`)).blob(),t=URL.createObjectURL(n),l=document.createElement("a");l.href=t,l.download=`leads_${new Date().toISOString().split("T")[0]}.xlsx`,l.click(),URL.revokeObjectURL(t)},getUsers:()=>g("/admin/users"),createUser:a=>g("/admin/users",{method:"POST",body:JSON.stringify(a)}),updateUser:(a,e)=>g(`/admin/users/${a}`,{method:"PUT",body:JSON.stringify(e)}),deleteUser:a=>g(`/admin/users/${a}`,{method:"DELETE"}),getStats:()=>g("/admin/stats")},V={success:"✅",error:"❌",info:"ℹ️",warning:"⚠️"},K=4e3;function X(){let a=document.getElementById("toast-container");return a||(a=document.createElement("div"),a.id="toast-container",a.className="toast-container",document.body.appendChild(a)),a}function r(a,e="info"){const s=X(),n=document.createElement("div");n.className=`toast toast-${e}`,n.innerHTML=`
    <span class="toast-icon">${V[e]||V.info}</span>
    <span class="toast-message">${a}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `,s.appendChild(n),requestAnimationFrame(()=>{n.classList.add("toast-visible")}),setTimeout(()=>{n.classList.remove("toast-visible"),n.classList.add("toast-exit"),setTimeout(()=>n.remove(),400)},K)}function Y(a,e){a.innerHTML=`
    <div class="login-page">
      <!-- Floating background orbs -->
      <div class="login-bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>

      <div class="login-card">
        <div class="login-logo">
          <span class="logo-icon">🎯</span>
          <h1>Lead Prospector</h1>
          <p>Prospección inteligente de clientes</p>
        </div>

        <form class="login-form" id="login-form">
          <div id="login-error" class="login-error"></div>

          <div class="form-group">
            <label class="form-label" for="login-username">👤 Usuario</label>
            <input
              type="text"
              id="login-username"
              class="input input-lg"
              placeholder="Ingresa tu usuario"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">🔒 Contraseña</label>
            <input
              type="password"
              id="login-password"
              class="input input-lg"
              placeholder="Ingresa tu contraseña"
              autocomplete="current-password"
              required
            />
          </div>

          <button type="submit" id="login-btn" class="btn btn-primary btn-lg w-full">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  `;const s=document.getElementById("login-form"),n=document.getElementById("login-error"),t=document.getElementById("login-btn");s.addEventListener("submit",async l=>{l.preventDefault();const d=document.getElementById("login-username").value.trim(),b=document.getElementById("login-password").value;if(!d||!b){n.textContent="Por favor, completa todos los campos",n.classList.add("show");return}t.disabled=!0,t.innerHTML='<span class="loading-spinner"></span> Ingresando...',n.classList.remove("show");try{const i=await u.login(d,b);u.setToken(i.token),r(`¡Bienvenido, ${i.user.full_name}!`,"success"),window.login(i.user,i.token)}catch(i){n.textContent=i.message||"Credenciales incorrectas",n.classList.add("show"),t.disabled=!1,t.innerHTML="Iniciar Sesión"}})}async function ee(a,e){var l,d,b;const s=((l=e.user)==null?void 0:l.role)==="admin",t=new Date().toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"});a.innerHTML=`
    <div class="page-header animate-fade-in">
      <h1>Bienvenido, ${((b=(d=e.user)==null?void 0:d.full_name)==null?void 0:b.split(" ")[0])||"Usuario"} 👋</h1>
      <p class="page-subtitle">${t.charAt(0).toUpperCase()+t.slice(1)}</p>
    </div>

    <div class="stats-grid" id="stats-grid">
      ${ae()}
    </div>

    <div class="quick-actions animate-fade-in stagger-5">
      <a href="#search" class="btn btn-primary btn-lg">🔍 Buscar Nuevos Leads</a>
      <a href="#my-leads" class="btn btn-secondary btn-lg">📋 Ver Mis Leads</a>
    </div>

    <div class="animate-fade-in stagger-6">
      <h3 class="mb-4">Leads Recientes</h3>
      <div class="table-container" id="recent-leads-table">
        <div class="loading-container">
          <div class="loading-spinner loading-spinner-lg"></div>
          <span class="loading-text">Cargando leads...</span>
        </div>
      </div>
    </div>
  `;try{let i={totalLeads:0,weekLeads:0,searches:0,enriched:0};if(s){const o=await u.getStats();i.totalLeads=o.total_leads!=null?o.total_leads:o.totalLeads||0,i.searches=o.total_searches!=null?o.total_searches:o.totalSearches||0,i.enriched=o.enrichment_rate!=null?Math.round(o.enrichment_rate)+"%":o.enrichmentRate?Math.round(o.enrichmentRate)+"%":"0%",i.weekLeads=o.leads_this_week!=null?o.leads_this_week:o.weekLeads||0}else{const o=await u.getLeads(),E=Array.isArray(o)?o:o.leads||[];i.totalLeads=E.length;const H=new Date;H.setDate(H.getDate()-7),i.weekLeads=E.filter(U=>new Date(U.created_at)>H).length,i.enriched=E.filter(U=>U.enriched||U.is_enriched).length,i.searches="-"}document.getElementById("stats-grid").innerHTML=`
      <div class="stat-card stat-card-gradient-1 animate-slide-up stagger-1">
        <span class="stat-icon">📊</span>
        <div class="stat-value">${i.totalLeads}</div>
        <div class="stat-label">Leads Totales</div>
      </div>
      <div class="stat-card stat-card-gradient-2 animate-slide-up stagger-2">
        <span class="stat-icon">📅</span>
        <div class="stat-value">${i.weekLeads}</div>
        <div class="stat-label">Leads Esta Semana</div>
      </div>
      <div class="stat-card stat-card-gradient-3 animate-slide-up stagger-3">
        <span class="stat-icon">🔎</span>
        <div class="stat-value">${i.searches}</div>
        <div class="stat-label">Búsquedas Realizadas</div>
      </div>
      <div class="stat-card stat-card-gradient-4 animate-slide-up stagger-4">
        <span class="stat-icon">✨</span>
        <div class="stat-value">${i.enriched}</div>
        <div class="stat-label">${s?"Tasa Enriquecimiento":"Leads Enriquecidos"}</div>
      </div>
    `;const m=await u.getLeads({limit:5,all:s}),c=Array.isArray(m)?m:m.leads||[];c.length===0?document.getElementById("recent-leads-table").innerHTML=`
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <h4 class="empty-title">Sin leads aún</h4>
          <p class="empty-description">Comienza a buscar leads para verlos aquí.</p>
        </div>
      `:document.getElementById("recent-leads-table").innerHTML=`
        <table>
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Ciudad</th>
              <th>Nicho</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${c.slice(0,5).map((o,E)=>`
              <tr class="animate-fade-in stagger-${E+1}">
                <td class="font-semibold">${M(o.name||o.business_name||"-")}</td>
                <td class="text-muted">${M(o.city||"-")}</td>
                <td class="text-muted">${M(o.niche||"-")}</td>
                <td>${o.phone?`<a href="tel:${o.phone}">${M(o.phone)}</a>`:'<span class="text-dim">-</span>'}</td>
                <td>${o.email?`<a href="mailto:${o.email}">${M(o.email)}</a>`:'<span class="text-dim">-</span>'}</td>
                <td>${te(o.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}catch(i){r("Error al cargar el dashboard: "+i.message,"error"),document.getElementById("stats-grid").innerHTML=`
      <div class="stat-card stat-card-gradient-1 animate-slide-up stagger-1">
        <span class="stat-icon">📊</span>
        <div class="stat-value">-</div>
        <div class="stat-label">Leads Totales</div>
      </div>
      <div class="stat-card stat-card-gradient-2 animate-slide-up stagger-2">
        <span class="stat-icon">📅</span>
        <div class="stat-value">-</div>
        <div class="stat-label">Leads Esta Semana</div>
      </div>
      <div class="stat-card stat-card-gradient-3 animate-slide-up stagger-3">
        <span class="stat-icon">🔎</span>
        <div class="stat-value">-</div>
        <div class="stat-label">Búsquedas Realizadas</div>
      </div>
      <div class="stat-card stat-card-gradient-4 animate-slide-up stagger-4">
        <span class="stat-icon">✨</span>
        <div class="stat-value">-</div>
        <div class="stat-label">Leads Enriquecidos</div>
      </div>
    `}}function ae(){return[1,2,3,4].map(a=>`
    <div class="stat-card stat-card-gradient-${a} animate-slide-up stagger-${a}">
      <span class="stat-icon" style="opacity:0.3">⏳</span>
      <div class="stat-value" style="opacity:0.3">...</div>
      <div class="stat-label" style="opacity:0.3">Cargando</div>
    </div>
  `).join("")}function te(a){const e={nuevo:{class:"info",label:"Nuevo"},contactado:{class:"warning",label:"Contactado"},convertido:{class:"success",label:"Convertido"},descartado:{class:"danger",label:"Descartado"}},s=e[a]||e.nuevo;return`<span class="badge badge-${s.class}">${s.label}</span>`}function M(a){const e=document.createElement("div");return e.textContent=a,e.innerHTML}let k=[],w=new Set,N=null;function se(a,e){k=[],w.clear(),N=e,a.innerHTML=`
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
            <option value="20" selected>20 resultados</option>
            <option value="30">30 resultados</option>
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
  `,document.getElementById("search-form").addEventListener("submit",ne)}async function ne(a){a.preventDefault();const e=document.getElementById("search-city").value.trim(),s=document.getElementById("search-niche").value.trim(),n=parseInt(document.getElementById("search-limit").value),t=document.getElementById("search-btn"),l=document.getElementById("search-status"),d=document.getElementById("search-results");if(!e||!s){r("Por favor, ingresa ciudad y nicho","warning");return}t.disabled=!0,t.innerHTML='<span class="loading-spinner"></span> Buscando...',d.innerHTML="";const b=["Abriendo Google Maps...","Buscando negocios...","Extrayendo datos de contacto...","Verificando emails...","Procesando resultados...","Casi listo..."];let i=0;l.innerHTML=`
    <div class="search-loading animate-fade-in">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="search-progress-text" id="search-progress-text">${b[0]}</span>
      <div class="progress-bar" style="width: 300px; max-width: 100%;">
        <div class="progress-fill" id="search-progress-fill" style="width: 10%"></div>
      </div>
    </div>
  `;const m=setInterval(()=>{i=Math.min(i+1,b.length-1);const c=document.getElementById("search-progress-text"),o=document.getElementById("search-progress-fill");c&&(c.textContent=b[i]),o&&(o.style.width=`${Math.min(10+(i+1)*15,90)}%`)},3e3);try{const c=await u.searchLeads(e,s,n);clearInterval(m);let o=Array.isArray(c)?c:c.leads||c.results||[];N&&N.user&&N.user.role!=="admin"&&(o=o.filter(E=>!E.already_saved)),k=o,w.clear(),l.innerHTML="",k.length===0?d.innerHTML=`
        <div class="empty-state animate-fade-in">
          <span class="empty-icon">🔍</span>
          <h4 class="empty-title">No se encontraron resultados</h4>
          <p class="empty-description">Intenta con una ciudad o nicho diferente.</p>
        </div>
      `:ie(d),t.disabled=!1,t.innerHTML="🔍 Buscar Leads"}catch(c){clearInterval(m),l.innerHTML="",r("Error en la búsqueda: "+c.message,"error"),t.disabled=!1,t.innerHTML="🔍 Buscar Leads"}}function ie(a){a.innerHTML=`
    <div class="results-header animate-fade-in">
      <span class="results-count">Se encontraron <span>${k.length}</span> negocios</span>
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
          ${k.map((e,s)=>le(e,s)).join("")}
        </tbody>
      </table>
    </div>

    <div class="actions-bar animate-slide-up" id="actions-bar">
      <span class="selected-count" id="selected-count">${w.size} seleccionados</span>
      <div class="flex gap-3">
        <button class="btn btn-success" id="save-selected-btn" onclick="window.__saveSelectedLeads()">
          💾 Guardar Seleccionados
        </button>
      </div>
    </div>
  `,document.getElementById("select-all").addEventListener("change",e=>{const s=e.target.checked;k.forEach((n,t)=>{if(n.already_saved)return;const l=document.getElementById(`lead-cb-${t}`);l&&(l.checked=s),s?w.add(t):w.delete(t)}),Q()}),window.__saveSelectedLeads=async()=>{if(w.size===0){r("Selecciona al menos un lead para guardar","warning");return}const e=document.getElementById("save-selected-btn");e.disabled=!0,e.innerHTML='<span class="loading-spinner"></span> Guardando...';const s=Array.from(w).map(n=>k[n]);try{await u.saveLeads(s),r(`✅ ${s.length} leads guardados correctamente`,"success"),e.innerHTML="✅ Guardados",setTimeout(()=>{e.disabled=!1,e.innerHTML="💾 Guardar Seleccionados"},2e3)}catch(n){r("Error al guardar: "+n.message,"error"),e.disabled=!1,e.innerHTML="💾 Guardar Seleccionados"}}}function le(a,e){const s=C(a.name||a.business_name||"-"),n=C(a.address||"-"),t=a.phone||"",l=a.email||"",d=a.website||"",b=a.rating||a.stars||0,i=t||l,m=a.already_saved,c=a.saved_by_name;let o=s;return m&&(o+=` <span class="badge badge-danger" style="margin-left: 8px; font-size: 0.7rem; font-weight: normal; padding: 2px 6px;">🔴 Ocupado por ${C(c)}</span>`),`
    <tr class="animate-fade-in stagger-${Math.min(e+1,10)}" style="${m?"opacity: 0.5;":i?"":"opacity: 0.7;"}">
      <td class="checkbox-cell">
        <input
          type="checkbox"
          id="lead-cb-${e}"
          ${w.has(e)?"checked":""}
          ${m?"disabled":""}
          onchange="window.__toggleLead(${e}, this.checked)"
        />
      </td>
      <td class="font-semibold">${o}</td>
      <td class="text-muted text-sm">${n}</td>
      <td>
        ${t?`<a href="tel:${t}" style="color: var(--color-success)">${C(t)}</a>`:'<span class="text-dim">-</span>'}
      </td>
      <td>
        ${l?`<a href="mailto:${l}" style="color: var(--color-secondary)">${C(l)}</a>`:'<span class="text-dim">-</span>'}
      </td>
      <td>
        ${d?`<a href="${d}" target="_blank" rel="noopener" class="text-sm">🔗 Ver</a>`:'<span class="text-dim">-</span>'}
      </td>
      <td>${oe(b)}</td>
    </tr>
  `}window.__toggleLead=(a,e)=>{e?w.add(a):w.delete(a),Q()};function Q(){const a=document.getElementById("selected-count");a&&(a.textContent=`${w.size} seleccionados`)}function oe(a){if(!a)return'<span class="text-dim">-</span>';const e=Math.floor(a),s=a-e>=.5;let n="";for(let t=0;t<e;t++)n+="⭐";return s&&(n+="✨"),`<span title="${a}">${n} <span class="text-muted text-xs">${a}</span></span>`}function C(a){const e=document.createElement("div");return e.textContent=a||"",e.innerHTML}function P(a,e,s={}){const n=document.getElementById("modal-overlay");n&&n.remove();const t=document.createElement("div");return t.id="modal-overlay",t.className="modal-overlay",t.innerHTML=`
    <div class="modal animate-slide-up">
      <div class="modal-header">
        <h3>${a}</h3>
        <button class="btn-icon" onclick="document.getElementById('modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">${e}</div>
      ${s.footer?`<div class="modal-footer">${s.footer}</div>`:""}
    </div>
  `,t.addEventListener("click",l=>{l.target===t&&t.remove()}),document.body.appendChild(t),t}function D(){const a=document.getElementById("modal-overlay");a&&a.remove()}const O=10;let L=1,y=[],I=[],_=null,p=null;async function re(a,e){L=1,y=[],I=[],p=null,_=e,a.innerHTML=`
    <div class="page-header animate-fade-in flex justify-between items-center flex-wrap gap-4" style="margin-bottom: var(--space-6);">
      <div>
        <h1>📋 Mis Leads</h1>
        <p class="page-subtitle">Gestiona y enriquece tus leads</p>
      </div>
      <button class="btn btn-primary" onclick="window.__openCreateManualLead()">➕ Agregar Lead Manual</button>
    </div>
    
    <div id="admin-summary-placeholder"></div>

    <div class="filter-bar animate-slide-up stagger-1">
      <div class="form-group">
        <label class="form-label">🏙️ Ciudad</label>
        <input type="text" id="filter-city" class="input" placeholder="Filtrar ciudad..." />
      </div>
      <div class="form-group">
        <label class="form-label">🏢 Nicho</label>
        <input type="text" id="filter-niche" class="input" placeholder="Filtrar nicho..." />
      </div>
      <div class="form-group">
        <label class="form-label">📊 Estado</label>
        <select id="filter-status" class="select">
          <option value="">Todos</option>
          <option value="nuevo">Nuevo</option>
          <option value="contactado">Contactado</option>
          <option value="convertido">Convertido</option>
          <option value="descartado">Descartado</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">✨ Enriquecido</label>
        <select id="filter-enriched" class="select">
          <option value="">Todos</option>
          <option value="true">Enriquecido</option>
          <option value="false">Pendiente</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">&nbsp;</label>
        <button class="btn btn-primary" id="apply-filters-btn">🔍 Aplicar</button>
      </div>
    </div>

    <div class="flex justify-between items-center mb-4 animate-fade-in stagger-2">
      <div class="export-actions">
        ${e.user.role==="admin"?`
          <button class="btn btn-secondary btn-sm" id="export-csv-btn">📥 Exportar CSV</button>
          <button class="btn btn-secondary btn-sm" id="export-excel-btn">📊 Exportar Excel</button>
        `:""}
      </div>
      <span class="text-muted text-sm" id="leads-count"></span>
    </div>

    <div class="table-container animate-slide-up stagger-3" id="leads-table-container">
      <div class="loading-container">
        <div class="loading-spinner loading-spinner-lg"></div>
        <span class="loading-text">Cargando leads...</span>
      </div>
    </div>

    <div id="leads-pagination" class="mt-6"></div>
  `,document.getElementById("apply-filters-btn").addEventListener("click",S);const s=document.getElementById("export-csv-btn");s&&s.addEventListener("click",de);const n=document.getElementById("export-excel-btn");n&&n.addEventListener("click",ce),await W()}async function W(){try{const a=_&&_.user&&_.user.role==="admin",e=await u.getLeads({all:a,limit:1e4});y=Array.isArray(e)?e:e.leads||[],S()}catch(a){r("Error al cargar leads: "+a.message,"error"),document.getElementById("leads-table-container").innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h4 class="empty-title">Error al cargar</h4>
        <p class="empty-description">${a.message}</p>
      </div>
    `}}function S(){const a=document.getElementById("filter-city").value.toLowerCase().trim(),e=document.getElementById("filter-niche").value.toLowerCase().trim(),s=document.getElementById("filter-status").value,n=document.getElementById("filter-enriched").value;I=y.filter(t=>{if(a&&!(t.city||"").toLowerCase().includes(a)||e&&!(t.niche||"").toLowerCase().includes(e)||s&&t.status!==s)return!1;const l=t.is_enriched||t.instagram||t.facebook||t.tiktok||t.linkedin||t.business_needs||t.weaknesses;return!(n==="true"&&!l||n==="false"&&l||p&&(t.user_username||"").toLowerCase()!==p)}),L=1,z()}function z(){const a=document.getElementById("leads-table-container"),e=document.getElementById("leads-pagination"),s=document.getElementById("leads-count"),n=document.getElementById("admin-summary-placeholder"),t=_&&_.user&&_.user.role==="admin";if(t&&n){const i={};["beatriz","mateo","angelica","yaily","melanie","hasbleidy","daniel"].forEach(c=>{i[c]={name:c.charAt(0).toUpperCase()+c.slice(1),count:0}}),y.forEach(c=>{const o=(c.user_username||"").toLowerCase(),E=c.user_full_name||c.user_username||"Admin/Otro";o&&(i[o]||(i[o]={name:E,count:0}),i[o].count++)}),n.innerHTML=`
      <div class="card mb-6 animate-slide-up" style="padding: var(--space-4); background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2);">
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 style="margin: 0;">📊 Resumen de Productividad (Líderes)</h3>
          ${p?`
            <button class="btn btn-danger btn-sm" onclick="window.__adminDeleteAllForAdvisor('${p}')">
              🗑️ Eliminar todos los leads de ${p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          `:""}
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-4 items-center">
            <button class="badge ${p?"btn-outline":"badge-info"}" 
                    style="font-size: 0.95rem; padding: 8px 16px; cursor: pointer; border: none; border-radius: 8px;"
                    onclick="window.__selectAdvisorFilter(null)">
              Total leads en el sistema: <strong>${y.length}</strong>
            </button>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(i).map(([c,o])=>`
                  <div class="chip" 
                       style="${p===c?"border: 2px solid var(--color-primary); background: rgba(139,92,246,0.15);":"border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);"} padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;"
                       onclick="window.__selectAdvisorFilter('${c}')"
                       title="Filtrar por ${o.name}">
                    👤 <strong>${o.name}</strong>: <span style="color: var(--color-success); font-weight: bold;">${o.count}</span>
                  </div>
                `).join("")}
            </div>
          </div>
          ${p?`
            <div style="font-size: 0.85rem; color: var(--color-secondary);">
              ℹ️ Mostrando únicamente leads de <strong>${p.charAt(0).toUpperCase()+p.slice(1)}</strong>. Haz click en el botón de "Total leads" o en otro asesor para cambiar de filtro.
            </div>
          `:""}
        </div>
      </div>
    `}else n&&(n.innerHTML="");if(s.textContent=`${I.length} leads encontrados`,I.length===0){a.innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h4 class="empty-title">No hay leads</h4>
        <p class="empty-description">No se encontraron leads con los filtros seleccionados.</p>
      </div>
    `,e.innerHTML="";return}const l=Math.ceil(I.length/O),d=(L-1)*O,b=I.slice(d,d+O);a.innerHTML=`
    <table>
      <thead>
        <tr>
          <th>Negocio</th>
          <th>Ciudad</th>
          <th>Nicho</th>
          <th>Teléfono</th>
          <th>Email</th>
          ${t?"<th>Asesor</th>":""}
          <th>Estado</th>
          <th>Enriquecido</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${b.map((i,m)=>`
          <tr class="animate-fade-in stagger-${Math.min(m+1,10)}">
            <td class="font-semibold">${h(i.name||i.business_name||"-")}</td>
            <td class="text-muted">${h(i.city||"-")}</td>
            <td class="text-muted">${h(i.niche||"-")}</td>
            <td>
              ${i.phone?`<a href="tel:${i.phone}" style="color: var(--color-success)">${h(i.phone)}</a>`:'<span class="text-dim">-</span>'}
            </td>
            <td>
              ${i.email?`<a href="mailto:${i.email}" style="color: var(--color-secondary)">${h(i.email)}</a>`:'<span class="text-dim">-</span>'}
            </td>
            ${t?`<td class="text-muted text-sm" style="font-weight: 500; color: var(--color-secondary);">${h(i.user_full_name||i.user_username||"-")}</td>`:""}
            <td>${ue(i.status)}</td>
            <td>${i.is_enriched||i.instagram||i.facebook||i.tiktok||i.linkedin||i.business_needs||i.weaknesses?"🟢":"🟡"}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-outline" onclick="window.__enrichLead(${i.id})" title="Enriquecer">
                  ✨
                </button>
                <select class="select" style="width:120px; padding: 4px 8px; font-size: 0.75rem;" onchange="window.__updateStatus(${i.id}, this.value)">
                  <option value="nuevo" ${i.status==="nuevo"?"selected":""}>Nuevo</option>
                  <option value="contactado" ${i.status==="contactado"?"selected":""}>Contactado</option>
                  <option value="convertido" ${i.status==="convertido"?"selected":""}>Convertido</option>
                  <option value="descartado" ${i.status==="descartado"?"selected":""}>Descartado</option>
                </select>
                <button class="btn btn-sm btn-danger" onclick="window.__deleteLead(${i.id})" title="Eliminar">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `,l>1?e.innerHTML=`
      <div class="pagination">
        <button class="page-btn" ${L===1?"disabled":""} onclick="window.__goToPage(${L-1})">← Anterior</button>
        ${Array.from({length:l},(i,m)=>m+1).map(i=>`<button class="page-btn ${i===L?"active":""}" onclick="window.__goToPage(${i})">${i}</button>`).join("")}
        <button class="page-btn" ${L===l?"disabled":""} onclick="window.__goToPage(${L+1})">Siguiente →</button>
      </div>
    `:e.innerHTML=""}window.__goToPage=a=>{L=a,z(),document.getElementById("leads-table-container").scrollIntoView({behavior:"smooth"})};window.__selectAdvisorFilter=a=>{p===a?p=null:p=a,S()};window.__adminDeleteAllForAdvisor=async a=>{const e=a.charAt(0).toUpperCase()+a.slice(1);if(!confirm(`¿Estás seguro de eliminar TODOS los leads de ${e}? Esta acción los borrará y liberará a todos para que otros asesores los puedan coger.`))return;const s=y.filter(l=>(l.user_username||"").toLowerCase()===a);if(s.length===0)return;const n=document.querySelector(".btn-danger");n&&(n.disabled=!0,n.innerHTML='<span class="loading-spinner"></span> Eliminando...');let t=0;for(const l of s)try{await u.deleteLead(l.id),y=y.filter(d=>d.id!==l.id),t++}catch(d){console.error(`Error deleting lead ${l.id}:`,d)}p=null,S(),r(`Se eliminaron y liberaron ${t} leads de ${e}`,"success")};window.__updateStatus=async(a,e)=>{try{await u.updateLeadStatus(a,e);const s=y.find(n=>n.id===a);s&&(s.status=e),r("Estado actualizado","success")}catch(s){r("Error al actualizar estado: "+s.message,"error")}};window.__deleteLead=async a=>{if(confirm("¿Estás seguro de eliminar este lead?"))try{await u.deleteLead(a),y=y.filter(e=>e.id!==a),S(),r("Lead eliminado","success")}catch(e){r("Error al eliminar: "+e.message,"error")}};window.__enrichLead=a=>{const e=y.find(n=>n.id===a);if(!e)return;const s={instagram:e.instagram||"",facebook:e.facebook||"",tiktok:e.tiktok||"",linkedin:e.linkedin||"",other_social:e.other_social||"",phone_confirm:e.phone_confirm||e.phone||"",business_needs:e.business_needs||"",weaknesses:e.weaknesses||"",notes:e.notes||""};P(`✨ Enriquecer: ${h(e.name||e.business_name||"Lead")}`,`
    <div class="flex flex-col gap-4">
      <div class="card" style="padding: var(--space-4);">
        <p class="text-sm text-muted mb-2">Datos actuales:</p>
        <p class="text-sm">📞 ${e.phone||'<span class="text-dim">Sin teléfono</span>'}</p>
        <p class="text-sm">📧 ${e.email||'<span class="text-dim">Sin email</span>'}</p>
        <p class="text-sm">🌐 ${e.website||'<span class="text-dim">Sin website</span>'}</p>
      </div>

      <div class="form-group">
        <label class="form-label">📸 Instagram URL</label>
        <input type="url" id="enrich-instagram" class="input" value="${h(s.instagram||"")}" placeholder="https://instagram.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">📘 Facebook URL</label>
        <input type="url" id="enrich-facebook" class="input" value="${h(s.facebook||"")}" placeholder="https://facebook.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">🎵 TikTok URL</label>
        <input type="url" id="enrich-tiktok" class="input" value="${h(s.tiktok||"")}" placeholder="https://tiktok.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">💼 LinkedIn URL</label>
        <input type="url" id="enrich-linkedin" class="input" value="${h(s.linkedin||"")}" placeholder="https://linkedin.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">🔗 Otra red social</label>
        <input type="url" id="enrich-other" class="input" value="${h(s.other_social||"")}" placeholder="URL de otra red social" />
      </div>
      <div class="form-group">
        <label class="form-label" style="color: var(--color-primary); font-weight: 600;">📞 Confirmación de Teléfono (Obligatorio)</label>
        <input type="tel" id="enrich-phone-confirm" class="input" value="${h(s.phone_confirm||"")}" placeholder="Escribe el número telefónico para confirmar..." required />
      </div>
      <div class="form-group">
        <label class="form-label" style="color: var(--color-primary); font-weight: 600;">🎯 ¿Qué crees que pueda necesitar este negocio? (Obligatorio)</label>
        <textarea id="enrich-needs" class="textarea" rows="3" placeholder="Describe las necesidades que detectas..." required>${h(s.business_needs||"")}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">🔎 ¿Qué falencias le ves?</label>
        <textarea id="enrich-weaknesses" class="textarea" rows="3" placeholder="Describe las falencias que observas...">${h(s.weaknesses||"")}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">📝 Notas adicionales</label>
        <textarea id="enrich-notes" class="textarea" rows="2" placeholder="Notas adicionales...">${h(s.notes||"")}</textarea>
      </div>

      <button class="btn btn-primary w-full" id="save-enrich-btn" onclick="window.__saveEnrichment(${a})">
        💾 Guardar Enriquecimiento
      </button>
    </div>
  `)};window.__saveEnrichment=async a=>{const e=document.getElementById("save-enrich-btn");e.disabled=!0,e.innerHTML='<span class="loading-spinner"></span> Guardando...';const s=document.getElementById("enrich-phone-confirm").value.trim(),n=document.getElementById("enrich-needs").value.trim();if(!s){r("⚠️ La confirmación de teléfono es obligatoria","warning"),document.getElementById("enrich-phone-confirm").focus(),e.disabled=!1,e.innerHTML="💾 Guardar Enriquecimiento";return}if(!n){r("⚠️ El campo de necesidades es obligatorio","warning"),document.getElementById("enrich-needs").focus(),e.disabled=!1,e.innerHTML="💾 Guardar Enriquecimiento";return}const t={instagram:document.getElementById("enrich-instagram").value.trim(),facebook:document.getElementById("enrich-facebook").value.trim(),tiktok:document.getElementById("enrich-tiktok").value.trim(),linkedin:document.getElementById("enrich-linkedin").value.trim(),other_social:document.getElementById("enrich-other").value.trim(),phone_confirm:s,business_needs:n,weaknesses:document.getElementById("enrich-weaknesses").value.trim(),notes:document.getElementById("enrich-notes").value.trim()};try{await u.enrichLead(a,t);const l=y.find(d=>d.id===a);l&&(l.is_enriched=1,l.instagram=t.instagram,l.facebook=t.facebook,l.tiktok=t.tiktok,l.linkedin=t.linkedin,l.other_social=t.other_social,l.phone_confirm=t.phone_confirm,l.business_needs=t.business_needs,l.weaknesses=t.weaknesses,l.notes=t.notes),D(),z(),r("Lead enriquecido correctamente","success")}catch(l){r("Error al enriquecer: "+l.message,"error"),e.disabled=!1,e.innerHTML="💾 Guardar Enriquecimiento"}};async function de(){try{const a=document.getElementById("export-csv-btn");if(!a)return;a.disabled=!0,a.innerHTML='<span class="loading-spinner"></span> Exportando...';let e;if(p){const n=y.find(t=>(t.user_username||"").toLowerCase()===p);n&&(e=n.user_id)}const s={city:document.getElementById("filter-city").value.trim(),niche:document.getElementById("filter-niche").value.trim(),status:document.getElementById("filter-status").value,user_id:e};await u.exportCSV(s),r("CSV descargado correctamente","success"),a.disabled=!1,a.innerHTML="📥 Exportar CSV"}catch(a){r("Error al exportar CSV: "+a.message,"error");const e=document.getElementById("export-csv-btn");e&&(e.disabled=!1,e.innerHTML="📥 Exportar CSV")}}async function ce(){try{const a=document.getElementById("export-excel-btn");a.disabled=!0,a.innerHTML='<span class="loading-spinner"></span> Exportando...';let e;if(p){const n=y.find(t=>(t.user_username||"").toLowerCase()===p);n&&(e=n.user_id)}const s={city:document.getElementById("filter-city").value.trim(),niche:document.getElementById("filter-niche").value.trim(),status:document.getElementById("filter-status").value,user_id:e};await u.exportExcel(s),r("Excel descargado correctamente","success"),a.disabled=!1,a.innerHTML="📊 Exportar Excel"}catch(a){r("Error al exportar Excel: "+a.message,"error");const e=document.getElementById("export-excel-btn");e&&(e.disabled=!1,e.innerHTML="📊 Exportar Excel")}}function ue(a){const e={nuevo:{class:"info",label:"Nuevo"},contactado:{class:"warning",label:"Contactado"},convertido:{class:"success",label:"Convertido"},descartado:{class:"danger",label:"Descartado"}},s=e[a]||e.nuevo;return`<span class="badge badge-${s.class}">${s.label}</span>`}function h(a){const e=document.createElement("div");return e.textContent=a||"",e.innerHTML}window.__openCreateManualLead=()=>{P("➕ Agregar Lead Manual",`
    <form id="create-manual-lead-form" class="flex flex-col gap-4" style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
      <div class="card" style="padding: 16px; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); margin-bottom: 0;">
        <h4 style="margin-top: 0; color: var(--color-primary); font-size: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">📋 Datos Básicos del Negocio</h4>
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label">🏢 Nombre del Negocio (Obligatorio)</label>
          <input type="text" id="manual-name" class="input" placeholder="Ej: Pizza Hut" required />
        </div>
        <div class="form-group">
          <label class="form-label">🏙️ Ciudad (Obligatorio)</label>
          <input type="text" id="manual-city" class="input" placeholder="Ej: Bogotá" required />
        </div>
        <div class="form-group">
          <label class="form-label">🏢 Nicho / Categoría (Obligatorio)</label>
          <input type="text" id="manual-niche" class="input" placeholder="Ej: Pizzerias" required />
        </div>
        <div class="form-group">
          <label class="form-label">📍 Dirección</label>
          <input type="text" id="manual-address" class="input" placeholder="Ej: Calle 85 # 11-12" />
        </div>
        <div class="form-group">
          <label class="form-label">📞 Teléfono</label>
          <input type="tel" id="manual-phone" class="input" placeholder="Ej: +57 300 123 4567" />
        </div>
        <div class="form-group">
          <label class="form-label">📧 Correo Electrónico</label>
          <input type="email" id="manual-email" class="input" placeholder="Ej: contacto@negocio.com" />
        </div>
        <div class="form-group">
          <label class="form-label">🌐 Sitio Web</label>
          <input type="url" id="manual-website" class="input" placeholder="Ej: https://negocio.com" />
        </div>
      </div>

      <div class="card" style="padding: 16px; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); margin-bottom: 0;">
        <h4 style="margin-top: 0; color: var(--color-secondary); font-size: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">✨ Datos de Enriquecimiento</h4>
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label" style="color: var(--color-primary); font-weight: 600;">📞 Confirmación de Teléfono (Obligatorio)</label>
          <input type="tel" id="manual-phone-confirm" class="input" placeholder="Escribe el número telefónico para confirmar..." required />
        </div>
        <div class="form-group">
          <label class="form-label" style="color: var(--color-primary); font-weight: 600;">🎯 ¿Qué crees que pueda necesitar este negocio? (Obligatorio)</label>
          <textarea id="manual-needs" class="textarea" rows="3" placeholder="Describe las necesidades que detectas..." required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">📸 Instagram URL</label>
          <input type="url" id="manual-instagram" class="input" placeholder="https://instagram.com/..." />
        </div>
        <div class="form-group">
          <label class="form-label">📘 Facebook URL</label>
          <input type="url" id="manual-facebook" class="input" placeholder="https://facebook.com/..." />
        </div>
        <div class="form-group">
          <label class="form-label">🎵 TikTok URL</label>
          <input type="url" id="manual-tiktok" class="input" placeholder="https://tiktok.com/..." />
        </div>
        <div class="form-group">
          <label class="form-label">💼 LinkedIn URL</label>
          <input type="url" id="manual-linkedin" class="input" placeholder="https://linkedin.com/..." />
        </div>
        <div class="form-group">
          <label class="form-label">🔗 Otra red social</label>
          <input type="url" id="manual-other" class="input" placeholder="URL de otra red social" />
        </div>
        <div class="form-group">
          <label class="form-label">🔎 ¿Qué falencias le ves?</label>
          <textarea id="manual-weaknesses" class="textarea" rows="3" placeholder="Describe las falencias que observas..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">📝 Notas adicionales</label>
          <textarea id="manual-notes" class="textarea" rows="2" placeholder="Notas adicionales..."></textarea>
        </div>
      </div>

      <button type="submit" class="btn btn-primary w-full" id="save-manual-btn">
        💾 Guardar Lead Manual
      </button>
    </form>
  `),document.getElementById("create-manual-lead-form").addEventListener("submit",async a=>{a.preventDefault();const e=document.getElementById("save-manual-btn");e.disabled=!0,e.innerHTML='<span class="loading-spinner"></span> Guardando...';const s={business_name:document.getElementById("manual-name").value.trim(),city:document.getElementById("manual-city").value.trim(),niche:document.getElementById("manual-niche").value.trim(),address:document.getElementById("manual-address").value.trim(),phone:document.getElementById("manual-phone").value.trim(),email:document.getElementById("manual-email").value.trim(),website:document.getElementById("manual-website").value.trim(),phone_confirm:document.getElementById("manual-phone-confirm").value.trim(),business_needs:document.getElementById("manual-needs").value.trim(),instagram:document.getElementById("manual-instagram").value.trim(),facebook:document.getElementById("manual-facebook").value.trim(),tiktok:document.getElementById("manual-tiktok").value.trim(),linkedin:document.getElementById("manual-linkedin").value.trim(),other_social:document.getElementById("manual-other").value.trim(),weaknesses:document.getElementById("manual-weaknesses").value.trim(),notes:document.getElementById("manual-notes").value.trim()};try{const n=await u.saveManualLead(s);D(),r("✅ Lead manual creado y enriquecido con éxito","success"),n&&n.lead?(y.unshift(n.lead),S()):await W()}catch(n){r("Error al guardar: "+n.message,"error"),e.disabled=!1,e.innerHTML="💾 Guardar Lead Manual"}})};let T=[],G={},x=[],$=1;const R=10;async function me(a,e){T=[],G={},x=[],$=1,a.innerHTML=`
    <div class="page-header animate-fade-in">
      <h1>⚙️ Panel de Administración</h1>
      <p class="page-subtitle">Gestiona usuarios, estadísticas y todos los leads</p>
    </div>

    <div class="tabs animate-slide-up stagger-1">
      <button class="tab-btn active" data-tab="users" onclick="window.__switchAdminTab('users')">👥 Usuarios</button>
      <button class="tab-btn" data-tab="stats" onclick="window.__switchAdminTab('stats')">📊 Estadísticas</button>
      <button class="tab-btn" data-tab="all-leads" onclick="window.__switchAdminTab('all-leads')">📋 Todos los Leads</button>
    </div>

    <div id="tab-users" class="tab-content active"></div>
    <div id="tab-stats" class="tab-content"></div>
    <div id="tab-all-leads" class="tab-content"></div>
  `,window.__switchAdminTab=s=>{document.querySelectorAll(".tab-btn").forEach(n=>n.classList.toggle("active",n.dataset.tab===s)),document.querySelectorAll(".tab-content").forEach(n=>n.classList.remove("active")),document.getElementById(`tab-${s}`).classList.add("active"),s==="users"?A():s==="stats"?be():s==="all-leads"&&ve()},A()}async function A(){const a=document.getElementById("tab-users");a.innerHTML=`
    <div class="loading-container">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="loading-text">Cargando usuarios...</span>
    </div>
  `;try{const e=await u.getUsers();T=Array.isArray(e)?e:e.users||[],pe(a)}catch(e){r("Error al cargar usuarios: "+e.message,"error"),a.innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h4 class="empty-title">Error al cargar usuarios</h4>
        <p class="empty-description">${e.message}</p>
      </div>
    `}}function pe(a){a.innerHTML=`
    <div class="flex justify-between items-center mb-6">
      <h3>👥 Usuarios del Sistema</h3>
      <button class="btn btn-primary" onclick="window.__openCreateUser()">➕ Crear Usuario</button>
    </div>

    ${T.length===0?`
      <div class="empty-state">
        <span class="empty-icon">👥</span>
        <h4 class="empty-title">No hay usuarios</h4>
        <p class="empty-description">Crea un usuario para comenzar.</p>
      </div>
    `:`
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${T.map((e,s)=>`
              <tr class="animate-fade-in stagger-${Math.min(s+1,10)}">
                <td class="text-muted">${e.id}</td>
                <td class="font-semibold">${f(e.username)}</td>
                <td>${f(e.full_name||"-")}</td>
                <td class="text-muted">${f(e.email||"-")}</td>
                <td>
                  <span class="badge badge-${e.role==="admin"?"info":"success"}">
                    ${e.role==="admin"?"Admin":"Asesor"}
                  </span>
                </td>
                <td>
                  <span class="badge badge-${e.active!==!1?"success":"danger"}">
                    ${e.active!==!1?"Activo":"Inactivo"}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-outline" onclick="window.__editUser(${e.id})" title="Editar">
                      ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.__deleteUser(${e.id})" title="Eliminar">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `}
  `}window.__openCreateUser=()=>{P("➕ Crear Usuario",`
    <form id="create-user-form" class="flex flex-col gap-4">
      <div class="form-group">
        <label class="form-label">👤 Nombre de usuario</label>
        <input type="text" id="new-username" class="input" placeholder="usuario123" required />
      </div>
      <div class="form-group">
        <label class="form-label">📝 Nombre completo</label>
        <input type="text" id="new-fullname" class="input" placeholder="Juan Pérez" required />
      </div>
      <div class="form-group">
        <label class="form-label">📧 Email</label>
        <input type="email" id="new-email" class="input" placeholder="correo@ejemplo.com" required />
      </div>
      <div class="form-group">
        <label class="form-label">🔒 Contraseña</label>
        <input type="password" id="new-password" class="input" placeholder="Mínimo 6 caracteres" required />
      </div>
      <div class="form-group">
        <label class="form-label">👑 Rol</label>
        <select id="new-role" class="select">
          <option value="asesor">Asesor</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary w-full" id="create-user-btn">
        ➕ Crear Usuario
      </button>
    </form>
  `),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();const e=document.getElementById("create-user-btn");e.disabled=!0,e.innerHTML='<span class="loading-spinner"></span> Creando...';try{await u.createUser({username:document.getElementById("new-username").value,full_name:document.getElementById("new-fullname").value,email:document.getElementById("new-email").value,password:document.getElementById("new-password").value,role:document.getElementById("new-role").value}),D(),r("Usuario creado correctamente","success"),A()}catch(s){r("Error al crear usuario: "+s.message,"error"),e.disabled=!1,e.innerHTML="➕ Crear Usuario"}})};window.__editUser=a=>{const e=T.find(s=>s.id===a);e&&(P(`✏️ Editar: ${f(e.full_name||e.username)}`,`
    <form id="edit-user-form" class="flex flex-col gap-4">
      <div class="form-group">
        <label class="form-label">👤 Nombre de usuario</label>
        <input type="text" id="edit-username" class="input" value="${f(e.username)}" required />
      </div>
      <div class="form-group">
        <label class="form-label">📝 Nombre completo</label>
        <input type="text" id="edit-fullname" class="input" value="${f(e.full_name||"")}" required />
      </div>
      <div class="form-group">
        <label class="form-label">📧 Email</label>
        <input type="email" id="edit-email" class="input" value="${f(e.email||"")}" required />
      </div>
      <div class="form-group">
        <label class="form-label">🔒 Nueva contraseña (dejar vacío para mantener)</label>
        <input type="password" id="edit-password" class="input" placeholder="Sin cambios" />
      </div>
      <div class="form-group">
        <label class="form-label">👑 Rol</label>
        <select id="edit-role" class="select">
          <option value="asesor" ${e.role==="asesor"?"selected":""}>Asesor</option>
          <option value="admin" ${e.role==="admin"?"selected":""}>Admin</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary w-full" id="save-user-btn">
        💾 Guardar Cambios
      </button>
    </form>
  `),document.getElementById("edit-user-form").addEventListener("submit",async s=>{s.preventDefault();const n=document.getElementById("save-user-btn");n.disabled=!0,n.innerHTML='<span class="loading-spinner"></span> Guardando...';const t={username:document.getElementById("edit-username").value,full_name:document.getElementById("edit-fullname").value,email:document.getElementById("edit-email").value,role:document.getElementById("edit-role").value},l=document.getElementById("edit-password").value;l&&(t.password=l);try{await u.updateUser(a,t),D(),r("Usuario actualizado correctamente","success"),A()}catch(d){r("Error al actualizar: "+d.message,"error"),n.disabled=!1,n.innerHTML="💾 Guardar Cambios"}}))};window.__deleteUser=async a=>{const e=T.find(s=>s.id===a);if(confirm(`¿Estás seguro de eliminar al usuario "${(e==null?void 0:e.full_name)||(e==null?void 0:e.username)}"?`))try{await u.deleteUser(a),r("Usuario eliminado","success"),A()}catch(s){r("Error al eliminar: "+s.message,"error")}};async function be(){const a=document.getElementById("tab-stats");a.innerHTML=`
    <div class="loading-container">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="loading-text">Cargando estadísticas...</span>
    </div>
  `;try{G=await u.getStats(),ge(a)}catch(e){r("Error al cargar estadísticas: "+e.message,"error"),a.innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <h4 class="empty-title">Error al cargar estadísticas</h4>
        <p class="empty-description">${e.message}</p>
      </div>
    `}}function ge(a){const e=G,s=e.leadsByUser||e.leadsByAsesor||[],n=e.leadsByCity||[],t=e.leadsByNiche||[],l=Math.max(...s.map(i=>i.count||i.total||0),1),d=Math.max(...n.map(i=>i.count||i.total||0),1),b=Math.max(...t.map(i=>i.count||i.total||0),1);a.innerHTML=`
    <div class="stats-grid mb-8">
      <div class="stat-card stat-card-gradient-1 animate-slide-up stagger-1">
        <span class="stat-icon">📊</span>
        <div class="stat-value">${e.totalLeads||0}</div>
        <div class="stat-label">Total Leads</div>
      </div>
      <div class="stat-card stat-card-gradient-2 animate-slide-up stagger-2">
        <span class="stat-icon">🔎</span>
        <div class="stat-value">${e.totalSearches||0}</div>
        <div class="stat-label">Total Búsquedas</div>
      </div>
      <div class="stat-card stat-card-gradient-4 animate-slide-up stagger-3">
        <span class="stat-icon">✨</span>
        <div class="stat-value">${e.enrichmentRate!=null?Math.round(e.enrichmentRate)+"%":"0%"}</div>
        <div class="stat-label">Tasa de Enriquecimiento</div>
      </div>
    </div>

    ${s.length>0?`
      <div class="card mb-6 animate-slide-up stagger-4">
        <h3 class="mb-4">👥 Leads por Asesor</h3>
        <div class="bar-chart">
          ${s.map(i=>{const m=i.count||i.total||0,c=(m/l*100).toFixed(1);return`
              <div class="bar-chart-item">
                <span class="bar-chart-label">${f(i.name||i.username||i.user||"N/A")}</span>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill" style="width: ${c}%">
                    <span class="bar-chart-value">${m}</span>
                  </div>
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    `:""}

    ${n.length>0?`
      <div class="card mb-6 animate-slide-up stagger-5">
        <h3 class="mb-4">🏙️ Leads por Ciudad</h3>
        <div class="bar-chart">
          ${n.map(i=>{const m=i.count||i.total||0,c=(m/d*100).toFixed(1);return`
              <div class="bar-chart-item">
                <span class="bar-chart-label">${f(i.city||i.name||"N/A")}</span>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill" style="width: ${c}%; background: var(--gradient-success);">
                    <span class="bar-chart-value">${m}</span>
                  </div>
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    `:""}

    ${t.length>0?`
      <div class="card animate-slide-up stagger-6">
        <h3 class="mb-4">🏢 Leads por Nicho</h3>
        <div class="bar-chart">
          ${t.map(i=>{const m=i.count||i.total||0,c=(m/b*100).toFixed(1);return`
              <div class="bar-chart-item">
                <span class="bar-chart-label">${f(i.niche||i.name||"N/A")}</span>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill" style="width: ${c}%; background: linear-gradient(135deg, #F59E0B, #EF4444);">
                    <span class="bar-chart-value">${m}</span>
                  </div>
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    `:""}
  `}async function ve(){const a=document.getElementById("tab-all-leads");a.innerHTML=`
    <div class="loading-container">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="loading-text">Cargando todos los leads...</span>
    </div>
  `;try{const e=await u.getLeads({all:!0});x=Array.isArray(e)?e:e.leads||[],F(a)}catch(e){r("Error al cargar leads: "+e.message,"error"),a.innerHTML=`
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h4 class="empty-title">Error al cargar</h4>
        <p class="empty-description">${e.message}</p>
      </div>
    `}}function F(a){const e=Math.ceil(x.length/R),s=($-1)*R,n=x.slice(s,s+R);a.innerHTML=`
    <div class="flex justify-between items-center mb-4">
      <h3>📋 Todos los Leads (${x.length})</h3>
      <div class="export-actions">
        <button class="btn btn-secondary btn-sm" onclick="window.__adminExportCSV()">📥 Exportar CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="window.__adminExportExcel()">📊 Exportar Excel</button>
      </div>
    </div>

    ${x.length===0?`
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h4 class="empty-title">No hay leads</h4>
        <p class="empty-description">Aún no hay leads en el sistema.</p>
      </div>
    `:`
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Ciudad</th>
              <th>Nicho</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Asesor</th>
              <th>Estado</th>
              <th>Enriquecido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${n.map((t,l)=>`
              <tr class="animate-fade-in stagger-${Math.min(l+1,10)}">
                <td class="font-semibold">${f(t.name||t.business_name||"-")}</td>
                <td class="text-muted">${f(t.city||"-")}</td>
                <td class="text-muted">${f(t.niche||"-")}</td>
                <td>
                  ${t.phone?`<a href="tel:${t.phone}" style="color: var(--color-success)">${f(t.phone)}</a>`:'<span class="text-dim">-</span>'}
                </td>
                <td>
                  ${t.email?`<a href="mailto:${t.email}" style="color: var(--color-secondary)">${f(t.email)}</a>`:'<span class="text-dim">-</span>'}
                </td>
                <td class="text-muted text-sm">${f(t.user_full_name||t.user_username||t.asesor||"-")}</td>
                <td>${he(t.status)}</td>
                <td>${t.is_enriched||t.instagram||t.facebook||t.tiktok||t.linkedin||t.business_needs||t.weaknesses?"🟢":"🟡"}</td>
                <td>
                  <button class="btn btn-sm btn-danger" onclick="window.__adminDeleteLead(${t.id})" title="Eliminar y liberar lead">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      ${e>1?`
        <div class="pagination mt-6">
          <button class="page-btn" ${$===1?"disabled":""} onclick="window.__adminGoToPage(${$-1})">← Anterior</button>
          ${Array.from({length:e},(t,l)=>l+1).map(t=>`<button class="page-btn ${t===$?"active":""}" onclick="window.__adminGoToPage(${t})">${t}</button>`).join("")}
          <button class="page-btn" ${$===e?"disabled":""} onclick="window.__adminGoToPage(${$+1})">Siguiente →</button>
        </div>
      `:""}
    `}
  `}window.__adminGoToPage=a=>{$=a,F(document.getElementById("tab-all-leads"))};window.__adminDeleteLead=async a=>{if(confirm("¿Estás seguro de eliminar este lead y liberarlo para que otros asesores lo puedan captar?"))try{await u.deleteLead(a),x=x.filter(e=>e.id!==a),F(document.getElementById("tab-all-leads")),r("Lead eliminado y liberado correctamente","success")}catch(e){r("Error al eliminar el lead: "+e.message,"error")}};window.__adminExportCSV=async()=>{try{await u.exportCSV({all:!0}),r("CSV descargado","success")}catch(a){r("Error: "+a.message,"error")}};window.__adminExportExcel=async()=>{try{await u.exportExcel({all:!0}),r("Excel descargado","success")}catch(a){r("Error: "+a.message,"error")}};function he(a){const e={nuevo:{class:"info",label:"Nuevo"},contactado:{class:"warning",label:"Contactado"},convertido:{class:"success",label:"Convertido"},descartado:{class:"danger",label:"Descartado"}},s=e[a]||e.nuevo;return`<span class="badge badge-${s.class}">${s.label}</span>`}function f(a){const e=document.createElement("div");return e.textContent=a||"",e.innerHTML}function J(a,e){var t,l,d,b;const s=((t=e.user)==null?void 0:t.role)==="admin",n=window.location.hash||"#dashboard";a.innerHTML=`
    <div class="sidebar-brand">
      <span class="brand-icon">🎯</span>
      <span class="brand-text">Lead Prospector</span>
    </div>

    <nav class="sidebar-nav">
      <a href="#dashboard" class="nav-link ${n==="#dashboard"?"active":""}">
        <span class="nav-icon">📊</span>
        <span>Dashboard</span>
      </a>
      <a href="#search" class="nav-link ${n==="#search"?"active":""}">
        <span class="nav-icon">🔍</span>
        <span>Buscar Leads</span>
      </a>
      <a href="#my-leads" class="nav-link ${n==="#my-leads"?"active":""}">
        <span class="nav-icon">📋</span>
        <span>Mis Leads</span>
      </a>
      ${s?`
      <div class="nav-divider"></div>
      <span class="nav-section-title">Administración</span>
      <a href="#admin" class="nav-link ${n==="#admin"?"active":""}">
        <span class="nav-icon">⚙️</span>
        <span>Panel Admin</span>
      </a>`:""}
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">${((d=(l=e.user)==null?void 0:l.full_name)==null?void 0:d.charAt(0))||"U"}</div>
        <div class="user-details">
          <span class="user-name">${((b=e.user)==null?void 0:b.full_name)||"Usuario"}</span>
          <span class="user-role badge badge-${s?"info":"success"}">${s?"Admin":"Asesor"}</span>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="logout()">
        🚪 Cerrar Sesión
      </button>
    </div>
  `}const v={user:null,token:localStorage.getItem("token")};let q=!1;function B(){const a=window.location.hash||"#login",e=document.getElementById("main-content"),s=document.getElementById("sidebar");if(!(!e||!s)){if(!v.user&&v.token&&!q){q=!0,u.setToken(v.token),u.getMe().then(n=>{v.user=n,q=!1,J(s,v),B()}).catch(()=>{localStorage.removeItem("token"),v.token=null,u.setToken(null),q=!1,window.location.hash="#login",B()}),e.innerHTML=`
      <div class="loading-container" style="min-height:100vh;">
        <div class="loading-spinner loading-spinner-lg"></div>
        <span class="loading-text">Cargando sesión...</span>
      </div>
    `;return}if(!v.user){s.classList.add("hidden"),e.style.marginLeft="0",e.style.width="100%",Y(e);return}switch(s.classList.remove("hidden"),e.style.marginLeft="",e.style.width="",J(s,v),a){case"#dashboard":ee(e,v);break;case"#search":se(e,v);break;case"#my-leads":re(e,v);break;case"#admin":v.user.role==="admin"?me(e):window.location.hash="#dashboard";break;default:window.location.hash="#dashboard";break}}}window.addEventListener("hashchange",B);window.addEventListener("load",B);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",B):B();window.logout=()=>{v.user=null,v.token=null,localStorage.removeItem("token"),u.setToken(null),r("Sesión cerrada","info"),window.location.hash="#login"};window.login=(a,e)=>{v.user=a,v.token=e,localStorage.setItem("token",e),u.setToken(e),window.location.hash="#dashboard"};
