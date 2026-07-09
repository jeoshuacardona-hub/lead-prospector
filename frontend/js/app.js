/**
 * Lead Prospector - Main Application
 * SPA with hash-based routing
 */
import { api } from './api.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSearch } from './pages/search.js';
import { renderMyLeads } from './pages/my-leads.js';
import { renderAdmin } from './pages/admin.js';
import { renderSidebar } from './components/navbar.js';
import { showToast } from './components/toast.js';

// Application State
const state = {
  user: null,
  token: localStorage.getItem('token'),
};

let isRestoring = false;

// Router
function router() {
  const hash = window.location.hash || '#login';
  const mainContent = document.getElementById('main-content');
  const sidebar = document.getElementById('sidebar');

  if (!mainContent || !sidebar) return;

  // Restore session from stored token
  if (!state.user && state.token && !isRestoring) {
    isRestoring = true;
    api.setToken(state.token);
    api.getMe().then(user => {
      state.user = user;
      isRestoring = false;
      renderSidebar(sidebar, state);
      router();
    }).catch(() => {
      localStorage.removeItem('token');
      state.token = null;
      api.setToken(null);
      isRestoring = false;
      window.location.hash = '#login';
    });
    // Show loading while restoring
    mainContent.innerHTML = `
      <div class="loading-container" style="min-height:100vh;">
        <div class="loading-spinner loading-spinner-lg"></div>
        <span class="loading-text">Cargando sesión...</span>
      </div>
    `;
    return;
  }

  // Not authenticated
  if (!state.user) {
    sidebar.classList.add('hidden');
    mainContent.style.marginLeft = '0';
    mainContent.style.width = '100%';
    renderLogin(mainContent, state);
    return;
  }

  // Authenticated
  sidebar.classList.remove('hidden');
  mainContent.style.marginLeft = '';
  mainContent.style.width = '';
  renderSidebar(sidebar, state);

  switch (hash) {
    case '#dashboard':
      renderDashboard(mainContent, state);
      break;
    case '#search':
      renderSearch(mainContent, state);
      break;
    case '#my-leads':
      renderMyLeads(mainContent, state);
      break;
    case '#admin':
      if (state.user.role === 'admin') {
        renderAdmin(mainContent, state);
      } else {
        window.location.hash = '#dashboard';
      }
      break;
    default:
      window.location.hash = '#dashboard';
      break;
  }
}

// Listen for hash changes
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// Global logout
window.logout = () => {
  state.user = null;
  state.token = null;
  localStorage.removeItem('token');
  api.setToken(null);
  showToast('Sesión cerrada', 'info');
  window.location.hash = '#login';
};

// Global login (called from login page)
window.login = (user, token) => {
  state.user = user;
  state.token = token;
  localStorage.setItem('token', token);
  api.setToken(token);
  window.location.hash = '#dashboard';
};

export { state };
