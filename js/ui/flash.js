import { MAX_FLASHES } from '../core/config.js'
import { t } from '../core/i18n.js';

const flashContainer = document.getElementById('flash-container');

/**
 * Displays a flash notification message in the UI.
 *
 * Limits the number of visible messages according to MAX_FLASHES.
 * The message is automatically removed after the specified duration.
 *
 * @param {string} message - Translation key for the message.
 * @param {'info'|'success'|'error'} [type='info'] - Visual type of the flash message.
 * @param {number} [duration=3000] - Time in milliseconds before the message disappears.
 * @returns {void}
 */
export function flash(message, type = 'info', duration = 3000) {
  while (flashContainer.children.length >= MAX_FLASHES) {
    flashContainer.firstElementChild.remove();
  }
  const div = document.createElement('div');
  div.className = `flash-message flash-${type}`;
  div.textContent = t(message);

  flashContainer.appendChild(div);

  requestAnimationFrame(() => div.classList.add('show'));

  setTimeout(() => {
    div.classList.remove('show');
    div.addEventListener('transitionend', () => div.remove());
  }, duration);
}

/**
 * Displays a success flash notification.
 *
 * @param {string} msg - Translation key for the message.
 * @param {number} [duration] - Optional duration in milliseconds.
 * @returns {void}
 */
export function flashSuccess(msg, duration) { flash(msg, 'success', duration); }

/**
 * Displays an error flash notification.
 *
 * @param {string} msg - Translation key for the message.
 * @param {number} [duration] - Optional duration in milliseconds.
 * @returns {void}
 */
export function flashError(msg, duration) { flash(msg, 'error', duration); }

/**
 * Displays an informational flash notification.
 *
 * @param {string} msg - Translation key for the message.
 * @param {number} [duration] - Optional duration in milliseconds.
 * @returns {void}
 */
export function flashInfo(msg, duration) { flash(msg, 'info', duration); }