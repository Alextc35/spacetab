/**
 * =========================================================
 * Alert modal (confirm / info)
 * =========================================================
 */

import { DEBUG } from '../core/config.js';
import { t } from '../core/i18n.js';
import { registerModal, openModal, closeModal } from '../ui/modalManager.js';

let modal;
let titleEl, btnAccept, btnCancel;
let currentResolve = null;
let activeAccept = null;
let activeCancel = null;

/* ======================= Init ======================= */

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
    closeOnEsc: true,
    closeOnOverlay: true,
    acceptOnEnter: true,
    initialFocus: btnAccept
  });

  if (DEBUG) console.info('Alert modal registered');
}

/* ======================= Show ======================= */

export function showAlert(text, options = {}) {
  const { type = 'confirm' } = options;

  return new Promise((resolve) => {
    currentResolve = resolve;

    titleEl.textContent = text;

    btnAccept.textContent = t('buttons.accept');
    btnCancel.textContent = t('buttons.cancel');
    btnCancel.style.display = type === 'info' ? 'none' : 'inline-block';

    activeAccept = () => {
      resolve(true);
      closeModal();
    };

    activeCancel = () => {
      resolve(false);
      closeModal();
    };

    openModal('alert', {
      onAccept: activeAccept,
      onCancel: activeCancel
    });
  });
}

/* ======================= Resolve ======================= */

function resolve(result) {
  if (!currentResolve) return;

  currentResolve(result);
  currentResolve = null;
}