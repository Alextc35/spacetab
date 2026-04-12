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

/**
 * Save button reference for the add-bookmark modal.
 */
let modalSave;

/**
 * Shared editor instance used by the add-bookmark modal.
 */
let editor;

/**
 * Tab controller for the add-bookmark modal.
 */
let tabs;

/**
 * Working draft for the bookmark being created.
 */
let bookmarkDraft = {};

/**
 * Prevents duplicate submissions while the modal is saving.
 */
let submitting = false;

/**
 * Advanced options toggle controls.
 */
let advancedToggle;
let advancedPanel;

/**
 * Cached DOM references used during reset/cleanup flows.
 */
let urlClearBtn;
let urlInput;
let backgroundImage;

/* =====================================================
   INIT
===================================================== */

/**
 * Initializes the add-bookmark modal.
 *
 * Responsibilities:
 * - resolve modal DOM elements
 * - initialize tabs
 * - create the bookmark editor
 * - wire modal actions and keyboard behavior
 * - register the modal with the modal manager
 */
export function initAddBookmark() {
  const addBookmarkModal = document.getElementById('add-bookmark-modal');
  modalSave = document.getElementById('add-bookmark-modal-save');

  /**
   * Initializes the inner tabs used by the bookmark editor.
   */
  tabs = initTabs({
    root: addBookmarkModal,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  tabs.activate('add-bookmark-tab-style');

  /**
   * Advanced options section controls.
   */
  advancedToggle = addBookmarkModal.querySelector('#add-bookmark-advanced-toggle');
  advancedPanel = addBookmarkModal.querySelector('#add-bookmark-advanced');

  /**
   * Collect all editor-related DOM references in a single object
   * to pass them into the bookmark editor factory.
   */
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

  /**
   * Cache a few frequently reused elements for reset flows.
   */
  urlClearBtn = elements.urlClearBtn;
  urlInput = elements.url;
  backgroundImage = elements.backgroundImage;

  /**
   * Start from the current bookmark default settings.
   */
  const { data: { settings } } = getState();
  bookmarkDraft = structuredClone(settings.bookmarkDefault);

  /**
   * Create the editor used to manage the modal form state and live preview.
   */
  editor = createBookmarkEditor({
    elements,
    bookmark: bookmarkDraft,
    onChange: () => updateSaveButtonState()
  });

  /**
   * Wire modal action buttons.
   */
  modalSave.addEventListener('click', handleAccept);

  addBookmarkModal
    .querySelector('#add-bookmark-modal-cancel')
    .addEventListener('click', handleCancel);

  /* =====================================================
     ADVANCED TOGGLE
  ===================================================== */

  /**
   * Toggles visibility of the advanced options panel.
   */
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

  /**
   * Register the add-bookmark modal with the modal manager.
   *
   * Shortcut behavior:
   * - Enter opens the add-bookmark modal
   */
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

  /**
   * Submits the modal on Enter and prevents the event
   * from bubbling into the generic modal manager flow.
   */
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

/**
 * Opens the add-bookmark modal with a fresh bookmark draft.
 *
 * On open:
 * - reset bookmark fields that should start empty
 * - sync the editor state
 * - reset tabs and advanced panel visibility
 * - open the modal with accept/cancel handlers
 */
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

/**
 * Updates the save button state based on the current editor data.
 *
 * The bookmark can only be saved when it has a non-empty name.
 */
function updateSaveButtonState() {
  const state = editor.getState();
  const hasName = state.name?.trim().length > 0;

  modalSave.disabled = !hasName;
  modalSave.classList.toggle('is-disabled', !hasName);
}

/* =====================================================
   ACCEPT
===================================================== */

/**
 * Handles bookmark creation.
 *
 * Flow:
 * - prevent duplicate submissions
 * - validate required fields
 * - find the first available grid position
 * - create the bookmark
 * - show feedback and close the modal
 */
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

    /**
     * Determine the visible grid bounds used to search
     * for the first free 1x1 placement slot.
     */
    const maxRows = getMaxVisibleRows();
    const maxCols = getMaxVisibleCols();

    let gx = 0;
    let gy = 0;
    let placed = false;

    /**
     * Find the first available area in column/row order.
     */
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

    /**
     * If there is no available slot, close the modal first
     * and then show an informational alert.
     */
    if (!placed) {
      closeModal();

      await new Promise(requestAnimationFrame);

      await showAlert(
        t('alert.bookmarks.no_space'),
        { type: 'info' }
      );

      return;
    }

    /**
     * Create the bookmark using the cleaned values and resolved position.
     */
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

    /**
     * Clear the background image input after submission flow completes.
     */
    if (backgroundImage) backgroundImage.value = '';
  }
}

/**
 * Restores the add-bookmark form to a clean state
 * based on the current bookmark default settings.
 */
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

/**
 * Handles modal cancellation.
 *
 * If the user confirms the action, the form is reset
 * and the modal is closed.
 *
 * @returns {Promise<boolean|undefined>}
 */
async function handleCancel() {
  const ok = await showAlert(
    t('alert.bookmark.add.cancel'),
    { type: 'confirm' }
  );

  if (!ok) return false;

  resetAddBookmarkForm();
  closeModal();
}