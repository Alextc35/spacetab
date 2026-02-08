/**
 * =========================================================
 * Alert modal (confirm-style)
 * =========================================================
 *
 * Responsibilities:
 * - Show modal alerts that require user confirmation
 * - Replaces native confirm() with a promise-based API
 * - Handles overlay, keyboard, and focus
 *
 * Usage:
 *   import { initAlertModal, showAlert } from './alert.js';
 *   await initAlertModal();
 *   const confirmed = await showAlert("¿Eliminar este bookmark?");
 *   if (confirmed) { // borrar bookmark }
 */

import { DEBUG } from '../core/config.js';

let modal, overlay, titleEl, btnAccept, btnCancel;
let currentResolve = null;

/**
 * Initialize the alert modal.
 * Must be called once before showing alerts.
 */
export function initAlertModal() {
    if (modal) return;

    modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-card">
        <h2 id="alert-title">Alerta</h2>
        <div class="modal-actions">
          <button id="alert-cancel" class="btn ghost">Cancelar</button>
          <button id="alert-accept" class="btn primary">Aceptar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    overlay = modal.querySelector('.modal-overlay');
    titleEl = modal.querySelector('#alert-title');
    btnAccept = modal.querySelector('#alert-accept');
    btnCancel = modal.querySelector('#alert-cancel');

    overlay.addEventListener('click', () => hideAlert(false));
    btnCancel.addEventListener('click', () => hideAlert(false));
    btnAccept.addEventListener('click', () => hideAlert(true));

    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideAlert(false);
        if (e.key === 'Enter') hideAlert(true);
    });

    // Make modal focusable
    modal.tabIndex = -1;

    if (DEBUG) console.info('Alert modal initialized.');
}

/**
 * Show the alert modal with custom text.
 * Returns a promise resolved with true (accept) or false (cancel).
 *
 * @param {string} text - Message to display
 * @returns {Promise<boolean>}
 */
export function showAlert(text) {
    return new Promise((resolve) => {
        if (!modal) {
            console.error('Alert modal not initialized. Call initAlertModal() first.');
            resolve(false);
            return;
        }

        titleEl.textContent = text;
        modal.style.display = 'flex';
        modal.focus();

        currentResolve = resolve;

        // Focus the primary button by default
        btnAccept.focus();
    });
}

/**
 * Hide the alert modal and resolve the current promise.
 * @param {boolean} result
 */
function hideAlert(result = false) {
    if (!modal) return;
    modal.style.display = 'none';

    if (currentResolve) {
        currentResolve(result);
        currentResolve = null;
    }
}
