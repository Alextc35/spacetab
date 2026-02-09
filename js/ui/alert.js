/**
 * alert.js
 * ------------------------------------------------------
 * Generic alert / confirmation modal.
 *
 * Responsibilities:
 * - Display confirm or info dialogs
 * - Block interaction with other modals
 * - Integrate with modalManager (stack, focus, keyboard)
 * - Provide a Promise-based API for user decisions
 *
 * Notes:
 * - Only one alert can be active at a time
 * - Enter key confirms when the alert is focused
 * - Escape / overlay click cancels (if enabled)
 * - Consumers should await the returned Promise
 * ------------------------------------------------------
 */

import { DEBUG } from '../core/config.js';
import { t } from '../core/i18n.js';
import { registerModal, openModal, closeModal } from '../ui/modalManager.js';

/**
 * Root DOM element of the alert modal.
 *
 * Created dynamically on init and reused.
 *
 * @type {HTMLElement|null}
 */
let modal;

/**
 * Internal DOM references.
 * 
 * @type {HTMLHeadingElement}
 */
let titleEl

/**
 * Action buttons for user responses.
 * 
 * @type {HTMLButtonElement}
 */
let btnAccept

/**
 * Cancel button, conditionally shown for 'confirm' type.
 * 
 * @type {HTMLButtonElement}
 */
let btnCancel;

/**
 * Resolver function for the active Promise.
 *
 * Ensures the Promise returned by showAlert()
 * is resolved exactly once.
 *
 * @type {Function|null}
 */
let currentResolve = null;

/**
 * Active callbacks for accept actions.
 * 
 * @type {Function|null}
 */
let activeAccept = null;

/**
 * Active callback for cancel action, only set for 'confirm' type.
 * 
 * @type {Function|null}
 */
let activeCancel = null;

/**
 * Initializes the alert modal.
 *
 * This function is idempotent and should be called once
 * during application bootstrap.
 *
 * Responsibilities:
 * - Create modal DOM
 * - Attach button listeners
 * - Register the modal in modalManager
 */
export function initAlertModal() {
  if (modal) return;

  modal = document.createElement('div');
  modal.className = 'modal';
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

  titleEl = modal.querySelector('#alert-title');
  btnAccept = modal.querySelector('#alert-accept');
  btnCancel = modal.querySelector('#alert-cancel');

  btnAccept.addEventListener('click', () => {
    activeAccept?.();
  });

  btnCancel.addEventListener('click', () => {
    activeCancel?.();
  });

  registerModal({
    id: 'alert',
    element: modal,
    acceptOnEnter: true,
    closeOnEsc: true,
    closeOnOverlay: true,
    initialFocus: btnAccept
  });

  if (DEBUG) console.info('Alert modal registered');
}

/**
 * Displays an alert modal and returns a Promise
 * resolved with the user's decision.
 *
 * @param {string} text - Alert message
 * @param {Object} options
 * @param {'confirm'|'info'} [options.type='confirm']
 *
 * @returns {Promise<boolean>}
 * - true  → accepted
 * - false → cancelled / dismissed
 */
export function showAlert(text, options = {}) {
  const { type = 'confirm' } = options;

  return new Promise((resolveResult) => {
    currentResolve = resolveResult;

    titleEl.textContent = text;

    btnAccept.textContent = t('buttons.accept');
    btnCancel.textContent = t('buttons.cancel');
    btnCancel.style.display = type === 'info' ? 'none' : 'inline-block';

    activeAccept = () => {
      resolveResult(true);
      closeModal();
    };

    activeCancel = () => {
      resolveResult(false);
      closeModal();
    };

    openModal('alert', {
      onAccept: activeAccept,
      onCancel: activeCancel
    });
  });
}

/**
 * Resolves the active Promise safely.
 *
 * Prevents double resolution and clears state.
 *
 * @param {boolean} result
 */
function resolveResult(result) {
  if (!currentResolve) return;

  currentResolve(result);
  currentResolve = null;
}