import '../../types/types.js'; // typedefs
import { clearBookmarks } from '../../features/bookmarks/bookmarkActions.js';
import { t } from '../../platform/i18n/i18n.js';
import { showConfirmWithCheckbox } from '../../shared/ui/alertModal.js';
import { closeModal } from '../../shared/ui/modalManager.js';
import { openEditBookmark } from '../../features/bookmarks/bookmarkModal.js';
import { isVisuallyDark } from './utils.js';
import { flashSuccess, flashError } from '../../shared/ui/flash.js';

/**
 * Adds the direct edit control to a bookmark element.
 *
 * The button theme adapts automatically based on the bookmark's
 * perceived visual brightness.
 *
 * @param {HTMLElement} container - The bookmark DOM element.
 * @param {Bookmark} bookmark - The bookmark data object.
 * @returns {void}
 */
export function addBookmarkActions(container, bookmark) {
  const themeClass = isVisuallyDark(bookmark) ? 'is-dark' : 'is-light';
  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('bookmarkActions.ariaLabel'));

  const editBtn = createItemActionButton('✎', 'edit', themeClass, () => {
    openEditBookmark(bookmark.id);
  });
  editBtn.setAttribute('aria-label', t('bookmarkActions.edit'));
  actions.append(editBtn);
  container.append(actions);
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
export function createItemActionButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `item-action-button ${type} ${themeClass}`;
  btn.type = 'button';
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
  const { confirmed, checkboxChecked: deleteFolders } = await showConfirmWithCheckbox(
    t('alert.bookmarks.confirmDeleteAll'),
    { checkboxLabel: t('alert.bookmarks.deleteFolders') }
  );

  if (!confirmed) return;

  const deleted = clearBookmarks({ includeFolders: deleteFolders });
  if (deleted) {
    flashSuccess(deleteFolders
      ? 'flash.bookmarks.deletedAllWithFolders'
      : 'flash.bookmarks.deletedAll');
    closeModal();
  } else {
    flashError('flash.bookmarks.deleteAllError');
  }
}
