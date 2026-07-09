/**
 * Reusable Modal Component
 */

export function openModal(title, contentHTML, options = {}) {
  const existing = document.getElementById('modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-overlay';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal animate-slide-up">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn-icon" onclick="document.getElementById('modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">${contentHTML}</div>
      ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
  return modal;
}

export function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.remove();
}
