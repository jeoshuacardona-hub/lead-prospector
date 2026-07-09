/**
 * Login Page
 */
import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderLogin(container, state) {
  container.innerHTML = `
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
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      errorEl.textContent = 'Por favor, completa todos los campos';
      errorEl.classList.add('show');
      return;
    }

    // Loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Ingresando...';
    errorEl.classList.remove('show');

    try {
      const data = await api.login(username, password);
      api.setToken(data.token);
      showToast(`¡Bienvenido, ${data.user.full_name}!`, 'success');
      window.login(data.user, data.token);
    } catch (err) {
      errorEl.textContent = err.message || 'Credenciales incorrectas';
      errorEl.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = 'Iniciar Sesión';
    }
  });
}
