/**
 * flash.js
 * ------------------------------------------------------
 * Transient flash message system.
 *
 * Responsibilities:
 * - Displays temporary feedback messages to the user
 * - Supports multiple message types (info, success, error)
 * - Limits the number of visible messages
 * - Handles enter and exit animations
 *
 * UX rules:
 * - Messages auto-dismiss after a configurable duration
 * - Older messages are removed when the limit is exceeded
 * - Text is automatically localized via i18n
 *
 * Notes:
 * - This module assumes #flash-container exists in the DOM
 * - Messages are non-interactive (pointer-events disabled)
 * ------------------------------------------------------
 */

import { t } from '../core/i18n.js';

/**
 * Flash container element.
 *
 * Must exist in the DOM before this module is used.
 *
 * @type {HTMLElement}
 */
const flashContainer = document.getElementById('flash-container');

/**
 * Maximum number of flash messages displayed simultaneously.
 *
 * Older messages are removed first when the limit is exceeded.
 *
 * @type {number}
 */
const MAX_FLASHES = 3;

/**
 * Displays a flash message.
 *
 * The message is localized, animated in, and automatically
 * removed after the specified duration.
 *
 * @param {string} message - i18n message key
 * @param {'info'|'success'|'error'} [type='info'] - Message type
 * @param {number} [duration=3000] - Duration in milliseconds
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
 * Displays a success flash message.
 *
 * @param {string} msg - i18n message key
 * @param {number} [duration]
 */
export function flashSuccess(msg, duration) { flash(msg, 'success', duration); }

/**
 * Displays an error flash message.
 *
 * @param {string} msg - i18n message key
 * @param {number} [duration]
 */
export function flashError(msg, duration) { flash(msg, 'error', duration); }

/**
 * Displays an informational flash message.
 *
 * @param {string} msg - i18n message key
 * @param {number} [duration]
 */
export function flashInfo(msg, duration) { flash(msg, 'info', duration); }