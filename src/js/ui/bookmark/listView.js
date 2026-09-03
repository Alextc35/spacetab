import { t } from '../../core/i18n.js';
import { resolveBackgroundImage } from '../../core/localImages.js';
import { createFavicon } from './favicon.js';
import { createFolderVisual } from '../folder/visual.js';

/** A read-only launcher row. Display preferences never overwrite saved styles. */
export function createListItem(item, { folder = false, count = 0, active = false, onOpen } = {}) {
  const row = document.createElement('li');
  row.className = `bookmark bookmark-list-item${folder ? ' bookmark-folder' : ''}`;
  row.dataset[folder ? 'folderId' : 'bookmarkId'] = item.id;
  row.classList.toggle('is-keyboard-active', active);

  const link = document.createElement(folder ? 'button' : 'a');
  link.className = `bookmark-list-link ${folder ? 'folder-open' : 'bookmark-link'}`;
  if (folder) {
    link.type = 'button';
    link.addEventListener('click', onOpen);
  } else {
    link.href = item.url || '#';
  }

  const icon = document.createElement('span');
  icon.className = 'bookmark-list-icon';
  if (folder) {
    icon.classList.add('is-folder-icon');
    icon.append(createFolderVisual(item, [], { compact: true }));
  } else {
    icon.style.backgroundColor = item.noBackground ? 'transparent' : item.backgroundColor;
    const cover = !item.backgroundFavicon && resolveBackgroundImage(item);
    const showIcon = item.backgroundFavicon || (item.showFavicon ?? true);
    const image = cover ? document.createElement('img') : showIcon ? createFavicon(item) : null;
    if (image) {
      if (cover) {
        image.src = cover;
        image.className = 'bookmark-list-cover';
      }
      if (cover ? item.invertColorBg : item.invertColorIcon) image.style.filter = 'invert(1)';
      image.alt = '';
      image.draggable = false;
      icon.append(image);
    }
  }

  const copy = document.createElement('span');
  copy.className = 'bookmark-list-copy';
  const name = document.createElement('span');
  name.className = 'bookmark-list-name';
  name.textContent = item.name || item.url || '—';
  const detail = document.createElement('span');
  detail.className = 'bookmark-list-detail';
  detail.textContent = folder ? t('folder.count', { count }) : describeUrl(item.url);
  copy.append(name, detail);

  const arrow = document.createElement('span');
  arrow.className = 'bookmark-list-arrow';
  arrow.textContent = '›';
  arrow.setAttribute('aria-hidden', 'true');
  link.append(icon, copy, arrow);
  row.append(link);
  return row;
}

function describeUrl(value) {
  try { return new URL(value).hostname.replace(/^www\./, '') || value; }
  catch { return value || ''; }
}
