import { getState } from '../core/store.js';
import { updateGridSize, getRowWidth, getRowHeight } from './gridLayout.js';
import { PADDING } from '../core/config.js';
import { createFavicon } from './favicon.js';
import { addDragAndResize } from './bookmarkDragResize.js';
import { addEditDeleteButtons } from './bookmarkActions.js';

export function renderBookmarks(container) {
  if (!container) return;

  const state = getState();
  const { data: { bookmarks } } = state;
  const { ui: { isEditing } } = state;

  updateGridSize(container);
  container.innerHTML = '';

  const rowWidth = getRowWidth(container);
  const rowHeight = getRowHeight(container);

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
      addDragAndResize(container, div, bookmark);
    }

    div.addEventListener('click', (e) => {
      if (isEditing) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    container.appendChild(div);
  });
}

export function createBookmarkElement(bookmark, options = {}) {
  const { isEditing = false, isPreview = false } = options;

  const div = document.createElement('div');
  div.className = 'bookmark';

  if (isEditing) div.classList.add('is-editing');
  if (isPreview) div.classList.add('is-preview');

  applyBookmarkStyle(div, bookmark);

  const linkEl = createBookmarkContent(bookmark, isEditing);
  div.appendChild(linkEl);

  return div;
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