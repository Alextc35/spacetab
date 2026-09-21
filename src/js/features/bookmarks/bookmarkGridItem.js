import { createBookmarkElement } from './bookmarkCard.js';
import { addBookmarkActions } from '../../ui/bookmark/actions.js';
import { addDragAndResize } from '../../ui/bookmark/dragResize.js';
import { isGridKeyboardActive } from '../../ui/bookmark/gridKeyboardNavigation.js';
import { createListItem } from '../../ui/bookmark/listView.js';
import { isBookmarkSelected } from '../../ui/bookmark/selection.js';
import { applyGridItemPosition } from '../../ui/gridItemLayout.js';
import { getActiveWorkspaceId } from '../workspaces/workspaceSelectors.js';

export const bookmarkGridItem = Object.freeze({
  type: 'bookmark',
  order: { grid: 10, list: 30 },
  selector: '.bookmark[data-bookmark-id]',
  getElementId: element => element.dataset.bookmarkId,
  select: state => state.data.bookmarks
    .filter(bookmark => !bookmark.folderId
      && (bookmark.groupId ?? null) === getActiveWorkspaceId(state.data)),
  render({ view, container, item, state }) {
    if (view === 'list') {
      return createListItem(item, {
        active: isGridKeyboardActive(item.id)
      });
    }

    const element = createBookmarkElement(item, { isEditing: state.ui.isEditing });
    element.dataset.bookmarkId = item.id;
    element.classList.toggle('is-selected', isBookmarkSelected(item.id));
    element.classList.toggle('is-keyboard-active', isGridKeyboardActive(item.id));
    applyGridItemPosition(container, element, item);
    if (state.ui.isEditing) enableBookmarkEditing(container, element, item);
    element.addEventListener('click', event => {
      if (!element.classList.contains('is-editing')) return;
      event.preventDefault();
      event.stopPropagation();
    });
    return element;
  },
  enableEditing: enableBookmarkEditing
});

export function enableBookmarkEditing(container, element, bookmark) {
  if (element.dataset.editingControlsAttached === 'true') return;
  element.dataset.editingControlsAttached = 'true';
  element.classList.add('is-editing');
  element.querySelector('.bookmark-link')?.classList.add('is-editing');
  addBookmarkActions(element, bookmark);
  addDragAndResize(container, element, bookmark);
}
