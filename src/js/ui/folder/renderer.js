import { t } from '../../core/i18n.js';
import { applyGridItemPosition } from '../gridItemLayout.js';
import { createFavicon } from '../bookmark/favicon.js';
import { addDragAndResize } from '../bookmark/dragResize.js';
import { openFolderModal } from '../modals/folderModal.js';
import { addFolderActions } from './actions.js';

/** Creates a resizable folder card for the bookmark grid. */
export function createFolderElement({ container, folder, bookmarks, isEditing }) {
  const element = document.createElement('div');
  element.className = 'bookmark bookmark-folder';
  element.dataset.folderId = folder.id;
  element.classList.toggle('is-editing', isEditing);
  applyGridItemPosition(container, element, folder);

  const button = document.createElement('button');
  button.className = 'folder-open';
  button.type = 'button';
  button.setAttribute('aria-label', t('folder.open', {
    name: folder.name,
    count: bookmarks.length
  }));

  const visual = document.createElement('span');
  visual.className = 'folder-visual';
  visual.setAttribute('aria-hidden', 'true');

  const tab = document.createElement('span');
  tab.className = 'folder-tab';
  const body = document.createElement('span');
  body.className = 'folder-body';
  const previews = document.createElement('span');
  previews.className = 'folder-previews';

  for (const bookmark of bookmarks.slice(0, 4)) {
    const image = createFavicon(bookmark);
    image.alt = '';
    previews.append(image);
  }

  body.append(previews);
  visual.append(tab, body);

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
    addFolderActions(element, folder);
    addDragAndResize(container, element, folder, { kind: 'folder' });
  }

  return element;
}
