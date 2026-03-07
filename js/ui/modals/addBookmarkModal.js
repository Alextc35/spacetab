import { addBookmark } from '../../core/bookmark.js';
import { isAreaFree } from '../../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { flashSuccess } from '../flash.js';
import { showAlert } from './alertModal.js';
import { t } from '../../core/i18n.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';
import { initTabs } from '../tabs.js';
import { createBookmarkEditor } from '../bookmark/editor.js';

let modal;
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

export function initAddBookmarkModal() {

  if (modal) return;

  modal = document.getElementById('add-bookmark-modal');
  modalSave = document.getElementById('add-bookmark-modal-save');

  tabs = initTabs({
    root: modal,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  tabs.activate('add-bookmark-tab-style');

  advancedToggle = modal.querySelector('#add-bookmark-advanced-toggle');
  advancedPanel = modal.querySelector('#add-bookmark-advanced');

  const elements = {

    preview: modal.querySelector('#add-bookmark-preview'),

    name: modal.querySelector('#add-bookmark-modal-name'),
    url: modal.querySelector('#add-bookmark-modal-url'),

    backgroundColor: modal.querySelector('#add-bookmark-background-color'),
    backgroundImage: modal.querySelector('#add-bookmark-background-image'),
    backgroundFavicon: modal.querySelector('#add-bookmark-background-favicon'),

    noBackground: modal.querySelector('#add-bookmark-no-background'),
    invertBg: modal.querySelector('#add-bookmark-invert-bg'),

    showText: modal.querySelector('#add-bookmark-show-text'),
    textColor: modal.querySelector('#add-bookmark-text-color'),

    showFavicon: modal.querySelector('#add-bookmark-show-favicon'),
    invertIcon: modal.querySelector('#add-bookmark-invert-icon'),

    urlToggleBtn: modal.querySelector('#add-modal-toggle-url'),
    urlCopyBtn: modal.querySelector('#add-modal-copy-url'),
    urlClearBtn: modal.querySelector('#add-modal-clear-url'),

    bgToggleBtn: modal.querySelector('#add-modal-toggle-background-image'),
    bgCopyBtn: modal.querySelector('#add-modal-copy-background-image'),
    bgClearBtn: modal.querySelector('#add-modal-clear-background-image')

  };

  urlClearBtn = elements.urlClearBtn;
  urlInput = elements.url;
  backgroundImage = elements.backgroundImage;

  editor = createBookmarkEditor({
    elements,
    bookmark: bookmarkDraft,
    onChange: () => updateSaveButtonState()
  });

  modalSave.addEventListener('click', handleAccept);

  modal.querySelector('#add-bookmark-modal-cancel')
    .addEventListener('click', handleCancel);

  function handleCancel() {
    const { data: { settings } } = getState();

    const resetBookmark = structuredClone(settings.bookmarkDefault);
    resetBookmark.name = '';
    resetBookmark.url = '';
    resetBookmark.urlLocked = false;

    if (backgroundImage) backgroundImage.value = '';
    if (urlClearBtn) urlClearBtn.click();
    if (urlInput) urlInput.value = '';

    editor.reset(resetBookmark);

    closeModal();
  }
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
    element: modal,
    acceptOnEnter: false,
    closeOnEsc: true,
    closeOnOverlay: true,
    initialFocus: elements.name,
    onClose: handleCancel
  });

  /* =====================================================
     KEYBOARD
  ===================================================== */

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

/* =====================================================
   SHOW MODAL
===================================================== */

export function showAddBookmarkModal() {

  if (!modal) return;

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
    onAccept: handleAccept
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