import { deleteBookmarkById, clearBookmarks } from '../core/bookmark.js';
import { t } from '../core/i18n.js';
import { showAlert } from './modals/alertModal.js';
import { openModal } from './modals/editBookmarkModal.js';
import { flashSuccess, flashError } from './flash.js';
import { isVisuallyDark } from './bookmarkUtils.js';

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

function createButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `bookmark-btn ${type} ${themeClass}`;
  btn.textContent = text;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

export async function deleteAllBookmarks() {
  const ok = await showAlert(
    t('alert.bookmarks.confirmDeleteAll'),
    { type: 'confirm' }
  );

  if (!ok) return;

  try {
    clearBookmarks();
    flashSuccess('flash.bookmarks.deletedAll');
  } catch (err) {
    console.error(err);
    flashError('flash.bookmarks.deleteAllError');
  }
}

export async function confirmAndDeleteBookmark(bookmark) {
  if (!bookmark) return;

  const message = t('alert.bookmark.confirmDelete', { name: bookmark.name });
  const confirmed = await showAlert(message, { type: 'confirm' });
  if (!confirmed) return;

  const deleted = deleteBookmarkById(bookmark.id);
  if (deleted) {
    flashSuccess('flash.bookmark.deleted');
  } else {
    flashError('flash.bookmark.deleteError');
  }
}