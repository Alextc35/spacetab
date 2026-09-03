import { t } from '../../core/i18n.js';
import { resolveBackgroundImage } from '../../core/localImages.js';
import { createFavicon } from './favicon.js';

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
    icon.textContent = '📁';
  } else {
    const cover = !item.backgroundFavicon && resolveBackgroundImage(item);
    const image = cover ? document.createElement('img') : createFavicon(item);
    if (cover) image.src = cover;
    image.alt = '';
    image.draggable = false;
    icon.append(image);
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
