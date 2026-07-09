/**
 * My Leads Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

const PAGE_SIZE = 10;
let currentPage = 1;
let allLeads = [];
let filteredLeads = [];
let localState = null;
let selectedAdvisorUsername = null;

export async function renderMyLeads(container, state) {
  currentPage = 1;
  allLeads = [];
  filteredLeads = [];
  selectedAdvisorUsername = null;
  localState = state;

  container.innerHTML = `
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
        ${state.user.role === 'admin' ? `
          <button class="btn btn-secondary btn-sm" id="export-csv-btn">📥 Exportar CSV</button>
          <button class="btn btn-secondary btn-sm" id="export-excel-btn">📊 Exportar Excel</button>
        ` : ''}
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
  `;

  // Event listeners
  document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
  const csvBtn = document.getElementById('export-csv-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', handleExportCSV);
  }
  const excelBtn = document.getElementById('export-excel-btn');
  if (excelBtn) {
    excelBtn.addEventListener('click', handleExportExcel);
  }

  // Load leads
  await loadLeads();
}

async function loadLeads() {
  try {
    const isAdmin = localState && localState.user && localState.user.role === 'admin';
    const data = await api.getLeads({ all: isAdmin });
    allLeads = Array.isArray(data) ? data : (data.leads || []);
    applyFilters();
  } catch (err) {
    showToast('Error al cargar leads: ' + err.message, 'error');
    document.getElementById('leads-table-container').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h4 class="empty-title">Error al cargar</h4>
        <p class="empty-description">${err.message}</p>
      </div>
    `;
  }
}

function applyFilters() {
  const city = document.getElementById('filter-city').value.toLowerCase().trim();
  const niche = document.getElementById('filter-niche').value.toLowerCase().trim();
  const status = document.getElementById('filter-status').value;
  const enriched = document.getElementById('filter-enriched').value;

  filteredLeads = allLeads.filter(lead => {
    if (city && !(lead.city || '').toLowerCase().includes(city)) return false;
    if (niche && !(lead.niche || '').toLowerCase().includes(niche)) return false;
    if (status && lead.status !== status) return false;
    
    const isEnriched = lead.is_enriched || lead.instagram || lead.facebook || lead.tiktok || lead.linkedin || lead.business_needs || lead.weaknesses;
    if (enriched === 'true' && !isEnriched) return false;
    if (enriched === 'false' && isEnriched) return false;
    
    if (selectedAdvisorUsername && (lead.user_username || '').toLowerCase() !== selectedAdvisorUsername) return false;
    return true;
  });

  currentPage = 1;
  renderLeadsTable();
}

function renderLeadsTable() {
  const container = document.getElementById('leads-table-container');
  const paginationEl = document.getElementById('leads-pagination');
  const countEl = document.getElementById('leads-count');
  const summaryPlaceholder = document.getElementById('admin-summary-placeholder');

  const isAdmin = localState && localState.user && localState.user.role === 'admin';

  // Calculate and render summary stats for admin
  if (isAdmin && summaryPlaceholder) {
    const advisorCounts = {};
    const defaultAdvisors = ['beatriz', 'mateo', 'angelica', 'yaily', 'melanie', 'hasbleidy', 'daniel'];
    defaultAdvisors.forEach(username => {
      advisorCounts[username] = { name: username.charAt(0).toUpperCase() + username.slice(1), count: 0 };
    });

    allLeads.forEach(lead => {
      const username = (lead.user_username || '').toLowerCase();
      const name = lead.user_full_name || lead.user_username || 'Admin/Otro';
      if (username) {
        if (!advisorCounts[username]) {
          advisorCounts[username] = { name: name, count: 0 };
        }
        advisorCounts[username].count++;
      }
    });

    summaryPlaceholder.innerHTML = `
      <div class="card mb-6 animate-slide-up" style="padding: var(--space-4); background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2);">
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 style="margin: 0;">📊 Resumen de Productividad (Líderes)</h3>
          ${selectedAdvisorUsername ? `
            <button class="btn btn-danger btn-sm" onclick="window.__adminDeleteAllForAdvisor('${selectedAdvisorUsername}')">
              🗑️ Eliminar todos los leads de ${selectedAdvisorUsername.charAt(0).toUpperCase() + selectedAdvisorUsername.slice(1)}
            </button>
          ` : ''}
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-4 items-center">
            <button class="badge ${!selectedAdvisorUsername ? 'badge-info' : 'btn-outline'}" 
                    style="font-size: 0.95rem; padding: 8px 16px; cursor: pointer; border: none; border-radius: 8px;"
                    onclick="window.__selectAdvisorFilter(null)">
              Total leads en el sistema: <strong>${allLeads.length}</strong>
            </button>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(advisorCounts).map(([username, adv]) => {
                const isSelected = selectedAdvisorUsername === username;
                const borderStyle = isSelected ? 'border: 2px solid var(--color-primary); background: rgba(139,92,246,0.15);' : 'border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);';
                return `
                  <div class="chip" 
                       style="${borderStyle} padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;"
                       onclick="window.__selectAdvisorFilter('${username}')"
                       title="Filtrar por ${adv.name}">
                    👤 <strong>${adv.name}</strong>: <span style="color: var(--color-success); font-weight: bold;">${adv.count}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ${selectedAdvisorUsername ? `
            <div style="font-size: 0.85rem; color: var(--color-secondary);">
              ℹ️ Mostrando únicamente leads de <strong>${selectedAdvisorUsername.charAt(0).toUpperCase() + selectedAdvisorUsername.slice(1)}</strong>. Haz click en el botón de "Total leads" o en otro asesor para cambiar de filtro.
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } else if (summaryPlaceholder) {
    summaryPlaceholder.innerHTML = '';
  }

  countEl.textContent = `${filteredLeads.length} leads encontrados`;

  if (filteredLeads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h4 class="empty-title">No hay leads</h4>
        <p class="empty-description">No se encontraron leads con los filtros seleccionados.</p>
      </div>
    `;
    paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageLeads = filteredLeads.slice(start, start + PAGE_SIZE);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Negocio</th>
          <th>Ciudad</th>
          <th>Nicho</th>
          <th>Teléfono</th>
          <th>Email</th>
          ${isAdmin ? '<th>Asesor</th>' : ''}
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
            ${isAdmin ? `<td class="text-muted text-sm" style="font-weight: 500; color: var(--color-secondary);">${escapeHtml(lead.user_full_name || lead.user_username || '-')}</td>` : ''}
            <td>${getStatusBadge(lead.status)}</td>
            <td>${(lead.is_enriched || lead.instagram || lead.facebook || lead.tiktok || lead.linkedin || lead.business_needs || lead.weaknesses) ? '🟢' : '🟡'}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-outline" onclick="window.__enrichLead(${lead.id})" title="Enriquecer">
                  ✨
                </button>
                <select class="select" style="width:120px; padding: 4px 8px; font-size: 0.75rem;" onchange="window.__updateStatus(${lead.id}, this.value)">
                  <option value="nuevo" ${lead.status === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                  <option value="contactado" ${lead.status === 'contactado' ? 'selected' : ''}>Contactado</option>
                  <option value="convertido" ${lead.status === 'convertido' ? 'selected' : ''}>Convertido</option>
                  <option value="descartado" ${lead.status === 'descartado' ? 'selected' : ''}>Descartado</option>
                </select>
                <button class="btn btn-sm btn-danger" onclick="window.__deleteLead(${lead.id})" title="Eliminar">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Pagination
  if (totalPages > 1) {
    paginationEl.innerHTML = `
      <div class="pagination">
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.__goToPage(${currentPage - 1})">← Anterior</button>
        ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p =>
          `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="window.__goToPage(${p})">${p}</button>`
        ).join('')}
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.__goToPage(${currentPage + 1})">Siguiente →</button>
      </div>
    `;
  } else {
    paginationEl.innerHTML = '';
  }
}

// Global actions
window.__goToPage = (page) => {
  currentPage = page;
  renderLeadsTable();
  document.getElementById('leads-table-container').scrollIntoView({ behavior: 'smooth' });
};

window.__selectAdvisorFilter = (username) => {
  if (selectedAdvisorUsername === username) {
    selectedAdvisorUsername = null;
  } else {
    selectedAdvisorUsername = username;
  }
  applyFilters();
};

window.__adminDeleteAllForAdvisor = async (username) => {
  const name = username.charAt(0).toUpperCase() + username.slice(1);
  if (!confirm(`¿Estás seguro de eliminar TODOS los leads de ${name}? Esta acción los borrará y liberará a todos para que otros asesores los puedan coger.`)) return;

  const leadsToDelete = allLeads.filter(l => (l.user_username || '').toLowerCase() === username);
  if (leadsToDelete.length === 0) return;

  const btn = document.querySelector('.btn-danger');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Eliminando...';
  }

  let successCount = 0;
  for (const lead of leadsToDelete) {
    try {
      await api.deleteLead(lead.id);
      allLeads = allLeads.filter(l => l.id !== lead.id);
      successCount++;
    } catch (err) {
      console.error(`Error deleting lead ${lead.id}:`, err);
    }
  }

  selectedAdvisorUsername = null;
  applyFilters();
  showToast(`Se eliminaron y liberaron ${successCount} leads de ${name}`, 'success');
};

window.__updateStatus = async (id, status) => {
  try {
    await api.updateLeadStatus(id, status);
    const lead = allLeads.find(l => l.id === id);
    if (lead) lead.status = status;
    showToast('Estado actualizado', 'success');
  } catch (err) {
    showToast('Error al actualizar estado: ' + err.message, 'error');
  }
};

window.__deleteLead = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este lead?')) return;
  try {
    await api.deleteLead(id);
    allLeads = allLeads.filter(l => l.id !== id);
    applyFilters();
    showToast('Lead eliminado', 'success');
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
};

window.__enrichLead = (id) => {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;

  const enrichData = {
    instagram: lead.instagram || '',
    facebook: lead.facebook || '',
    tiktok: lead.tiktok || '',
    linkedin: lead.linkedin || '',
    other_social: lead.other_social || '',
    phone_confirm: lead.phone_confirm || lead.phone || '',
    business_needs: lead.business_needs || '',
    weaknesses: lead.weaknesses || '',
    notes: lead.notes || ''
  };

  openModal(`✨ Enriquecer: ${escapeHtml(lead.name || lead.business_name || 'Lead')}`, `
    <div class="flex flex-col gap-4">
      <div class="card" style="padding: var(--space-4);">
        <p class="text-sm text-muted mb-2">Datos actuales:</p>
        <p class="text-sm">📞 ${lead.phone || '<span class="text-dim">Sin teléfono</span>'}</p>
        <p class="text-sm">📧 ${lead.email || '<span class="text-dim">Sin email</span>'}</p>
        <p class="text-sm">🌐 ${lead.website || '<span class="text-dim">Sin website</span>'}</p>
      </div>

      <div class="form-group">
        <label class="form-label">📸 Instagram URL</label>
        <input type="url" id="enrich-instagram" class="input" value="${escapeHtml(enrichData.instagram || '')}" placeholder="https://instagram.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">📘 Facebook URL</label>
        <input type="url" id="enrich-facebook" class="input" value="${escapeHtml(enrichData.facebook || '')}" placeholder="https://facebook.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">🎵 TikTok URL</label>
        <input type="url" id="enrich-tiktok" class="input" value="${escapeHtml(enrichData.tiktok || '')}" placeholder="https://tiktok.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">💼 LinkedIn URL</label>
        <input type="url" id="enrich-linkedin" class="input" value="${escapeHtml(enrichData.linkedin || '')}" placeholder="https://linkedin.com/..." />
      </div>
      <div class="form-group">
        <label class="form-label">🔗 Otra red social</label>
        <input type="url" id="enrich-other" class="input" value="${escapeHtml(enrichData.other_social || '')}" placeholder="URL de otra red social" />
      </div>
      <div class="form-group">
        <label class="form-label" style="color: var(--color-primary); font-weight: 600;">📞 Confirmación de Teléfono (Obligatorio)</label>
        <input type="tel" id="enrich-phone-confirm" class="input" value="${escapeHtml(enrichData.phone_confirm || '')}" placeholder="Escribe el número telefónico para confirmar..." required />
      </div>
      <div class="form-group">
        <label class="form-label" style="color: var(--color-primary); font-weight: 600;">🎯 ¿Qué crees que pueda necesitar este negocio? (Obligatorio)</label>
        <textarea id="enrich-needs" class="textarea" rows="3" placeholder="Describe las necesidades que detectas..." required>${escapeHtml(enrichData.business_needs || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">🔎 ¿Qué falencias le ves?</label>
        <textarea id="enrich-weaknesses" class="textarea" rows="3" placeholder="Describe las falencias que observas...">${escapeHtml(enrichData.weaknesses || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">📝 Notas adicionales</label>
        <textarea id="enrich-notes" class="textarea" rows="2" placeholder="Notas adicionales...">${escapeHtml(enrichData.notes || '')}</textarea>
      </div>

      <button class="btn btn-primary w-full" id="save-enrich-btn" onclick="window.__saveEnrichment(${id})">
        💾 Guardar Enriquecimiento
      </button>
    </div>
  `);
};

window.__saveEnrichment = async (id) => {
  const btn = document.getElementById('save-enrich-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

  const phoneConfirm = document.getElementById('enrich-phone-confirm').value.trim();
  const businessNeeds = document.getElementById('enrich-needs').value.trim();

  // Enforce mandatory fields
  if (!phoneConfirm) {
    showToast('⚠️ La confirmación de teléfono es obligatoria', 'warning');
    document.getElementById('enrich-phone-confirm').focus();
    btn.disabled = false;
    btn.innerHTML = '💾 Guardar Enriquecimiento';
    return;
  }

  if (!businessNeeds) {
    showToast('⚠️ El campo de necesidades es obligatorio', 'warning');
    document.getElementById('enrich-needs').focus();
    btn.disabled = false;
    btn.innerHTML = '💾 Guardar Enriquecimiento';
    return;
  }

  const data = {
    instagram: document.getElementById('enrich-instagram').value.trim(),
    facebook: document.getElementById('enrich-facebook').value.trim(),
    tiktok: document.getElementById('enrich-tiktok').value.trim(),
    linkedin: document.getElementById('enrich-linkedin').value.trim(),
    other_social: document.getElementById('enrich-other').value.trim(),
    phone_confirm: phoneConfirm,
    business_needs: businessNeeds,
    weaknesses: document.getElementById('enrich-weaknesses').value.trim(),
    notes: document.getElementById('enrich-notes').value.trim(),
  };

  try {
    await api.enrichLead(id, data);
    const lead = allLeads.find(l => l.id === id);
    if (lead) {
      lead.is_enriched = 1;
      lead.instagram = data.instagram;
      lead.facebook = data.facebook;
      lead.tiktok = data.tiktok;
      lead.linkedin = data.linkedin;
      lead.other_social = data.other_social;
      lead.phone_confirm = data.phone_confirm;
      lead.business_needs = data.business_needs;
      lead.weaknesses = data.weaknesses;
      lead.notes = data.notes;
    }
    closeModal();
    renderLeadsTable();
    showToast('Lead enriquecido correctamente', 'success');
  } catch (err) {
    showToast('Error al enriquecer: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '💾 Guardar Enriquecimiento';
  }
};

async function handleExportCSV() {
  try {
    const btn = document.getElementById('export-csv-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Exportando...';
    
    let userIdParam = undefined;
    if (selectedAdvisorUsername) {
      const matchingLead = allLeads.find(l => (l.user_username || '').toLowerCase() === selectedAdvisorUsername);
      if (matchingLead) {
        userIdParam = matchingLead.user_id;
      }
    }

    const params = {
      city: document.getElementById('filter-city').value.trim(),
      niche: document.getElementById('filter-niche').value.trim(),
      status: document.getElementById('filter-status').value,
      user_id: userIdParam
    };
    
    await api.exportCSV(params);
    showToast('CSV descargado correctamente', 'success');
    btn.disabled = false;
    btn.innerHTML = '📥 Exportar CSV';
  } catch (err) {
    showToast('Error al exportar CSV: ' + err.message, 'error');
    const btn = document.getElementById('export-csv-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '📥 Exportar CSV';
    }
  }
}

async function handleExportExcel() {
  try {
    const btn = document.getElementById('export-excel-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Exportando...';
    
    let userIdParam = undefined;
    if (selectedAdvisorUsername) {
      const matchingLead = allLeads.find(l => (l.user_username || '').toLowerCase() === selectedAdvisorUsername);
      if (matchingLead) {
        userIdParam = matchingLead.user_id;
      }
    }

    const params = {
      city: document.getElementById('filter-city').value.trim(),
      niche: document.getElementById('filter-niche').value.trim(),
      status: document.getElementById('filter-status').value,
      user_id: userIdParam
    };
    
    await api.exportExcel(params);
    showToast('Excel descargado correctamente', 'success');
    btn.disabled = false;
    btn.innerHTML = '📊 Exportar Excel';
  } catch (err) {
    showToast('Error al exportar Excel: ' + err.message, 'error');
    const btn = document.getElementById('export-excel-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '📊 Exportar Excel';
    }
  }
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
  div.textContent = str || '';
  return div.innerHTML;
}

window.__openCreateManualLead = () => {
  openModal('➕ Agregar Lead Manual', `
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
  `);

  document.getElementById('create-manual-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-manual-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

    const payload = {
      business_name: document.getElementById('manual-name').value.trim(),
      city: document.getElementById('manual-city').value.trim(),
      niche: document.getElementById('manual-niche').value.trim(),
      address: document.getElementById('manual-address').value.trim(),
      phone: document.getElementById('manual-phone').value.trim(),
      email: document.getElementById('manual-email').value.trim(),
      website: document.getElementById('manual-website').value.trim(),
      phone_confirm: document.getElementById('manual-phone-confirm').value.trim(),
      business_needs: document.getElementById('manual-needs').value.trim(),
      instagram: document.getElementById('manual-instagram').value.trim(),
      facebook: document.getElementById('manual-facebook').value.trim(),
      tiktok: document.getElementById('manual-tiktok').value.trim(),
      linkedin: document.getElementById('manual-linkedin').value.trim(),
      other_social: document.getElementById('manual-other').value.trim(),
      weaknesses: document.getElementById('manual-weaknesses').value.trim(),
      notes: document.getElementById('manual-notes').value.trim()
    };

    try {
      const response = await api.saveManualLead(payload);
      closeModal();
      showToast('✅ Lead manual creado y enriquecido con éxito', 'success');
      
      if (response && response.lead) {
        allLeads.unshift(response.lead);
        applyFilters();
      } else {
        await loadLeads();
      }
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar Lead Manual';
    }
  });
};
