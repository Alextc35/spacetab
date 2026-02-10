/**
 * editBookmarkModal.js
 * ------------------------------------------------------
 * Modal for editing existing bookmarks.
 *
 * Responsibilities:
 * - Display and populate an edit form for a bookmark
 * - Reflect current bookmark visual and layout options
 * - Enforce UI state constraints between fields
 * - Persist updates through the bookmark store
 * - Integrate with modalManager for keyboard and focus handling
 *
 * Notes:
 * - This modal operates on an existing bookmark id
 * - Enter key submission is disabled to avoid conflicts
 * - All state mutations go through updateBookmarkById
 * ------------------------------------------------------
 */

import { getBookmarks, updateBookmarkById } from '../core/bookmark.js';
import { flashSuccess } from './flash.js';
import { DEBUG } from '../core/config.js';
import { registerModal, openModal as openManagedModal, closeModal } from './modalManager.js';

const editModal = document.getElementById('edit-modal');
const modalName = document.getElementById('modal-name');
const modalUrl = document.getElementById('modal-url');
const modalInvertColorIcon = document.getElementById('modal-invert-color-icon');
const modalInvertColorBg = document.getElementById('modal-invert-color-bg');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');
const modalBookmarkColor = document.getElementById('modal-bookmark-color');
const modalNoBackground = document.getElementById('modal-no-background');
const modalTextColor = document.getElementById('modal-text-color');
const modalShowFavicon = document.getElementById('modal-show-favicon');
const modalShowText = document.getElementById('modal-show-text');
const modalBackgroundImage = document.getElementById('modal-background-image');
const modalFaviconBackground = document.getElementById('modal-favicon-background');

/**
 * Currently edited bookmark id.
 *
 * @type {string|null}
 */
let editingId = null;

/**
 * Callback used to re-render bookmarks after updates.
 *
 * Injected from outside to avoid tight coupling.
 *
 * @type {Function}
 */
let renderBookmarks = () => {};

/**
 * Prevents registering the modal more than once.
 *
 * @type {boolean}
 */
let registered = false;

/**
 * Initializes the Edit Bookmark modal.
 *
 * Responsibilities:
 * - Store render callback
 * - Register modal with modalManager
 * - Ensure idempotent initialization
 *
 * @param {Function} onRender
 */
export function initBookmarkModal(onRender) {
  renderBookmarks = onRender;

  if (registered) return;
  registered = true;

  registerModal({
    id: 'edit-bookmark',
    element: editModal,
    acceptOnEnter: false,
    closeOnEsc: true,
    closeOnOverlay: true,
    initialFocus: modalName
  });

  if (DEBUG) console.log('EditBookmark modal initialized');
}

/**
 * Opens the edit modal for a specific bookmark.
 *
 * Loads the bookmark data into the form and
 * synchronizes UI states before displaying.
 *
 * @param {string} bookmarkId
 */
export function openModal(bookmarkId) {
  const bookmark = getBookmarks().find(b => b.id === bookmarkId);
  if (!bookmark) return;

  editingId = bookmarkId;

  modalName.value = bookmark.name;
  modalUrl.value = bookmark.url;
  modalInvertColorIcon.checked = !!bookmark.invertColorIcon;
  modalInvertColorBg.checked = !!bookmark.invertColorBg;
  modalBookmarkColor.value = bookmark.bookmarkColor;
  modalNoBackground.checked = !!bookmark.noBackground;
  modalTextColor.value = bookmark.textColor;
  modalShowText.checked = !!bookmark.showText;
  modalShowFavicon.checked = !!bookmark.showFavicon;
  modalBackgroundImage.value = bookmark.backgroundImageUrl || '';
  modalFaviconBackground.checked = !!bookmark.faviconBackground;

  updateStates();

  openManagedModal('edit-bookmark');
}

/**
 * Synchronizes enabled/disabled states between controls.
 *
 * Enforces visual consistency rules:
 * - Background image vs color
 * - Text visibility vs text color
 * - Favicon background exclusivity
 */
function updateStates() {
  const hasImage = modalBackgroundImage.value.trim() !== '';

  modalBookmarkColor.disabled = hasImage || modalNoBackground.checked;
  modalNoBackground.disabled = hasImage && !modalFaviconBackground.checked;
  modalTextColor.disabled = !modalShowText.checked;

  modalBackgroundImage.disabled = modalFaviconBackground.checked;
  modalShowFavicon.disabled = modalFaviconBackground.checked;

  modalInvertColorBg.disabled = modalFaviconBackground.checked;
}

modalBackgroundImage.addEventListener('input', updateStates);
modalNoBackground.addEventListener('change', updateStates);
modalShowText.addEventListener('change', updateStates);

modalFaviconBackground.addEventListener('change', () => {
  if (modalFaviconBackground.checked) {
    modalShowFavicon.checked = false;
    modalInvertColorBg.checked = false;
  }
  updateStates();
});

modalSave.addEventListener('click', async () => {
  if (!editingId) return;

  const updatedData = {
    name: modalName.value.trim(),
    url: modalUrl.value.trim(),
    invertColorIcon: modalInvertColorIcon.checked,
    invertColorBg: modalInvertColorBg.checked,
    noBackground: modalNoBackground.checked,
    textColor: modalTextColor.value,
    showText: modalShowText.checked,
    bookmarkColor: modalBookmarkColor.value
  };

  if (modalFaviconBackground.checked) {
    updatedData.faviconBackground = true;
    updatedData.backgroundImageUrl = null;
    updatedData.showFavicon = false;
    updatedData.invertColorBg = false;
  } else {
    updatedData.faviconBackground = false;
    updatedData.backgroundImageUrl =
      modalBackgroundImage.value.trim() || null;
    updatedData.showFavicon = modalShowFavicon.checked;
  }

  const bookmark = await updateBookmarkById(editingId, updatedData);

  flashSuccess('flash.bookmark.updated');
  if (DEBUG) console.log('Bookmark updated ', bookmark);

  renderBookmarks();
  closeEditModal();
});

modalCancel.addEventListener('click', closeEditModal);

/**
 * Closes the edit modal and clears editing state.
 */
function closeEditModal() {
  editingId = null;
  closeModal();
}