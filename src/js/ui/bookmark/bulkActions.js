import {
  applyPresetToBookmarks,
  deleteBookmarksByIds,
  duplicateBookmarksByIds
} from '../../core/bookmark.js';
import { moveBookmarksToGroup } from '../../core/bookmarkGroups.js';
import { subscribe } from '../../core/store.js';
import { t } from '../../core/i18n.js';
import { showAlert } from '../modals/alert.js';
import { flashSuccess } from '../flash.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import {
  clearBookmarkSelection,
  getSelectedBookmarkIds,
  pruneBookmarkSelection,
  subscribeToBookmarkSelection
} from './selection.js';

export function initBulkBookmarkActions() {
  const toolbar = document.getElementById('bulk-actions');
  const count = document.getElementById('bulk-selection-count');
  const groupSelect = document.getElementById('bulk-workspace-select');
  let currentState = null;

  document.getElementById('bulk-clear').addEventListener('click', clearBookmarkSelection);
  document.getElementById('bulk-apply-preset').addEventListener('click', () => {
    const ids = getSelectedBookmarkIds();
    if (!ids.length) return;
    applyPresetToBookmarks(ids, currentState.data.settings.bookmarkDefault);
    clearBookmarkSelection();
    flashSuccess('flash.bookmarks.presetApplied');
  });
  document.getElementById('bulk-duplicate').addEventListener('click', async () => {
    const ids = getSelectedBookmarkIds();
    if (!ids.length) return;

    const result = duplicateBookmarksByIds(ids, {
      columns: getMaxVisibleCols(),
      rows: getMaxVisibleRows(),
      nameSuffix: t('bookmarkActions.copySuffix')
    });
    clearBookmarkSelection();

    if (result.duplicates.length) flashSuccess('flash.bookmarks.duplicatedSelected');
    if (result.skipped) {
      await showAlert(t('alert.bookmarks.duplicateNoSpace', { count: result.skipped }), {
        type: 'info'
      });
    }
  });
  document.getElementById('bulk-delete').addEventListener('click', async () => {
    const ids = getSelectedBookmarkIds();
    if (!ids.length) return;
    const confirmed = await showAlert(
      t('alert.bookmarks.confirmDeleteSelected', { count: ids.length }),
      { type: 'confirm' }
    );
    if (!confirmed) return;
    deleteBookmarksByIds(ids);
    clearBookmarkSelection();
    flashSuccess('flash.bookmarks.deletedSelected');
  });
  groupSelect.addEventListener('change', async () => {
    const ids = getSelectedBookmarkIds();
    if (!ids.length) return;
    const result = moveBookmarksToGroup(ids, groupSelect.value || null, {
      columns: getMaxVisibleCols(),
      rows: getMaxVisibleRows()
    });
    clearBookmarkSelection();
    if (result.moved) flashSuccess('flash.bookmarks.moved');
    if (result.skipped) {
      await showAlert(t('alert.bookmarks.moveNoSpace', { count: result.skipped }), {
        type: 'info'
      });
    }
  });

  subscribe(state => {
    currentState = state;
    pruneBookmarkSelection(state.data.bookmarks.map(bookmark => bookmark.id));
    groupSelect.replaceChildren(new Option(t('workspace.main'), ''));
    for (const group of state.data.settings.bookmarkGroups) {
      groupSelect.add(new Option(group.name, group.id));
    }
    groupSelect.value = state.data.settings.activeBookmarkGroupId ?? '';
  });

  subscribeToBookmarkSelection(ids => {
    const selected = new Set(ids);
    document.querySelectorAll('.bookmark[data-bookmark-id]').forEach(element => {
      const isSelected = selected.has(element.dataset.bookmarkId);
      element.classList.toggle('is-selected', isSelected);
      const toggle = element.querySelector('.bookmark-select-toggle');
      toggle?.setAttribute('aria-pressed', String(isSelected));
      toggle?.setAttribute('aria-label', t(
        isSelected ? 'bookmarkActions.deselect' : 'bookmarkActions.select'
      ));
    });
    toolbar.classList.toggle('is-hidden', ids.length === 0);
    count.textContent = t('bulk.selected', { count: ids.length });
  });
}
