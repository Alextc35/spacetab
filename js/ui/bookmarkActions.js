import '../types/types.js'; // typedefs
import { deleteBookmarkById, clearBookmarks } from '../core/bookmark.js';
import { t } from '../core/i18n.js';
import { showAlert } from './modals/alertModal.js';
import { openModal } from './modals/editBookmarkModal.js';
import { isVisuallyDark } from './bookmarkUtils.js';
import { flashSuccess, flashError } from './flash.js';

/**
 * Adds edit and delete action buttons to a bookmark element.
 *
 * The button theme adapts automatically based on the bookmark's
 * perceived visual brightness.
 *
 * @param {HTMLElement} container - The bookmark DOM element.
 * @param {Bookmark} bookmark - The bookmark data object.
 * @returns {void}
 */
export function addEditDeleteButtons(container, bookmark) {
  const themeClass = isVisuallyDark(bookmark) ? 'is-dark' : 'is-light';

  const editBtn = createButton('✎', 'edit', themeClass, () => {
    openModal(bookmark.id);
  });

  const delBtn = createButton('🗑', 'delete', themeClass, () => {
    confirmAndDeleteBookmark(bookmark);
  });

  container.append(editBtn, delBtn);
}

/**
 * Creates a styled bookmark action button.
 *
 * @param {string} text - Button label or icon.
 * @param {string} type - Action type (e.g. "edit", "delete").
 * @param {string} themeClass - CSS class representing visual theme.
 * @param {() => void} onClick - Click handler function.
 * @returns {HTMLButtonElement} The created button element.
 */
function createButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `bookmark-btn ${type} ${themeClass}`;
  btn.textContent = text;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

/**
 * Deletes all bookmarks after user confirmation.
 *
 * Displays a confirmation modal before clearing all data.
 * Shows a flash message depending on the result.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function deleteAllBookmarks() {
  const ok = await showAlert(
    t('alert.bookmarks.confirmDeleteAll'),
    { type: 'confirm' }
  );

  if (!ok) return;

  const deleted = clearBookmarks();
  if (deleted) {
    flashSuccess('flash.bookmarks.deletedAll');
  } else {
    flashError('flash.bookmarks.deleteAllError');
  }
}

/**
 * Confirms and deletes a specific bookmark.
 *
 * Shows a confirmation modal including the bookmark name.
 * Displays a flash message depending on the deletion result.
 *
 * @async
 * @param {Bookmark} bookmark - The bookmark to delete.
 * @returns {Promise<void>}
 */
export async function confirmAndDeleteBookmark(bookmark) {
  if (!bookmark) return;

  const ok = await showAlert(
    t('alert.bookmark.confirmDelete', { name: bookmark.name }),
    { type: 'confirm' }
  );

  if (!ok) return;

  const deleted = deleteBookmarkById(bookmark.id);
  if (deleted) {
    flashSuccess('flash.bookmark.deleted');
  } else {
    flashError('flash.bookmark.deleteError');
  }
}