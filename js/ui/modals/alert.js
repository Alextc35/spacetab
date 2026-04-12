import { t } from '../../core/i18n.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';

/**
 * Alert modal root element.
 */
let modal;

/**
 * Alert modal title element.
 */
let titleEl;

/**
 * Accept button element.
 */
let btnAccept;

/**
 * Cancel button element.
 */
let btnCancel;

/**
 * Pending promise resolver for the currently open alert.
 */
let currentResolve = null;

/**
 * Active accept handler for the currently displayed alert.
 */
let activeAccept = null;

/**
 * Active cancel handler for the currently displayed alert.
 */
let activeCancel = null;

/**
 * Initializes the alert modal once.
 *
 * Responsibilities:
 * - resolve modal DOM elements
 * - bind accept/cancel button actions
 * - register the modal in the modal manager
 */
export function initAlertModal() {
  if (modal) return;

  modal = document.getElementById('alert-modal');

  titleEl = modal.querySelector('#alert-modal-title');
  btnCancel = modal.querySelector('#alert-modal-cancel');
  btnAccept = modal.querySelector('#alert-modal-accept');

  /**
   * Ensure the alert modal stays above other modals when needed.
   */
  modal.style.zIndex = '1001';

  /**
   * Delegate accept button clicks to the currently active handler.
   */
  btnAccept.addEventListener('click', () => {
    activeAccept?.();
  });

  /**
   * Delegate cancel button clicks to the currently active handler.
   */
  btnCancel.addEventListener('click', () => {
    activeCancel?.();
  });

  /**
   * Register the alert modal with the modal manager.
   *
   * Behavior:
   * - Enter accepts
   * - Escape cancels/closes
   * - overlay clicks do not close the modal
   */
  registerModal({
    id: 'alert',
    element: modal,
    acceptOnEnter: true,
    closeOnEsc: true,
    closeOnOverlay: false,
    initialFocus: btnAccept
  });
}

/**
 * Displays the alert modal and returns a promise
 * resolved with the user's action.
 *
 * Supported types:
 * - confirm: shows accept and cancel buttons
 * - info: shows only the accept button
 *
 * @param {string} text - Alert message to display.
 * @param {Object} [options={}]
 * @param {'confirm'|'info'} [options.type='confirm']
 * @returns {Promise<boolean>}
 */
export function showAlert(text, options = {}) {
  const { type = 'confirm' } = options;

  return new Promise((resolveResult) => {
    currentResolve = resolveResult;

    /**
     * Update modal content and button labels.
     */
    titleEl.textContent = text;

    btnAccept.textContent = t('buttons.accept');
    btnCancel.textContent = t('buttons.cancel');
    btnCancel.style.display = type === 'info' ? 'none' : 'inline-block';

    /**
     * Resolve the alert as accepted and close the modal.
     */
    activeAccept = () => {
      resolveResult(true);
      closeModal();
    };

    /**
     * Resolve the alert as cancelled and close the modal.
     */
    activeCancel = () => {
      resolveResult(false);
      closeModal();
    };

    /**
     * Open the modal and expose the same handlers
     * to the modal manager lifecycle.
     */
    openModal('alert', {
      onAccept: activeAccept,
      onCancel: activeCancel
    });
  });
}

/**
 * Resolves the currently pending alert promise, if any,
 * and clears the stored resolver reference.
 *
 * @param {boolean} result
 */
function resolveResult(result) {
  if (!currentResolve) return;

  currentResolve(result);
  currentResolve = null;
}