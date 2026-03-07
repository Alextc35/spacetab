import { addBookmark } from '../../core/bookmark.js';
import { isAreaFree } from '../../core/grid.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { flashSuccess } from '../flash.js';
import { showAlert } from './alertModal.js';
import { t } from '../../core/i18n.js';
import { registerModal, openModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';

import { createBookmarkEditor } from '../bookmark/editor.js';

let modal;
let modalSave;

let editor;
let bookmarkDraft = {};

let submitting = false;

export function initAddBookmarkModal() {

  if (modal) return;

  modal = document.getElementById('add-bookmark-modal');
  modalSave = document.getElementById('add-bookmark-modal-save');

  const elements = {
    preview: modal.querySelector('#add-bookmark-preview'),
    name: modal.querySelector('#add-bookmark-modal-name'),
    url: modal.querySelector('#add-bookmark-modal-url'),

    backgroundColor: modal.querySelector('#add-bookmark-bg-color'),
    backgroundImage: modal.querySelector('#add-bookmark-bg-image'),
    backgroundFavicon: modal.querySelector('#add-bookmark-bg-favicon'),

    noBackground: modal.querySelector('#add-bookmark-no-bg'),
    invertBg: modal.querySelector('#add-bookmark-invert-bg'),

    showText: modal.querySelector('#add-bookmark-show-text'),
    textColor: modal.querySelector('#add-bookmark-text-color'),

    showFavicon: modal.querySelector('#add-bookmark-show-favicon'),
    invertIcon: modal.querySelector('#add-bookmark-invert-icon'),

    urlToggleBtn: modal.querySelector('#add-bookmark-url-toggle'),
    urlCopyBtn: modal.querySelector('#add-bookmark-url-copy'),
    urlClearBtn: modal.querySelector('#add-bookmark-url-clear'),

    bgToggleBtn: modal.querySelector('#add-bookmark-bg-toggle'),
    bgCopyBtn: modal.querySelector('#add-bookmark-bg-copy'),
    bgClearBtn: modal.querySelector('#add-bookmark-bg-clear')
  };

  editor = createBookmarkEditor({
    elements,
    bookmark: bookmarkDraft,
    onChange: () => updateSaveButtonState()
  });

  modalSave.addEventListener('click', handleAccept);

  modal.querySelector('#add-bookmark-modal-cancel')
    .addEventListener('click', () => closeModal());

  registerModal({
    id: 'add-bookmark',
    element: modal,
    acceptOnEnter: false,
    closeOnEsc: true,
    closeOnOverlay: true,
    initialFocus: elements.name
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

  const { data: { settings } } = getState();

  bookmarkDraft = settings.bookmarkDefault;
  bookmarkDraft.name = '';
  bookmarkDraft.url = '';

  editor.setState(bookmarkDraft);

  updateSaveButtonState();

  openModal('add-bookmark', {
    onAccept: handleAccept
  });
}

function updateSaveButtonState() {

  const state = editor.getState();

  const hasName = state.name?.trim().length > 0;

  modalSave.disabled = !hasName;
  modalSave.classList.toggle('is-disabled', !hasName);
}

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

      await showAlert(t('alert.bookmarks.no_space'), { type: 'info' });

      return;
    }

    const created = await addBookmark({
      ...bookmark,
      name,
      url,
      gx,
      gy
    });

    if (created) flashSuccess('flash.bookmark.added');

    closeModal();

  } finally {
    submitting = false;
  }
}