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
  const menu = document.createElement('div');
  menu.className = 'bookmark-action-menu';

  const toggle = document.createElement('button');
  toggle.className = `bookmark-actions-toggle ${themeClass}`;
  toggle.type = 'button';
  toggle.textContent = '•••';
  toggle.setAttribute('aria-label', t('bookmarkActions.openMenu'));

  const actions = document.createElement('div');
  actions.className = 'bookmark-actions';
  actions.id = `bookmark-actions-${bookmark.id}`;
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('bookmarkActions.menuLabel'));
  toggle.setAttribute('aria-controls', actions.id);

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
  actions.append(editBtn, delBtn, selectBtn, duplicateBtn);
  menu.append(toggle, actions);
  container.append(menu);
  initBookmarkActionMenu(container, menu, toggle, actions);
}

function initBookmarkActionMenu(container, menu, toggle, actions) {
  let isPinned = false;
  let closeTimer = null;

  const setOpen = open => {
    menu.classList.toggle('is-open', open);
    container.classList.toggle('has-open-actions', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-pressed', String(isPinned));
    actions.setAttribute('aria-hidden', String(!open));
    actions.toggleAttribute('inert', !open);
  };

  const openTemporarily = () => {
    clearTimeout(closeTimer);
    setOpen(true);
  };

  const scheduleClose = () => {
    clearTimeout(closeTimer);
    if (isPinned) return;

    closeTimer = setTimeout(() => {
      if (!menu.matches(':hover') && !menu.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 140);
  };

  menu.addEventListener('mouseenter', openTemporarily);
  menu.addEventListener('mouseleave', scheduleClose);
  menu.addEventListener('focusin', openTemporarily);
  menu.addEventListener('focusout', event => {
    if (!menu.contains(event.relatedTarget)) scheduleClose();
  });

  toggle.addEventListener('click', event => {
    event.stopPropagation();
    isPinned = !isPinned;
    setOpen(true);

    if (!isPinned) {
      toggle.blur();
      scheduleClose();
    }
  });

  menu.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    isPinned = false;
    if (menu.contains(document.activeElement)) document.activeElement.blur();
    setOpen(false);
  });

  setOpen(false);
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
