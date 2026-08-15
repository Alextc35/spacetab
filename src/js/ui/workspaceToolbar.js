import {
  createBookmarkGroup,
  deleteBookmarkGroup,
  setActiveBookmarkGroup
} from '../core/bookmarkGroups.js';
import { getState, redoBookmarks, subscribe, undoBookmarks } from '../core/store.js';
import { t } from '../core/i18n.js';
import { flash } from './flash.js';
import { showAlert, showPrompt } from './modals/alert.js';
import { openSearchModal } from './modals/searchModal.js';
import { clearBookmarkSelection } from './bookmark/selection.js';

export function initWorkspaceToolbar() {
  const select = document.getElementById('workspace-select');
  const addButton = document.getElementById('workspace-add');
  const deleteButton = document.getElementById('workspace-delete');
  const undoButton = document.getElementById('history-undo');
  const redoButton = document.getElementById('history-redo');

  document.getElementById('search-bookmarks').addEventListener('click', openSearchModal);

  select.addEventListener('change', () => {
    clearBookmarkSelection();
    setActiveBookmarkGroup(select.value || null);
  });
  addButton.addEventListener('click', async () => {
    const name = await showPrompt(t('workspace.prompt'), {
      placeholder: t('workspace.namePlaceholder')
    });
    if (name) createBookmarkGroup(name);
  });
  deleteButton.addEventListener('click', async () => {
    if (!select.value) return;
    const { bookmarks, folders, settings } = getState().data;
    const group = settings.bookmarkGroups.find(item => item.id === select.value);
    if (!group) return;

    const bookmarkCount = bookmarks.filter(bookmark => bookmark.groupId === group.id).length;
    const folderCount = folders.filter(folder => folder.groupId === group.id).length;
    const confirmed = await showAlert(t('workspace.confirmDelete', {
      name: group.name,
      bookmarkCount,
      folderCount
    }), { type: 'confirm' });
    if (confirmed) deleteBookmarkGroup(select.value);
  });
  undoButton.addEventListener('click', async () => {
    if (await undoBookmarks()) flash(t('flash.history.undone'), 'info', 1000);
  });
  redoButton.addEventListener('click', async () => {
    if (await redoBookmarks()) flash(t('flash.history.redone'), 'info', 1000);
  });

  subscribe(state => {
    const { bookmarkGroups, activeBookmarkGroupId } = state.data.settings;
    const selected = activeBookmarkGroupId ?? '';
    select.replaceChildren(new Option(t('workspace.main'), ''));
    for (const group of bookmarkGroups) select.add(new Option(group.name, group.id));
    select.value = selected;
    deleteButton.disabled = !selected;
    undoButton.disabled = !state.ui.history.canUndo;
    redoButton.disabled = !state.ui.history.canRedo;
  });

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    event.preventDefault();
    (event.shiftKey ? redoButton : undoButton).click();
  });
}
