/**
 * Sidebar Navigation Component
 */

export function renderSidebar(container, state) {
  const isAdmin = state.user?.role === 'admin';
  const currentHash = window.location.hash || '#dashboard';

  container.innerHTML = `
    <div class="sidebar-brand">
      <span class="brand-icon">🎯</span>
      <span class="brand-text">Lead Prospector</span>
    </div>

    <nav class="sidebar-nav">
      <a href="#dashboard" class="nav-link ${currentHash === '#dashboard' ? 'active' : ''}">
        <span class="nav-icon">📊</span>
        <span>Dashboard</span>
      </a>
      <a href="#search" class="nav-link ${currentHash === '#search' ? 'active' : ''}">
        <span class="nav-icon">🔍</span>
        <span>Buscar Leads</span>
      </a>
      <a href="#my-leads" class="nav-link ${currentHash === '#my-leads' ? 'active' : ''}">
        <span class="nav-icon">📋</span>
        <span>Mis Leads</span>
      </a>
      ${isAdmin ? `
      <div class="nav-divider"></div>
      <span class="nav-section-title">Administración</span>
      <a href="#admin" class="nav-link ${currentHash === '#admin' ? 'active' : ''}">
        <span class="nav-icon">⚙️</span>
        <span>Panel Admin</span>
      </a>` : ''}
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">${state.user?.full_name?.charAt(0) || 'U'}</div>
        <div class="user-details">
          <span class="user-name">${state.user?.full_name || 'Usuario'}</span>
          <span class="user-role badge badge-${isAdmin ? 'info' : 'success'}">${isAdmin ? 'Admin' : 'Asesor'}</span>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="logout()">
        🚪 Cerrar Sesión
      </button>
    </div>
  `;
}
