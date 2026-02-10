/**
 * addBookmarkModal.js
 * ------------------------------------------------------
 * Modal for creating new bookmarks.
 *
 * Responsibilities:
 * - Display a modal form to create a bookmark
 * - Validate minimal input (name + url)
 * - Find the first available grid position
 * - Prevent creation when the grid is full
 * - Integrate with modalManager for focus and keyboard handling
 *
 * Notes:
 * - This modal does NOT allow implicit submission on Enter
 * - Submission is fully controlled to avoid conflicts with global shortcuts
 * - When the grid is full, an informational alert is shown
 * ------------------------------------------------------
 */

import { addBookmark, getBookmarks } from '../core/bookmark.js';
import { renderBookmarks } from './bookmarks.js';
import { isAreaFree } from '../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from './gridLayout.js';
import { flashSuccess } from './flash.js';
import { DEBUG } from '../core/config.js';
import { showAlert } from './alertModal.js';
import { t } from '../core/i18n.js';
import { registerModal, openModal, closeModal } from './modalManager.js';

/**
 * Root modal element.
 *
 * Created once and reused.
 *
 * @type {HTMLElement|null}
 */
let modal;

/**
 * Input element for bookmark name.
 * 
 * @type {HTMLInputElement}
 */
let nameInput

/**
 * Input elements for name and URL.
 * 
 * @type {HTMLInputElement}
 */
let urlInput;

/**
 * Submission guard.
 *
 * Prevents double submissions caused by
 * fast clicks or repeated key presses.
 *
 * @type {boolean}
 */
let submitting = false;

/**
 * Initializes the Add Bookmark modal.
 *
 * This function is idempotent and should be
 * called once during app bootstrap.
 *
 * Responsibilities:
 * - Create modal DOM
 * - Bind form actions
 * - Register modal in modalManager
 * - Override Enter behavior inside the modal
 */
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
      handleAccept();
    }
  });

  if (DEBUG) console.info('AddBookmark modal initialized');
}

/**
 * Opens the Add Bookmark modal.
 *
 * Resets form state and updates
 * all translatable UI strings.
 * 
 * @returns {void}
 */
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

/**
 * Handles bookmark creation.
 *
 * Flow:
 * 1. Validate input
 * 2. Find the first free grid position
 * 3. Abort with alert if grid is full
 * 4. Persist bookmark
 * 5. Re-render UI and close modal
 * 
 * @returns {Promise<void>}
 */
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