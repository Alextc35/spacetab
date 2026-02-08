/**
 * =========================================================
 * Alert modal (confirm/info-style)
 * =========================================================
 *
 * Responsibilities:
 * - Show modal alerts that require user confirmation or just info
 * - Replaces native confirm() with a promise-based API
 * - Handles overlay, keyboard, focus, and translations
 *
 * Usage:
 *   import { initAlertModal, showAlert } from './alert.js';
 *   await initAlertModal();
 *   const confirmed = await showAlert(t('flash.bookmark.confirmDelete', { name: bookmark.name }));
 *   if (confirmed) { // borrar bookmark }
 *
 *   // Info-only alert
 *   await showAlert(t('flash.no_space'), { type: 'info' });
 */

import { DEBUG } from '../core/config.js';
import { t } from '../core/i18n.js';

let modal, overlay, titleEl, btnAccept, btnCancel;
let currentResolve = null;

/**
 * Initialize the alert modal. Must be called once.
 * 
 * @returns {void}
 */
export function initAlertModal() {
    if (modal) return;

    modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-card">
        <h2 id="alert-title"></h2>
        <div class="modal-actions">
        <button id="alert-cancel" class="btn ghost"></button>
        <button id="alert-accept" class="btn primary"></button>
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
 * Show the alert modal.
 * 
 * @param {string} text - Message to display
 * @param {Object} options
 * @param {'confirm'|'info'} options.type - Type of alert, default 'confirm'
 * @returns {Promise<boolean>} true if accepted
 */
export function showAlert(text, options = {}) {
    const { type = 'confirm' } = options;

    return new Promise((resolve) => {
        if (!modal) {
            console.error('Alert modal not initialized. Call initAlertModal() first.');
            resolve(false);
            return;
        }

        titleEl.textContent = text;

        if (type === 'info') {
            btnCancel.style.display = 'none';
            btnAccept.textContent = t('buttons.accept');
        } else { // confirm
            btnCancel.style.display = 'inline-block';
            btnCancel.textContent = t('buttons.cancel');
            btnAccept.textContent = t('buttons.accept');
        }

        modal.style.display = 'flex';
        modal.focus();

        currentResolve = resolve;

        btnAccept.focus();
    });
}

/**
 * Hide the alert modal and resolve the promise.
 * 
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