/**
 * Admin Page - Admin-only panel
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

let adminUsers = [];
let adminStats = {};
let adminLeads = [];
let adminCurrentPage = 1;
const ADMIN_PAGE_SIZE = 10;

export async function renderAdmin(container, state) {
  adminUsers = [];
  adminStats = {};
  adminLeads = [];
  adminCurrentPage = 1;

  container.innerHTML = `
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
  `;

  window.__switchAdminTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'users') loadUsers();
    else if (tab === 'stats') loadStats();
    else if (tab === 'all-leads') loadAllLeads();
  };

  loadUsers();
}

// ==================== USERS TAB ====================
async function loadUsers() {
  const container = document.getElementById('tab-users');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="loading-text">Cargando usuarios...</span>
    </div>
  `;

  try {
    const data = await api.getUsers();
    adminUsers = Array.isArray(data) ? data : (data.users || []);
    renderUsersTab(container);
  } catch (err) {
    showToast('Error al cargar usuarios: ' + err.message, 'error');
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h4 class="empty-title">Error al cargar usuarios</h4>
        <p class="empty-description">${err.message}</p>
      </div>
    `;
  }
}

function renderUsersTab(container) {
  container.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h3>👥 Usuarios del Sistema</h3>
      <button class="btn btn-primary" onclick="window.__openCreateUser()">➕ Crear Usuario</button>
    </div>

    ${adminUsers.length === 0 ? `
      <div class="empty-state">
        <span class="empty-icon">👥</span>
        <h4 class="empty-title">No hay usuarios</h4>
        <p class="empty-description">Crea un usuario para comenzar.</p>
      </div>
    ` : `
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
            ${adminUsers.map((user, i) => `
              <tr class="animate-fade-in stagger-${Math.min(i + 1, 10)}">
                <td class="text-muted">${user.id}</td>
                <td class="font-semibold">${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.full_name || '-')}</td>
                <td class="text-muted">${escapeHtml(user.email || '-')}</td>
                <td>
                  <span class="badge badge-${user.role === 'admin' ? 'info' : 'success'}">
                    ${user.role === 'admin' ? 'Admin' : 'Asesor'}
                  </span>
                </td>
                <td>
                  <span class="badge badge-${user.active !== false ? 'success' : 'danger'}">
                    ${user.active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-outline" onclick="window.__editUser(${user.id})" title="Editar">
                      ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.__deleteUser(${user.id})" title="Eliminar">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

window.__openCreateUser = () => {
  openModal('➕ Crear Usuario', `
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
  `);

  document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('create-user-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Creando...';

    try {
      await api.createUser({
        username: document.getElementById('new-username').value,
        full_name: document.getElementById('new-fullname').value,
        email: document.getElementById('new-email').value,
        password: document.getElementById('new-password').value,
        role: document.getElementById('new-role').value,
      });
      closeModal();
      showToast('Usuario creado correctamente', 'success');
      loadUsers();
    } catch (err) {
      showToast('Error al crear usuario: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '➕ Crear Usuario';
    }
  });
};

window.__editUser = (id) => {
  const user = adminUsers.find(u => u.id === id);
  if (!user) return;

  openModal(`✏️ Editar: ${escapeHtml(user.full_name || user.username)}`, `
    <form id="edit-user-form" class="flex flex-col gap-4">
      <div class="form-group">
        <label class="form-label">👤 Nombre de usuario</label>
        <input type="text" id="edit-username" class="input" value="${escapeHtml(user.username)}" required />
      </div>
      <div class="form-group">
        <label class="form-label">📝 Nombre completo</label>
        <input type="text" id="edit-fullname" class="input" value="${escapeHtml(user.full_name || '')}" required />
      </div>
      <div class="form-group">
        <label class="form-label">📧 Email</label>
        <input type="email" id="edit-email" class="input" value="${escapeHtml(user.email || '')}" required />
      </div>
      <div class="form-group">
        <label class="form-label">🔒 Nueva contraseña (dejar vacío para mantener)</label>
        <input type="password" id="edit-password" class="input" placeholder="Sin cambios" />
      </div>
      <div class="form-group">
        <label class="form-label">👑 Rol</label>
        <select id="edit-role" class="select">
          <option value="asesor" ${user.role === 'asesor' ? 'selected' : ''}>Asesor</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary w-full" id="save-user-btn">
        💾 Guardar Cambios
      </button>
    </form>
  `);

  document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-user-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

    const data = {
      username: document.getElementById('edit-username').value,
      full_name: document.getElementById('edit-fullname').value,
      email: document.getElementById('edit-email').value,
      role: document.getElementById('edit-role').value,
    };

    const password = document.getElementById('edit-password').value;
    if (password) data.password = password;

    try {
      await api.updateUser(id, data);
      closeModal();
      showToast('Usuario actualizado correctamente', 'success');
      loadUsers();
    } catch (err) {
      showToast('Error al actualizar: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar Cambios';
    }
  });
};

window.__deleteUser = async (id) => {
  const user = adminUsers.find(u => u.id === id);
  if (!confirm(`¿Estás seguro de eliminar al usuario "${user?.full_name || user?.username}"?`)) return;

  try {
    await api.deleteUser(id);
    showToast('Usuario eliminado', 'success');
    loadUsers();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
};

// ==================== STATS TAB ====================
async function loadStats() {
  const container = document.getElementById('tab-stats');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="loading-text">Cargando estadísticas...</span>
    </div>
  `;

  try {
    adminStats = await api.getStats();
    renderStatsTab(container);
  } catch (err) {
    showToast('Error al cargar estadísticas: ' + err.message, 'error');
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <h4 class="empty-title">Error al cargar estadísticas</h4>
        <p class="empty-description">${err.message}</p>
      </div>
    `;
  }
}

function renderStatsTab(container) {
  const stats = adminStats;
  const leadsByAsesor = stats.leadsByUser || stats.leadsByAsesor || [];
  const leadsByCity = stats.leadsByCity || [];
  const leadsByNiche = stats.leadsByNiche || [];

  const maxAsesor = Math.max(...leadsByAsesor.map(a => a.count || a.total || 0), 1);
  const maxCity = Math.max(...leadsByCity.map(c => c.count || c.total || 0), 1);
  const maxNiche = Math.max(...leadsByNiche.map(n => n.count || n.total || 0), 1);

  container.innerHTML = `
    <div class="stats-grid mb-8">
      <div class="stat-card stat-card-gradient-1 animate-slide-up stagger-1">
        <span class="stat-icon">📊</span>
        <div class="stat-value">${stats.totalLeads || 0}</div>
        <div class="stat-label">Total Leads</div>
      </div>
      <div class="stat-card stat-card-gradient-2 animate-slide-up stagger-2">
        <span class="stat-icon">🔎</span>
        <div class="stat-value">${stats.totalSearches || 0}</div>
        <div class="stat-label">Total Búsquedas</div>
      </div>
      <div class="stat-card stat-card-gradient-4 animate-slide-up stagger-3">
        <span class="stat-icon">✨</span>
        <div class="stat-value">${stats.enrichmentRate != null ? Math.round(stats.enrichmentRate) + '%' : '0%'}</div>
        <div class="stat-label">Tasa de Enriquecimiento</div>
      </div>
    </div>

    ${leadsByAsesor.length > 0 ? `
      <div class="card mb-6 animate-slide-up stagger-4">
        <h3 class="mb-4">👥 Leads por Asesor</h3>
        <div class="bar-chart">
          ${leadsByAsesor.map(item => {
            const value = item.count || item.total || 0;
            const pct = (value / maxAsesor * 100).toFixed(1);
            return `
              <div class="bar-chart-item">
                <span class="bar-chart-label">${escapeHtml(item.name || item.username || item.user || 'N/A')}</span>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill" style="width: ${pct}%">
                    <span class="bar-chart-value">${value}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    ${leadsByCity.length > 0 ? `
      <div class="card mb-6 animate-slide-up stagger-5">
        <h3 class="mb-4">🏙️ Leads por Ciudad</h3>
        <div class="bar-chart">
          ${leadsByCity.map(item => {
            const value = item.count || item.total || 0;
            const pct = (value / maxCity * 100).toFixed(1);
            return `
              <div class="bar-chart-item">
                <span class="bar-chart-label">${escapeHtml(item.city || item.name || 'N/A')}</span>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill" style="width: ${pct}%; background: var(--gradient-success);">
                    <span class="bar-chart-value">${value}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    ${leadsByNiche.length > 0 ? `
      <div class="card animate-slide-up stagger-6">
        <h3 class="mb-4">🏢 Leads por Nicho</h3>
        <div class="bar-chart">
          ${leadsByNiche.map(item => {
            const value = item.count || item.total || 0;
            const pct = (value / maxNiche * 100).toFixed(1);
            return `
              <div class="bar-chart-item">
                <span class="bar-chart-label">${escapeHtml(item.niche || item.name || 'N/A')}</span>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill" style="width: ${pct}%; background: linear-gradient(135deg, #F59E0B, #EF4444);">
                    <span class="bar-chart-value">${value}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// ==================== ALL LEADS TAB ====================
async function loadAllLeads() {
  const container = document.getElementById('tab-all-leads');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner loading-spinner-lg"></div>
      <span class="loading-text">Cargando todos los leads...</span>
    </div>
  `;

  try {
    const data = await api.getLeads({ all: true });
    adminLeads = Array.isArray(data) ? data : (data.leads || []);
    renderAllLeadsTab(container);
  } catch (err) {
    showToast('Error al cargar leads: ' + err.message, 'error');
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h4 class="empty-title">Error al cargar</h4>
        <p class="empty-description">${err.message}</p>
      </div>
    `;
  }
}

function renderAllLeadsTab(container) {
  const totalPages = Math.ceil(adminLeads.length / ADMIN_PAGE_SIZE);
  const start = (adminCurrentPage - 1) * ADMIN_PAGE_SIZE;
  const pageLeads = adminLeads.slice(start, start + ADMIN_PAGE_SIZE);

  container.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3>📋 Todos los Leads (${adminLeads.length})</h3>
      <div class="export-actions">
        <button class="btn btn-secondary btn-sm" onclick="window.__adminExportCSV()">📥 Exportar CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="window.__adminExportExcel()">📊 Exportar Excel</button>
      </div>
    </div>

    ${adminLeads.length === 0 ? `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h4 class="empty-title">No hay leads</h4>
        <p class="empty-description">Aún no hay leads en el sistema.</p>
      </div>
    ` : `
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
            ${pageLeads.map((lead, i) => `
              <tr class="animate-fade-in stagger-${Math.min(i + 1, 10)}">
                <td class="font-semibold">${escapeHtml(lead.name || lead.business_name || '-')}</td>
                <td class="text-muted">${escapeHtml(lead.city || '-')}</td>
                <td class="text-muted">${escapeHtml(lead.niche || '-')}</td>
                <td>
                  ${lead.phone
                    ? `<a href="tel:${lead.phone}" style="color: var(--color-success)">${escapeHtml(lead.phone)}</a>`
                    : '<span class="text-dim">-</span>'
                  }
                </td>
                <td>
                  ${lead.email
                    ? `<a href="mailto:${lead.email}" style="color: var(--color-secondary)">${escapeHtml(lead.email)}</a>`
                    : '<span class="text-dim">-</span>'
                  }
                </td>
                <td class="text-muted text-sm">${escapeHtml(lead.user_full_name || lead.user_username || lead.asesor || '-')}</td>
                <td>${getStatusBadge(lead.status)}</td>
                <td>${(lead.is_enriched || lead.instagram || lead.facebook || lead.tiktok || lead.linkedin || lead.business_needs || lead.weaknesses) ? '🟢' : '🟡'}</td>
                <td>
                  <button class="btn btn-sm btn-danger" onclick="window.__adminDeleteLead(${lead.id})" title="Eliminar y liberar lead">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${totalPages > 1 ? `
        <div class="pagination mt-6">
          <button class="page-btn" ${adminCurrentPage === 1 ? 'disabled' : ''} onclick="window.__adminGoToPage(${adminCurrentPage - 1})">← Anterior</button>
          ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p =>
            `<button class="page-btn ${p === adminCurrentPage ? 'active' : ''}" onclick="window.__adminGoToPage(${p})">${p}</button>`
          ).join('')}
          <button class="page-btn" ${adminCurrentPage === totalPages ? 'disabled' : ''} onclick="window.__adminGoToPage(${adminCurrentPage + 1})">Siguiente →</button>
        </div>
      ` : ''}
    `}
  `;
}

window.__adminGoToPage = (page) => {
  adminCurrentPage = page;
  renderAllLeadsTab(document.getElementById('tab-all-leads'));
};

window.__adminDeleteLead = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este lead y liberarlo para que otros asesores lo puedan captar?')) return;
  try {
    await api.deleteLead(id);
    adminLeads = adminLeads.filter(l => l.id !== id);
    renderAllLeadsTab(document.getElementById('tab-all-leads'));
    showToast('Lead eliminado y liberado correctamente', 'success');
  } catch (err) {
    showToast('Error al eliminar el lead: ' + err.message, 'error');
  }
};

window.__adminExportCSV = async () => {
  try {
    await api.exportCSV({ all: true });
    showToast('CSV descargado', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.__adminExportExcel = async () => {
  try {
    await api.exportExcel({ all: true });
    showToast('Excel descargado', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

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
  div.textContent = str || '';
  return div.innerHTML;
}
