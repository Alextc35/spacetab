import { addBookmark } from '../../core/bookmark.js';
import { isAreaFree } from '../../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { flashSuccess } from '../flash.js';
import { DEBUG } from '../../core/config.js';
import { showAlert } from './alertModal.js';
import { t } from '../../core/i18n.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';

let modal;

let nameInput

let urlInput;

let submitting = false;

export function initAddBookmarkModal() {
  if (modal) return;

  modal = document.getElementById('add-bookmark-modal');

  nameInput = modal.querySelector('#add-bookmark-modal-name');
  urlInput = modal.querySelector('#add-bookmark-modal-url');

  modal.querySelector('#add-bookmark-modal-save')
    .addEventListener('click', handleAccept);

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

  if (DEBUG) console.info('AddBookmark modal initialized');
}

export function showAddBookmarkModal() {
  if (!modal) return;

  nameInput.value = '';
  urlInput.value = '';

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

    const { bookmarks } = getState();
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
      if (DEBUG) console.warn('No space to add new bookmark');
      await new Promise(requestAnimationFrame);
      await showAlert(t('alert.bookmarks.no_space'), { type: 'info' });
      return;
    }

    const bookmark = await addBookmark({ name, url, gx, gy });

    if (bookmark) {
      flashSuccess('flash.bookmark.added');
      if (DEBUG) console.log('Bookmark added: ', bookmark);
    }

    closeModal();

  } finally {
    submitting = false;
  }
}