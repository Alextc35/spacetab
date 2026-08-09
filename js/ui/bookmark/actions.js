import '../../types/types.js'; // typedefs
import {
  clearBookmarks,
  deleteBookmarkById,
  duplicateBookmarkById
} from '../../core/bookmark.js';
import { findFirstFreeSlot } from '../../core/grid.js';
import { getState } from '../../core/store.js';
import { t } from '../../core/i18n.js';
import { showAlert } from '../modals/alert.js';
import { openEditBookmark } from '../modals/bookmarkModal.js';
import { isVisuallyDark } from './utils.js';
import { flashSuccess, flashError } from '../flash.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { toggleBookmarkSelection } from './selection.js';

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
    openEditBookmark(bookmark.id);
  });

  const duplicateBtn = createButton('⧉', 'duplicate', themeClass, async () => {
    await duplicateBookmark(bookmark);
  });

  const selectBtn = createButton('✓', 'select', themeClass, () => {
    const selected = toggleBookmarkSelection(bookmark.id);
    container.classList.toggle('is-selected', selected);
  });

  const delBtn = createButton('🗑', 'delete', themeClass, async () => {
    await confirmDeleteBookmark(bookmark);
  });

  editBtn.setAttribute('aria-label', t('bookmarkActions.edit'));
  duplicateBtn.setAttribute('aria-label', t('bookmarkActions.duplicate'));
  selectBtn.setAttribute('aria-label', t('bookmarkActions.select'));
  delBtn.setAttribute('aria-label', t('bookmarkActions.delete'));
  container.append(selectBtn, duplicateBtn, editBtn, delBtn);
}

async function duplicateBookmark(bookmark) {
  const bookmarks = getState().data.bookmarks.filter(
    item => (item.groupId ?? null) === (bookmark.groupId ?? null)
  );
  const position = findFirstFreeSlot(bookmarks, {
    columns: getMaxVisibleCols(),
    rows: getMaxVisibleRows(),
    w: bookmark.w,
    h: bookmark.h
  });

  if (!position) {
    await showAlert(t('alert.bookmarks.no_space'), { type: 'info' });
    return;
  }

  const duplicate = duplicateBookmarkById(
    bookmark.id,
    position,
    t('bookmarkActions.copySuffix')
  );
  if (duplicate) flashSuccess('flash.bookmark.duplicated');
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
export async function confirmDeleteBookmark(bookmark) {
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
