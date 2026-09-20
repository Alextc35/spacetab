import {
  applyDefaultStylesToGridItems,
  duplicateGridItems,
  moveGridItemsToGroup
} from '../../core/gridItemActions.js';
import { moveGridItemsToRecycleBin } from '../../features/recycle-bin/recycleBinActions.js';
import { subscribe } from '../../core/store.js';
import { t } from '../../core/i18n.js';
import { showAlert } from '../modals/alert.js';
import { flashSuccess } from '../flash.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import {
  clearGridItemSelection,
  getSelectedGridItems,
  pruneGridItemSelection,
  subscribeToGridItemSelection
} from './selection.js';

export function initBulkBookmarkActions() {
  const toolbar = document.getElementById('bulk-actions');
  const count = document.getElementById('bulk-selection-count');
  const groupSelect = document.getElementById('bulk-workspace-select');
  let currentState = null;

  document.getElementById('bulk-clear').addEventListener('click', clearGridItemSelection);
  document.getElementById('bulk-apply-preset').addEventListener('click', () => {
    const items = getSelectedGridItems();
    if (!items.length) return;
    applyDefaultStylesToGridItems(items, currentState.data.settings.bookmarkDefault);
    clearGridItemSelection();
    flashSuccess('flash.bookmarks.presetApplied');
  });
  document.getElementById('bulk-duplicate').addEventListener('click', async () => {
    const items = getSelectedGridItems();
    if (!items.length) return;

    const result = duplicateGridItems(items, {
      columns: getMaxVisibleCols(),
      rows: getMaxVisibleRows(),
      nameSuffix: t('bookmarkActions.copySuffix')
    });
    clearGridItemSelection();

    if (result.duplicates.length) flashSuccess('flash.bookmarks.duplicatedSelected');
    if (result.skipped) {
      await showAlert(t('alert.bookmarks.duplicateNoSpace', { count: result.skipped }), {
        type: 'info'
      });
    }
  });
  document.getElementById('bulk-delete').addEventListener('click', async () => {
    const items = getSelectedGridItems();
    if (!items.length) return;
    const confirmed = await showAlert(
      getDeleteConfirmation(items, currentState.data),
      { type: 'confirm', requiresWideViewport: true }
    );
    if (!confirmed) return;
    moveGridItemsToRecycleBin(getSelectionIds(items));
    clearGridItemSelection();
    flashSuccess('flash.bookmarks.deletedSelected');
  });
  groupSelect.addEventListener('change', async () => {
    const items = getSelectedGridItems();
    if (!items.length) return;
    const result = moveGridItemsToGroup(items, groupSelect.value || null, {
      columns: getMaxVisibleCols(),
      rows: getMaxVisibleRows()
    });
    clearGridItemSelection();
    if (result.moved) flashSuccess('flash.bookmarks.moved');
    if (result.skipped) {
      await showAlert(t('alert.bookmarks.moveNoSpace', { count: result.skipped }), {
        type: 'info'
      });
    }
  });

  subscribe(state => {
    currentState = state;
    pruneGridItemSelection({
      bookmarkIds: state.data.bookmarks.map(bookmark => bookmark.id),
      folderIds: state.data.folders.map(folder => folder.id)
    });
    groupSelect.replaceChildren(new Option(t('workspace.main'), ''));
    for (const group of state.data.settings.bookmarkGroups) {
      groupSelect.add(new Option(group.name, group.id));
    }
    groupSelect.value = state.data.settings.activeBookmarkGroupId ?? '';
  });

  subscribeToGridItemSelection(items => {
    const selected = new Set(items.map(item => `${item.kind}:${item.id}`));
    document.querySelectorAll('.bookmark[data-bookmark-id]').forEach(element => {
      const isSelected = selected.has(`bookmark:${element.dataset.bookmarkId}`);
      element.classList.toggle('is-selected', isSelected);
    });
    document.querySelectorAll('.bookmark-folder[data-folder-id]').forEach(element => {
      const isSelected = selected.has(`folder:${element.dataset.folderId}`);
      element.classList.toggle('is-selected', isSelected);
    });
    toolbar.classList.toggle('is-hidden', items.length === 0);
    count.textContent = t('bulk.selected', { count: items.length });
  });
}

function getDeleteConfirmation(items, data) {
  if (items.length === 1) {
    const selected = items[0];
    const bookmark = selected.kind === 'bookmark'
      ? data.bookmarks.find(item => item.id === selected.id)
      : null;
    if (bookmark) {
      return t('alert.bookmark.confirmDelete', { name: bookmark.name });
    }
    const folder = selected.kind === 'folder'
      ? data.folders.find(item => item.id === selected.id)
      : null;
    if (folder) {
      const count = data.bookmarks.filter(bookmark => bookmark.folderId === folder.id).length;
      return t('folder.confirmDelete', { name: folder.name, count });
    }
  }

  return t('alert.bookmarks.confirmDeleteSelected', { count: items.length });
}

function getSelectionIds(items) {
  return {
    bookmarkIds: items.filter(item => item.kind === 'bookmark').map(item => item.id),
    folderIds: items.filter(item => item.kind === 'folder').map(item => item.id)
  };
}
