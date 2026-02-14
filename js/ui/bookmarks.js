import { version } from '../core/translations.js';
import { PADDING, DEBUG } from '../core/config.js';
import { openModal } from './modals/editBookmarkModal.js';
import { addDragAndResize } from './dragResize.js';
import { updateGridSize, getRowWidth, getRowHeight } from './gridLayout.js';
import { flashError, flashSuccess } from './flash.js';
import { createFavicon } from './favicon.js';
import { showAlert } from './modals/alertModal.js';
import { t } from '../core/i18n.js';
import { getState } from '../core/store.js';
import { deleteBookmarkById } from '../core/bookmark.js';

if (DEBUG) console.info('Initializing SpaceTab ' + version + ' alfa');

export const container = document.getElementById('bookmark-container') || null;
if (DEBUG) { console.info('Bookmark container:', container); }

export function renderBookmarks() {
  if (!container) return;

  const { bookmarks, isEditing } = getState();

  updateGridSize(container);
  container.innerHTML = '';

  const rowWidth = getRowWidth();
  const rowHeight = getRowHeight();

  bookmarks.forEach((bookmark) => {
    const div = document.createElement('div');
    div.className = 'bookmark';
    div.classList.toggle('is-editing', isEditing);

    applyBookmarkStyle(div, bookmark);

    div.style.setProperty('--x', bookmark.gx * rowWidth + 'px');
    div.style.setProperty('--y', bookmark.gy * rowHeight + 'px');
    div.style.setProperty('--w', bookmark.w * rowWidth - PADDING + 'px');
    div.style.setProperty('--h', bookmark.h * rowHeight - PADDING + 'px');
    
    const linkEl = createBookmarkContent(bookmark, isEditing);
    div.appendChild(linkEl);

    if (isEditing) {
      addEditDeleteButtons(div, bookmark);
      addDragAndResize(div, bookmark);
    }

    div.addEventListener('click', (e) => {
      if (isEditing) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    container.appendChild(div);
  });

  if (DEBUG) console.warn('Rendered bookmarks')
}

function applyBookmarkStyle(div, bookmark) {
  resetBookmarkVisualState(div);
  applyBackgroundStyle(div, bookmark);
  applyTextStyle(div, bookmark);
}

function resetBookmarkVisualState(div) {
  div.classList.remove(
    'is-favicon-bg',
    'has-bg-image',
    'invert-bg-image'
  );

  div.style.removeProperty('--bookmark-bg-image');
  div.style.removeProperty('--color-bg-bookmark');
  div.style.removeProperty('--color-text-bookmark');
}

function applyBackgroundStyle(div, bookmark) {
  if (bookmark.noBackground) {
    div.style.setProperty('--color-bg-bookmark', 'transparent');
    return;
  }

  if (bookmark.backgroundFavicon) {
    div.classList.add('is-favicon-bg');

    if (bookmark.backgroundColor) {
      div.style.setProperty('--color-bg-bookmark', bookmark.backgroundColor);
    }
    return;
  }

  if (bookmark.backgroundImageUrl) {
    div.classList.add('has-bg-image');

    div.style.setProperty(
      '--bookmark-bg-image',
      `url("${bookmark.backgroundImageUrl}")`
    );

    if (bookmark.backgroundColor) {
      div.style.setProperty('--color-bg-bookmark', bookmark.backgroundColor);
    }

    if (bookmark.invertColorBg) {
      div.classList.add('invert-bg-image');
    }

    return;
  }

  if (bookmark.backgroundColor) {
    div.style.setProperty('--color-bg-bookmark', bookmark.backgroundColor);
  }
}

function applyTextStyle(div, bookmark) {
  if (bookmark.textColor) {
    div.style.setProperty('--color-text-bookmark', bookmark.textColor);
  }
}

function createBookmarkContent(bookmark, isEditing) {
  const linkEl = document.createElement('a');
  linkEl.href = bookmark.url || '#';
  linkEl.className = 'bookmark-link';
  linkEl.classList.toggle('is-editing', isEditing);

  if (bookmark.backgroundFavicon) {
    appendMainIcon(linkEl, bookmark);
    if (bookmark.showText) linkEl.appendChild(createTextSpan(bookmark));
    return linkEl;
  }

  const infoBox = document.createElement('div');
  infoBox.className = 'bookmark-info';
  if (bookmark.showFavicon ?? true) infoBox.appendChild(createSmallIcon(bookmark));
  if (bookmark.showText ?? true) infoBox.appendChild(createTextSpan(bookmark));
  linkEl.appendChild(infoBox);
  return linkEl;
}

function appendMainIcon(container, bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  container.appendChild(img);
}

function createSmallIcon(bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  img.style.width = '16px';
  img.style.height = '16px';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  return img;
}

function createTextSpan(bookmark) {
  const span = document.createElement('span');
  span.textContent = bookmark.name || '';
  span.style.color = 'var(--color-text-bookmark)';
  return span;
}

function addEditDeleteButtons(container, bookmark) {
  const themeClass = isVisuallyDark(bookmark) ? 'is-dark' : 'is-light';

  const editBtn = createButton('✎', 'edit', themeClass, () => {
    openModal(bookmark.id);
  });

  const delBtn = createButton('🗑', 'delete', themeClass, () => {
    confirmAndDeleteBookmark(bookmark);
  });

  container.append(editBtn, delBtn);
}

function createButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `bookmark-btn ${type} ${themeClass}`;
  btn.textContent = text;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

export async function confirmAndDeleteBookmark(bookmark) {
  if (!bookmark) return;

  const message = t('alert.bookmark.confirmDelete').replace('{name}', bookmark.name);
  const confirmed = await showAlert(message, { type: 'confirm' });
  if (!confirmed) return;

  const deleted = await deleteBookmarkById(bookmark.id);
  if (deleted) {
    flashSuccess('flash.bookmark.deleted');
    if (DEBUG) console.info('Bookmark deleted: ', bookmark);
  } else {
    flashError('flash.bookmark.deleteError');
    if (DEBUG) console.error('Error deleting bookmark', bookmark);
  }
}

function isVisuallyDark(bookmark) {
  let dark = isDarkColor(bookmark.backgroundColor);
  if (bookmark.backgroundImageUrl) dark = true;
  if (bookmark.invertColorBg) dark = !dark;
  return dark;
}

function isDarkColor(color) {
  if (!color || color === 'transparent') return true;
  if (!color.startsWith('#')) return true;
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
  return luminance < 64;
}