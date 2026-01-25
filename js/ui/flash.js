import { t } from '../core/i18n.js';
 
const flashContainer = document.getElementById('flash-container');
const MAX_FLASHES = 3;

export function flash(message, type = 'info', duration = 3000) {
  while (flashContainer.children.length >= MAX_FLASHES) {
    flashContainer.firstElementChild.remove();
  }
  const div = document.createElement('div');
  div.className = `flash-message flash-${type}`;
  div.textContent = t(message);

  flashContainer.appendChild(div);

  // Animación de entrada
  requestAnimationFrame(() => div.classList.add('show'));

  // Auto-borrar después de "duration" ms
  setTimeout(() => {
    div.classList.remove('show');
    // Espera la animación de salida antes de eliminar
    div.addEventListener('transitionend', () => div.remove());
  }, duration);
}

// Métodos rápidos
export function flashSuccess(msg, duration) { flash(msg, 'success', duration); }
export function flashError(msg, duration) { flash(msg, 'error', duration); }
export function flashInfo(msg, duration) { flash(msg, 'info', duration); }