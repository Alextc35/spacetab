import { registerModal, openModal, closeModal } from '../modalManager.js';
import { flashSuccess } from '../flash.js';
import { initTabs } from '../tabs.js';
import { createBookmarkEditor } from '../bookmark/editor.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';

import { t } from '../../core/i18n.js';
import { getState } from '../../core/store.js';
import { addBookmark } from '../../core/bookmark.js';
import { isAreaFree } from '../../core/grid.js';

import { showAlert } from './alert.js';

let modalSave;

let editor;
let tabs;
let bookmarkDraft = {};

let submitting = false;

let advancedToggle;
let advancedPanel;

let urlClearBtn;
let urlInput;
let backgroundImage;

/* =====================================================
   INIT
===================================================== */

export function initAddBookmark() {
  const addBookmarkModal = document.getElementById('add-bookmark-modal');
  modalSave = document.getElementById('add-bookmark-modal-save');

  tabs = initTabs({
    root: addBookmarkModal,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  tabs.activate('add-bookmark-tab-style');

  advancedToggle = addBookmarkModal.querySelector('#add-bookmark-advanced-toggle');
  advancedPanel = addBookmarkModal.querySelector('#add-bookmark-advanced');

  const elements = {

    preview: addBookmarkModal.querySelector('#add-bookmark-preview'),

    name: addBookmarkModal.querySelector('#add-bookmark-modal-name'),
    url: addBookmarkModal.querySelector('#add-bookmark-modal-url'),

    backgroundColor: addBookmarkModal.querySelector('#add-bookmark-background-color'),
    backgroundImage: addBookmarkModal.querySelector('#add-bookmark-background-image'),
    backgroundFavicon: addBookmarkModal.querySelector('#add-bookmark-background-favicon'),

    noBackground: addBookmarkModal.querySelector('#add-bookmark-no-background'),
    invertBg: addBookmarkModal.querySelector('#add-bookmark-invert-bg'),

    showText: addBookmarkModal.querySelector('#add-bookmark-show-text'),
    textColor: addBookmarkModal.querySelector('#add-bookmark-text-color'),

    showFavicon: addBookmarkModal.querySelector('#add-bookmark-show-favicon'),
    invertIcon: addBookmarkModal.querySelector('#add-bookmark-invert-icon'),

    urlToggleBtn: addBookmarkModal.querySelector('#add-modal-toggle-url'),
    urlCopyBtn: addBookmarkModal.querySelector('#add-modal-copy-url'),
    urlClearBtn: addBookmarkModal.querySelector('#add-modal-clear-url'),

    bgToggleBtn: addBookmarkModal.querySelector('#add-modal-toggle-background-image'),
    bgCopyBtn: addBookmarkModal.querySelector('#add-modal-copy-background-image'),
    bgClearBtn: addBookmarkModal.querySelector('#add-modal-clear-background-image')

  };

  urlClearBtn = elements.urlClearBtn;
  urlInput = elements.url;
  backgroundImage = elements.backgroundImage;

  const { data: { settings } } = getState();

  bookmarkDraft = structuredClone(settings.bookmarkDefault);

  editor = createBookmarkEditor({
    elements,
    bookmark: bookmarkDraft,
    onChange: () => updateSaveButtonState()
  });

  modalSave.addEventListener('click', handleAccept);

  addBookmarkModal.querySelector('#add-bookmark-modal-cancel')
    .addEventListener('click', handleCancel);
  /* =====================================================
     ADVANCED TOGGLE
  ===================================================== */

  if (advancedToggle && advancedPanel) {

    advancedToggle.addEventListener('click', () => {

      const hidden = advancedPanel.classList.toggle('is-hidden');

      advancedToggle.textContent = hidden
        ? '⚙️ Opciones avanzadas'
        : '⬆ Ocultar opciones';

    });

  }

  /* =====================================================
     REGISTER MODAL
  ===================================================== */

  registerModal({
    id: 'add-bookmark',
    element: addBookmarkModal,
    closeOnEsc: true,
    closeOnOverlay: true,
    acceptOnEnter: false,
    initialFocus: elements.name,
    shortcut: 'Enter',
    toggleWithShortcut: true,
    onShortcut: () => showAddBookmark(),
  });

  /* =====================================================
     KEYBOARD
  ===================================================== */

  addBookmarkModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAccept();
    }
  });
}

/* =====================================================
   SHOW MODAL
===================================================== */

function showAddBookmark() {

  const { data: { settings } } = getState();

  bookmarkDraft = structuredClone(settings.bookmarkDefault);

  bookmarkDraft.name = '';
  bookmarkDraft.url = '';
  if (urlInput) urlInput.value = '';

  editor.reset(bookmarkDraft);

  updateSaveButtonState();

  tabs.activate('add-bookmark-tab-style');
  if (advancedPanel) advancedPanel.classList.add('is-hidden');
  if (advancedToggle) advancedToggle.textContent = '⚙️ Opciones avanzadas';

  openModal('add-bookmark', {
    onAccept: handleAccept,
    onCancel: handleCancel
  });
}

/* =====================================================
   SAVE BUTTON STATE
===================================================== */

function updateSaveButtonState() {

  const state = editor.getState();

  const hasName = state.name?.trim().length > 0;

  modalSave.disabled = !hasName;
  modalSave.classList.toggle('is-disabled', !hasName);

}

/* =====================================================
   ACCEPT
===================================================== */

async function handleAccept() {

  if (submitting) return;

  submitting = true;

  try {

    const bookmark = editor.getState();

    const name = bookmark.name.trim();
    const url = bookmark.url.trim();

    if (!name) {
      submitting = false;
      return;
    }

    const state = getState();
    const { data } = state;
    const { bookmarks } = data;

    const maxRows = getMaxVisibleRows();
    const maxCols = getMaxVisibleCols();

    let gx = 0;
    let gy = 0;
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

      await showAlert(
        t('alert.bookmarks.no_space'),
        { type: 'info' }
      );

      return;

    }

    const created = addBookmark({
      ...bookmark,
      name,
      url,
      gx,
      gy
    });

    if (created) {
      flashSuccess('flash.bookmark.added');
    }

    closeModal();
  } finally {
    submitting = false;
    if (backgroundImage) backgroundImage.value = '';
  }
}

function resetAddBookmarkForm() {
  const { data: { settings } } = getState();

  const resetBookmark = structuredClone(settings.bookmarkDefault);
  resetBookmark.name = '';
  resetBookmark.url = '';
  resetBookmark.urlLocked = false;

  if (backgroundImage) backgroundImage.value = '';
  if (urlClearBtn) urlClearBtn.click();
  if (urlInput) urlInput.value = '';

  editor.reset(resetBookmark);
}

async function handleCancel() {
  const ok = await showAlert(
    t('alert.bookmark.add.cancel'),
    { type: 'confirm' }
  );

  if (!ok) return false;

  resetAddBookmarkForm();
  closeModal();
}