import { addBookmark } from '../../core/bookmark.js';
import { isAreaFree } from '../../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { flashSuccess } from '../flash.js';
import { showAlert } from './alertModal.js';
import { t } from '../../core/i18n.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';

let modal;

let nameInput

let urlInput;

let submitting = false;

let modalSave;

function updateSaveButtonState() {
  const hasName = nameInput.value.trim().length > 0;

  modalSave.disabled = !hasName;
  modalSave.classList.toggle('is-disabled', !hasName);
}

export function initAddBookmarkModal() {
  if (modal) return;

  modal = document.getElementById('add-bookmark-modal');
  modalSave = document.getElementById('add-bookmark-modal-save');

  nameInput = modal.querySelector('#add-bookmark-modal-name');
  nameInput.addEventListener('input', updateSaveButtonState);
  urlInput = modal.querySelector('#add-bookmark-modal-url');

  modalSave.addEventListener('click', handleAccept);

  modal.querySelector('#add-bookmark-modal-cancel')
    .addEventListener('click', () => closeModal());

  registerModal({
    id: 'add-bookmark',
    element: modal,
    acceptOnEnter: false,
    closeOnEsc: true,
    closeOnOverlay: true,
    initialFocus: nameInput
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAccept();
    }
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    }
  });
}

export function showAddBookmarkModal() {
  if (!modal) return;

  nameInput.value = '';
  urlInput.value = '';

  updateSaveButtonState();

  openModal('add-bookmark', {
    onAccept: handleAccept
  });
}

async function handleAccept() {
  if (submitting) return;
  submitting = true;

  try {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name) {
      submitting = false;  
      return;
    }

    const state = getState();
    const { data } = state;
    const { bookmarks } = data;
    const maxRows = getMaxVisibleRows();
    const maxCols = getMaxVisibleCols();

    let gx = 0, gy = 0;
    let placed = false;

    for (let col = 0; col < maxCols && !placed; col++) {
      for (let row = 0; row < maxRows; row++) {
        if (isAreaFree(bookmarks, col, row, 1, 1)) {
          gx = col;
          gy = row;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      closeModal();
      await new Promise(requestAnimationFrame);
      await showAlert(t('alert.bookmarks.no_space'), { type: 'info' });
      return;
    }

    const bookmark = await addBookmark({ name, url, gx, gy });

    if (bookmark) flashSuccess('flash.bookmark.added');

    closeModal();

  } finally {
    submitting = false;
  }
}