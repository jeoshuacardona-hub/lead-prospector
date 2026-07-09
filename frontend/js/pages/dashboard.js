/**
 * Dashboard Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderDashboard(container, state) {
  const isAdmin = state.user?.role === 'admin';
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  container.innerHTML = `
    <div class="page-header animate-fade-in">
      <h1>Bienvenido, ${state.user?.full_name?.split(' ')[0] || 'Usuario'} 👋</h1>
      <p class="page-subtitle">${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
    </div>

    <div class="stats-grid" id="stats-grid">
      ${renderStatSkeletons()}
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
  `;

  // Load data
  try {
    let stats = { totalLeads: 0, weekLeads: 0, searches: 0, enriched: 0 };

    if (isAdmin) {
      const adminStats = await api.getStats();
      stats.totalLeads = adminStats.totalLeads || 0;
      stats.searches = adminStats.totalSearches || 0;
      stats.enriched = adminStats.enrichment_rate != null
        ? Math.round(adminStats.enrichment_rate) + '%'
        : (adminStats.enrichmentRate ? Math.round(adminStats.enrichmentRate) + '%' : '0%');
      stats.weekLeads = adminStats.leads_this_week || adminStats.weekLeads || 0;
    } else {
      const leads = await api.getLeads();
      const leadsArray = Array.isArray(leads) ? leads : (leads.leads || []);
      stats.totalLeads = leadsArray.length;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      stats.weekLeads = leadsArray.filter(l => new Date(l.created_at) > oneWeekAgo).length;
      stats.enriched = leadsArray.filter(l => l.enriched || l.is_enriched).length;
      stats.searches = '-';
    }

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card stat-card-gradient-1 animate-slide-up stagger-1">
        <span class="stat-icon">📊</span>
        <div class="stat-value">${stats.totalLeads}</div>
        <div class="stat-label">Leads Totales</div>
      </div>
      <div class="stat-card stat-card-gradient-2 animate-slide-up stagger-2">
        <span class="stat-icon">📅</span>
        <div class="stat-value">${stats.weekLeads}</div>
        <div class="stat-label">Leads Esta Semana</div>
      </div>
      <div class="stat-card stat-card-gradient-3 animate-slide-up stagger-3">
        <span class="stat-icon">🔎</span>
        <div class="stat-value">${stats.searches}</div>
        <div class="stat-label">Búsquedas Realizadas</div>
      </div>
      <div class="stat-card stat-card-gradient-4 animate-slide-up stagger-4">
        <span class="stat-icon">✨</span>
        <div class="stat-value">${stats.enriched}</div>
        <div class="stat-label">${isAdmin ? 'Tasa Enriquecimiento' : 'Leads Enriquecidos'}</div>
      </div>
    `;

    // Load recent leads
    const leadsData = await api.getLeads({ limit: 5, all: isAdmin });
    const recentLeads = Array.isArray(leadsData) ? leadsData : (leadsData.leads || []);

    if (recentLeads.length === 0) {
      document.getElementById('recent-leads-table').innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <h4 class="empty-title">Sin leads aún</h4>
          <p class="empty-description">Comienza a buscar leads para verlos aquí.</p>
        </div>
      `;
    } else {
      document.getElementById('recent-leads-table').innerHTML = `
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
            ${recentLeads.slice(0, 5).map((lead, i) => `
              <tr class="animate-fade-in stagger-${i + 1}">
                <td class="font-semibold">${escapeHtml(lead.name || lead.business_name || '-')}</td>
                <td class="text-muted">${escapeHtml(lead.city || '-')}</td>
                <td class="text-muted">${escapeHtml(lead.niche || '-')}</td>
                <td>${lead.phone ? `<a href="tel:${lead.phone}">${escapeHtml(lead.phone)}</a>` : '<span class="text-dim">-</span>'}</td>
                <td>${lead.email ? `<a href="mailto:${lead.email}">${escapeHtml(lead.email)}</a>` : '<span class="text-dim">-</span>'}</td>
                <td>${getStatusBadge(lead.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    showToast('Error al cargar el dashboard: ' + err.message, 'error');
    document.getElementById('stats-grid').innerHTML = `
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
    `;
  }
}

function renderStatSkeletons() {
  return [1, 2, 3, 4].map(i => `
    <div class="stat-card stat-card-gradient-${i} animate-slide-up stagger-${i}">
      <span class="stat-icon" style="opacity:0.3">⏳</span>
      <div class="stat-value" style="opacity:0.3">...</div>
      <div class="stat-label" style="opacity:0.3">Cargando</div>
    </div>
  `).join('');
}

function getStatusBadge(status) {
  const map = {
    nuevo: { class: 'info', label: 'Nuevo' },
    contactado: { class: 'warning', label: 'Contactado' },
    convertido: { class: 'success', label: 'Convertido' },
    descartado: { class: 'danger', label: 'Descartado' },
  };
  const s = map[status] || map.nuevo;
  return `<span class="badge badge-${s.class}">${s.label}</span>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
