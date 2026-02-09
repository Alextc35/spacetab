import { addBookmark, getBookmarks } from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { isAreaFree } from '../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from './gridLayout.js';
import { flashSuccess } from '../ui/flash.js';
import { DEBUG } from '../core/config.js';
import { showAlert } from './alert.js';
import { t } from '../core/i18n.js';
import { registerModal, openModal, closeModal } from '../ui/modalManager.js';

let modal;
let nameInput, urlInput;

/* ======================= Init ======================= */

export function initAddBookmarkModal() {
  if (modal) return;

  modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-card">
      <h2>➕ ${t('addModal.title')}</h2>

      <div class="modal-field">
        <label for="add-name">${t('addModal.name')}</label>
        <input type="text" id="add-name" autofocus>
      </div>

      <div class="modal-field">
        <label for="add-url">${t('addModal.url')}</label>
        <input type="url" id="add-url" placeholder="https://">
      </div>

      <div class="modal-actions">
        <button id="add-cancel" class="btn ghost">
          ${t('buttons.cancel')}
        </button>
        <button id="add-save" class="btn primary">
          ${t('buttons.accept')}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  nameInput = modal.querySelector('#add-name');
  urlInput = modal.querySelector('#add-url');

  modal.querySelector('#add-save')
    .addEventListener('click', handleAccept);

  modal.querySelector('#add-cancel')
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
      handleAccept(); // esto solo cerrará el modal si los campos son válidos
    }
  });

  if (DEBUG) console.info('AddBookmark modal registered');
}

/* ======================= Open ======================= */

export function showAddBookmarkModal() {
  if (!modal) return;

  nameInput.value = '';
  urlInput.value = '';

  modal.querySelector('h2').textContent = `➕ ${t('addModal.title')}`;
  modal.querySelector('label[for="add-name"]').textContent = t('addModal.name');
  modal.querySelector('label[for="add-url"]').textContent = t('addModal.url');
  modal.querySelector('#add-save').textContent = t('buttons.accept');
  modal.querySelector('#add-cancel').textContent = t('buttons.cancel');

  openModal('add-bookmark', {
    onAccept: handleAccept
  });
}

/* ======================= Logic ======================= */
let submitting = false;

async function handleAccept() {
  if (submitting) return;
  submitting = true;

  try {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
      submitting = false;  
      return;
    }

    const bookmarks = getBookmarks();
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
    renderBookmarks();
    flashSuccess('flash.bookmark.added');

    if (DEBUG) console.log('Bookmark added:', bookmark);

    closeModal();
  } finally {
    submitting = false;
  }
}