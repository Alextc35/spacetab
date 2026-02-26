import { t } from '../../core/i18n/i18n.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';

let modal;

let titleEl

let btnAccept

let btnCancel;

let currentResolve = null;

let activeAccept = null;

let activeCancel = null;

export function initAlertModal() {
  if (modal) return;

  modal = document.getElementById('alert-modal');

  titleEl = modal.querySelector('#alert-modal-title');
  btnCancel = modal.querySelector('#alert-modal-cancel');
  btnAccept = modal.querySelector('#alert-modal-accept');

  modal.style.zIndex = '1001';

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
    closeOnOverlay: false,
    initialFocus: btnAccept
  });
}

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

function resolveResult(result) {
  if (!currentResolve) return;

  currentResolve(result);
  currentResolve = null;
}