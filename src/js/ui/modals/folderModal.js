import {
  removeBookmarkFromFolder
} from '../../core/bookmarkFolders.js';
import { t } from '../../core/i18n.js';
import { getState, subscribe } from '../../core/store.js';
import { createFavicon } from '../bookmark/favicon.js';
import { flashSuccess } from '../flash.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { closeModal, openModal, registerModal } from '../modalManager.js';
import { openEditBookmark } from './bookmarkModal.js';
import { showAlert } from './alert.js';

let initialized = false;
let activeFolderId = null;
let modal;
let title;
let summary;
let list;
let empty;

export function initFolderModal() {
  if (initialized) return;
  initialized = true;

  modal = document.getElementById('folder-modal');
  title = document.getElementById('folder-modal-title');
  summary = document.getElementById('folder-modal-summary');
  list = document.getElementById('folder-modal-items');
  empty = document.getElementById('folder-modal-empty');

  document.getElementById('folder-modal-close').addEventListener('click', closeFolderModal);
  registerModal({
    id: 'folder',
    element: modal,
    closeOnEsc: true,
    closeOnOverlay: true
  });

  subscribe(() => {
    if (activeFolderId) renderFolderContents();
  });
}

export function openFolderModal(folderId) {
  const folder = getState().data.folders.find(item => item.id === folderId);
  if (!folder) return;

  activeFolderId = folderId;
  renderFolderContents();
  openModal('folder', { onCancel: closeFolderModal });
}

function closeFolderModal() {
  activeFolderId = null;
  closeModal();
}

function renderFolderContents() {
  const { bookmarks, folders } = getState().data;
  const folder = folders.find(item => item.id === activeFolderId);
  if (!folder) {
    if (activeFolderId) closeFolderModal();
    return;
  }

  const contents = bookmarks.filter(bookmark => bookmark.folderId === folder.id);
  title.textContent = folder.name;
  summary.textContent = t('folder.summary', { count: contents.length });
  list.replaceChildren();
  empty.classList.toggle('is-hidden', contents.length > 0);

  for (const bookmark of contents) {
    list.append(createFolderBookmarkItem(bookmark));
  }
}

function createFolderBookmarkItem(bookmark) {
  const item = document.createElement('li');
  item.className = 'folder-bookmark-item';

  const link = document.createElement('a');
  link.className = 'folder-bookmark-link';
  link.href = bookmark.url || '#';
  const favicon = createFavicon(bookmark);
  favicon.alt = '';

  const copy = document.createElement('span');
  copy.className = 'folder-bookmark-copy';
  const name = document.createElement('strong');
  name.textContent = bookmark.name;
  const url = document.createElement('small');
  url.textContent = bookmark.url || t('search.noUrl');
  copy.append(name, url);
  link.append(favicon, copy);

  const actions = document.createElement('span');
  actions.className = 'folder-bookmark-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'folder-item-action';
  edit.textContent = '✎';
  edit.setAttribute('aria-label', t('folder.actions.editBookmark', {
    name: bookmark.name
  }));
  edit.addEventListener('click', () => {
    closeFolderModal();
    requestAnimationFrame(() => openEditBookmark(bookmark.id));
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'folder-item-action folder-item-remove';
  remove.textContent = '↗';
  remove.setAttribute('aria-label', t('folder.actions.removeBookmark', {
    name: bookmark.name
  }));
  remove.addEventListener('click', async () => {
    const result = removeBookmarkFromFolder(bookmark.id, {
      columns: getMaxVisibleCols(),
      rows: getMaxVisibleRows()
    });
    if (result.reason === 'no-space') {
      await showAlert(t('folder.removeNoSpace'), { type: 'info' });
      return;
    }
    if (result.bookmark) {
      flashSuccess('flash.folder.bookmarkRemoved');
      renderFolderContents();
    }
  });

  actions.append(edit, remove);
  item.append(link, actions);
  return item;
}
