import { t } from '../../core/i18n.js';
import { resolveBackgroundImage } from '../../core/localImages.js';
import { createFavicon } from './favicon.js';
import { applyFolderAppearance, createFolderVisual } from '../folder/visual.js';
import {
  applyRecycleBinAppearance,
  createRecycleBinGlyph
} from '../recycleBinAppearance.js';

/** A read-only launcher row. Display preferences never overwrite saved styles. */
export function createListItem(item, { folder = false, count = 0, active = false, onOpen } = {}) {
  const row = document.createElement('li');
  row.className = `bookmark bookmark-list-item${folder ? ' bookmark-folder' : ''}`;
  row.dataset[folder ? 'folderId' : 'bookmarkId'] = item.id;
  row.classList.toggle('is-keyboard-active', active);
  if (folder) applyFolderAppearance(row, item);

  const link = document.createElement(folder ? 'button' : 'a');
  link.className = `bookmark-list-link ${folder ? 'folder-open' : 'bookmark-link'}`;
  if (folder) {
    link.type = 'button';
    link.title = item.name;
    link.setAttribute('aria-label', t('folder.open', { name: item.name, count }));
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

/** A read-only recycle-bin row. Its list position is intentionally independent from its grid position. */
export function createRecycleBinListItem({ recycleBin, count = 0, active = false, onOpen = () => {} } = {}) {
  const row = document.createElement('li');
  row.className = 'bookmark bookmark-list-item recycle-bin-list-item';
  row.dataset.recycleBinId = recycleBin.id;
  row.dataset.listSearchStatic = 'true';
  row.classList.toggle('is-keyboard-active', active);
  applyRecycleBinAppearance(row, recycleBin);

  const link = document.createElement('button');
  link.className = 'bookmark-list-link recycle-bin-list-link';
  link.type = 'button';
  link.title = t('recycleBin.open');
  link.setAttribute('aria-label', t('recycleBin.openCount', { count }));
  link.addEventListener('click', onOpen);

  const icon = document.createElement('span');
  icon.className = 'bookmark-list-icon recycle-bin-list-icon';
  icon.setAttribute('aria-hidden', 'true');
  const glyph = createRecycleBinGlyph();
  glyph.classList.add('bookmark-list-recycle-glyph');
  icon.append(glyph);

  const copy = document.createElement('span');
  copy.className = 'bookmark-list-copy';
  const name = document.createElement('span');
  name.className = 'bookmark-list-name';
  name.textContent = t('recycleBin.title');
  const detail = document.createElement('span');
  detail.className = 'bookmark-list-detail';
  detail.textContent = t(count === 1 ? 'recycleBin.countOne' : 'recycleBin.count', { count });
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
