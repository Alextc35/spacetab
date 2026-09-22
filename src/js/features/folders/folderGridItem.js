import { isGridKeyboardActive } from '../../ui/bookmark/gridKeyboardNavigation.js';
import { createListItem } from '../../ui/bookmark/listView.js';
import { getActiveWorkspaceId } from '../workspaces/workspaceSelectors.js';
import { createFolderElement, enableFolderEditing } from './folderCard.js';
import { openFolderModal } from './folderModal.js';

export const folderGridItem = Object.freeze({
  type: 'folder',
  order: { grid: 20, list: 20 },
  selector: '.bookmark-folder[data-folder-id]',
  getElementId: element => element.dataset.folderId,
  select(state) {
    const bookmarksByFolderId = new Map();
    for (const bookmark of state.data.bookmarks) {
      if (!bookmark.folderId) continue;
      const contents = bookmarksByFolderId.get(bookmark.folderId) ?? [];
      contents.push(bookmark);
      bookmarksByFolderId.set(bookmark.folderId, contents);
    }
    return state.data.folders
      .filter(folder => (folder.groupId ?? null) === getActiveWorkspaceId(state.data))
      .map(item => ({ item, bookmarks: bookmarksByFolderId.get(item.id) ?? [] }));
  },
  render({ view, container, item, bookmarks, state }) {
    if (view === 'list') {
      return createListItem(item, {
        folder: true,
        count: bookmarks.length,
        active: isGridKeyboardActive(item.id),
        onOpen: () => openFolderModal(item.id)
      });
    }
    return createFolderElement({
      container,
      folder: item,
      bookmarks,
      isEditing: state.ui.isEditing
    });
  },
  enableEditing: enableFolderEditing
});
