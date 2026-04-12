import { createBookmarkEditor } from '../bookmark/editor.js';
import { updateBookmarkById } from '../../core/bookmark.js';
import { flashSuccess } from '../flash.js';
import { registerModal, openModal as openManagedModal, closeModal } from '../modalManager.js';
import { getState } from '../../core/store.js';
import { showAlert } from './alert.js';
import { t } from '../../core/i18n.js';
import { initTabs } from '../tabs.js';

/**
 * Root element for the edit bookmark modal.
 */
const editModal = document.getElementById('edit-bookmark-modal');

/**
 * Main form fields.
 */
const modalName = document.getElementById('edit-bookmark-modal-name');
const modalUrl = document.getElementById('edit-bookmark-modal-url');

/**
 * URL lockable input controls.
 */
const modalUrlToggleBtn = document.getElementById('edit-modal-toggle-url');
const modalUrlCopyBtn = document.getElementById('edit-modal-copy-url');
const modalUrlClearBtn = document.getElementById('edit-modal-clear-url');

/**
 * Bookmark appearance toggles.
 */
const modalInvertColorIcon = document.getElementById('edit-bookmark-modal-invert-color-icon');
const modalInvertColorBg = document.getElementById('edit-bookmark-modal-invert-color-bg');

const modalBackgroundColor = document.getElementById('edit-bookmark-modal-background-color');
const modalNoBackground = document.getElementById('edit-bookmark-modal-no-background');

const modalTextColor = document.getElementById('edit-bookmark-modal-text-color');
const modalShowText = document.getElementById('edit-bookmark-modal-show-text');

const modalShowFavicon = document.getElementById('edit-bookmark-modal-show-favicon');

/**
 * Background image controls.
 */
const modalBackgroundImage = document.getElementById('edit-bookmark-modal-background-image');

const modalBgToggleBtn = document.getElementById('edit-modal-toggle-background-image');
const modalBgCopyBtn = document.getElementById('edit-modal-copy-background-image');
const modalBgClearBtn = document.getElementById('edit-modal-clear-background-image');

const modalBackgroundFavicon = document.getElementById('edit-bookmark-modal-background-favicon');

/**
 * Modal action buttons.
 */
const modalSave = document.getElementById('edit-bookmark-modal-save');
const modalCancel = document.getElementById('edit-bookmark-modal-cancel');

/**
 * Live preview container used by the bookmark editor.
 */
const previewContainer = document.getElementById('edit-bookmark-modal-preview');

/**
 * Currently edited bookmark id.
 */
let editingId = null;

/**
 * Active bookmark editor instance.
 */
let editor = null;

/**
 * Snapshot of the initial bookmark state when the modal opens.
 * Used for change detection.
 */
let initialSnapshot = null;

/**
 * Prevents modal initialization from running more than once.
 */
let registered = false;

/**
 * Tab controller for the edit modal.
 */
let tabs;

/* =====================================
   Helpers
===================================== */

/**
 * Returns the current editor state.
 *
 * Falls back to an empty object when the editor is not available.
 *
 * @returns {Object}
 */
function getCurrentFormState() {
  return editor?.getState() ?? {};
}

/**
 * Returns whether the current form state differs from the initial snapshot.
 *
 * @returns {boolean}
 */
function hasChanges() {
  return JSON.stringify(getCurrentFormState()) !== JSON.stringify(initialSnapshot);
}

/**
 * Updates the save button state depending on whether the form changed.
 *
 * The save button is hidden and disabled when there are no changes.
 */
function updateSaveButtonState() {
  const changed = hasChanges();

  modalSave.disabled = !changed;
  modalSave.classList.toggle('is-hidden', !changed);
}

/**
 * Resets the scroll position of the currently visible tab content.
 */
function resetTabScroll() {
  const activeTab = editModal.querySelector('.edit-bookmark-modal-tab-content[style*="flex"]');
  if (activeTab) activeTab.scrollTop = 0;
}

/* =====================================
   Init Modal
===================================== */

/**
 * Initializes the edit bookmark modal once.
 *
 * Responsibilities:
 * - initialize tab navigation
 * - register the modal with the modal manager
 */
export function initEditBookmark() {
  if (registered) return;
  registered = true;

  tabs = initTabs({
    root: editModal,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  registerModal({
    id: 'edit-bookmark',
    element: editModal,
    acceptOnEnter: false,
    closeOnEsc: false,
    closeOnOverlay: false,
    initialFocus: modalName
  });
}

/* =====================================
   Open Modal
===================================== */

/**
 * Opens the edit bookmark modal for the given bookmark id.
 *
 * Flow:
 * - resolve the bookmark from store state
 * - destroy any previous editor instance
 * - create a fresh editor bound to the selected bookmark
 * - capture the initial snapshot for change detection
 * - reset UI state and open the modal
 *
 * @param {string} bookmarkId
 */
export function openModal(bookmarkId) {
  const state = getState();
  const bookmark = state.data.bookmarks.find(b => b.id === bookmarkId);
  if (!bookmark) return;

  editingId = bookmarkId;

  /**
   * Destroy the previous editor instance before creating a new one
   * to avoid stale state or duplicated bindings.
   */
  if (editor?.destroy) editor.destroy();

  editor = createBookmarkEditor({
    bookmark: structuredClone(bookmark),
    elements: {
      preview: previewContainer,
      name: modalName,
      url: modalUrl,
      backgroundColor: modalBackgroundColor,
      backgroundImage: modalBackgroundImage,
      backgroundFavicon: modalBackgroundFavicon,
      noBackground: modalNoBackground,
      invertBg: modalInvertColorBg,
      showText: modalShowText,
      textColor: modalTextColor,
      showFavicon: modalShowFavicon,
      invertIcon: modalInvertColorIcon,
      urlToggleBtn: modalUrlToggleBtn,
      urlCopyBtn: modalUrlCopyBtn,
      urlClearBtn: modalUrlClearBtn,
      bgToggleBtn: modalBgToggleBtn,
      bgCopyBtn: modalBgCopyBtn,
      bgClearBtn: modalBgClearBtn
    },
    onChange: updateSaveButtonState
  });

  initialSnapshot = editor.getState();
  updateSaveButtonState();
  tabs.activate('edit-bookmark-modal-tab-general');
  resetTabScroll();
  openManagedModal('edit-bookmark');
}

/* =====================================
   Save
===================================== */

/**
 * Saves the edited bookmark.
 *
 * Flow:
 * - read the current editor state
 * - persist changes by bookmark id
 * - show success feedback
 * - clear the snapshot
 * - close the modal
 */
modalSave.addEventListener('click', () => {
  if (!editingId) return;

  const updatedData = editor.getState();

  const bookmark = updateBookmarkById(editingId, updatedData);

  if (bookmark) {
    flashSuccess('flash.bookmark.updated');
  }

  initialSnapshot = null;

  closeEditModal();
});

/* =====================================
   Cancel
===================================== */

/**
 * Handles modal cancellation.
 *
 * Behavior:
 * - closes immediately if nothing changed
 * - otherwise asks for confirmation before discarding edits
 */
modalCancel.addEventListener('click', async () => {
  if (!hasChanges()) {
    closeEditModal();
    return;
  }

  const ok = await showAlert(
    t('alert.bookmark.cancel'),
    { type: 'confirm' }
  );

  if (ok) closeEditModal();
});

/**
 * Closes the edit bookmark modal and clears editor state.
 */
function closeEditModal() {
  editingId = null;

  if (editor?.destroy) editor.destroy();
  editor = null;

  closeModal();
}