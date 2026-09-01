import { t } from '../../core/i18n.js';
import { applyGridItemPosition } from '../gridItemLayout.js';
import { addDragAndResize } from '../bookmark/dragResize.js';
import { openFolderModal } from '../modals/folderModal.js';
import { addFolderActions } from './actions.js';
import { applyFolderAppearance, createFolderVisual } from './visual.js';

/** Creates a resizable folder card for the bookmark grid. */
export function createFolderElement({ container, folder, bookmarks, isEditing }) {
  const element = document.createElement('div');
  element.className = 'bookmark bookmark-folder';
  element.dataset.folderId = folder.id;
  element.classList.toggle('is-editing', isEditing);
  applyFolderAppearance(element, folder);
  applyGridItemPosition(container, element, folder);

  const button = document.createElement('button');
  button.className = 'folder-open';
  button.type = 'button';
  button.setAttribute('aria-label', t('folder.open', {
    name: folder.name,
    count: bookmarks.length
  }));

  const visual = createFolderVisual(folder, bookmarks);

  const title = document.createElement('span');
  title.className = 'folder-title';
  title.textContent = folder.name;

  const count = document.createElement('span');
  count.className = 'folder-count';
  count.textContent = t('folder.count', { count: bookmarks.length });

  const caption = document.createElement('span');
  caption.className = 'folder-caption';
  caption.append(title, count);

  const dropFeedback = document.createElement('span');
  dropFeedback.className = 'folder-drop-feedback';
  dropFeedback.textContent = t('folder.dropHint');

  button.append(visual, caption, dropFeedback);
  button.addEventListener('click', event => {
    if (element.dataset.suppressFolderOpen === 'true') {
      event.preventDefault();
      return;
    }
    openFolderModal(folder.id);
  });
  element.append(button);

  if (isEditing) {
    enableFolderEditing(container, element, folder);
  }

  return element;
}

/** Adds controls and interactions which only exist while the grid is editable. */
export function enableFolderEditing(container, element, folder) {
  if (element.dataset.editingControlsAttached === 'true') return;

  element.dataset.editingControlsAttached = 'true';
  addFolderActions(element, folder);
  addDragAndResize(container, element, folder, { kind: 'folder' });
}
