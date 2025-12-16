import { createBookmark, addBookmark, getBookmarks, deleteBookmark } from '../core/bookmark.js';
import { pxToGrid, gridToPx, isAreaFree } from '../core/grid.js';
import { openModal } from './bookmarksEditModal.js';
import { addDragAndResize } from './dragResize.js';
import { PADDING } from '../core/config.js';
import { updateGridSize } from './gridLayout.js';

export const container = document.getElementById('bookmark-container');
let editMode = false;

export function setEditMode(value) {
  editMode = value;
}

export async function handleAddBookmark() {
  const bookmarks = getBookmarks();

  // TODO: Mejorar UI para añadir bookmark (formulario en modal)
  const name = prompt("Nombre del favorito:");
  if (!name) return;
  const url = prompt("URL del favorito (incluye https://):");
  if (!url) return;

  const rect = container.getBoundingClientRect();
  const maxGy = pxToGrid(rect.height) - 1;

  let gx = 0;
  let gy = 0;
  while (!isAreaFree(bookmarks, gx, gy)) {
    gy++;
    if (gy > maxGy) {
        gy = 0;
        gx++;
    }
  }

  const newBookmark = createBookmark({ name, url, x: gridToPx(gx), y: gridToPx(gy)});
  await addBookmark(newBookmark);
  
  renderBookmarks();
}

export function renderBookmarks() {
  updateGridSize();

  const bookmarks = getBookmarks();
  container.innerHTML = '';
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  bookmarks.forEach((bookmark, index) => {
    bookmark.w ||= 1;
    bookmark.h ||= 1;

    const div = document.createElement('div');
    div.className = 'bookmark';
    div.classList.toggle('is-editing', editMode);

    applyBookmarkStyle(div, bookmark);

    const gx = pxToGrid(bookmark.x ?? 0);
    const gy = pxToGrid(bookmark.y ?? 0);
    div.style.setProperty('--x', gridToPx(gx) + 'px');
    div.style.setProperty('--y', gridToPx(gy) + 'px');
    div.style.setProperty('--w', (gridToPx(bookmark.w) - PADDING) + 'px');
    div.style.setProperty('--h', (gridToPx(bookmark.h) - PADDING) + 'px');

    const linkEl = createBookmarkContent(bookmark);
    div.appendChild(linkEl);

    if (editMode) {
      addEditButtons(div, bookmark, index);
      addDragAndResize(div, bookmark, index, containerWidth, containerHeight);
    }

    div.addEventListener('click', (e) => {
      if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
        if (e.ctrlKey || e.metaKey || e.button === 1) window.open(bookmark.url, '_blank');
        else window.location.href = bookmark.url;
      }
    });

    container.appendChild(div);
  });
}

function applyBookmarkStyle(div, bookmark) {
  div.classList.remove(
    'is-favicon-bg',
    'has-bg-image',
    'invert-bg-image'
  );

  if (bookmark.faviconBackground) {
    div.classList.add('is-favicon-bg');
  }

  if (bookmark.backgroundImageUrl && !bookmark.faviconBackground) {
    div.classList.add('has-bg-image');
    div.style.setProperty('--bookmark-bg-image', `url(${bookmark.backgroundImageUrl})`);

    if (bookmark.invertColorBg) {
      div.classList.add('invert-bg-image');
    } else {
      div.classList.remove('invert-bg-image');
    }
  } else {
    div.classList.remove('has-bg-image', 'invert-bg-image');
    div.style.removeProperty('--bookmark-bg-image');
  }

  div.style.setProperty(
    '--bookmark-bg',
    bookmark.bookmarkColor === 'transparent'
      ? 'transparent'
      : (bookmark.bookmarkColor || '#222')
  );

  div.style.setProperty(
    '--bookmark-text',
    bookmark.textColor || '#fff'
  );
}

function createBookmarkContent(bookmark) {
  const linkEl = document.createElement('a');
  linkEl.href = bookmark.url || '#';
  linkEl.className = 'bookmark-link';

  linkEl.classList.toggle('is-editing', editMode);

  if (bookmark.faviconBackground) {
    appendMainIcon(linkEl, bookmark);
    if (bookmark.showText) {
      linkEl.appendChild(createTextSpan(bookmark));
    }
    return linkEl;
  }

  const infoBox = document.createElement('div');
  infoBox.className = 'bookmark-info';

  if (bookmark.showFavicon ?? true) {
    infoBox.appendChild(createSmallIcon(bookmark));
  }

  if (bookmark.showText ?? true) {
    infoBox.appendChild(createTextSpan(bookmark));
  }

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
  span.style.color = 'var(--bookmark-text)';
  return span;
}

function createFavicon(bookmark) {
  const img = document.createElement('img');
  img.className = 'bookmark-favicon';

  let isInternal = false;
  try {
    const urlObj = new URL(bookmark.url);
    isInternal = urlObj.hostname.endsWith('.internal') || urlObj.hostname.endsWith('.local');
    if (!isInternal) {
      img.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(urlObj.origin)}&size=64`;
      img.onerror = () => {
        img.onerror = null;
        img.src = generateInitialsCanvas(bookmark.name);
      };
    }
  } catch {
    img.src = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
  }

  if (isInternal) {
    img.src = generateInitialsCanvas(bookmark.name);
  }

  return img;
}

function generateInitialsCanvas(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = (name || '?').slice(0, 2).toUpperCase();
  ctx.fillText(initials, 32, 32);

  return canvas.toDataURL();
}

function addEditButtons(container, bookmark, index) {
  const bookmarks = getBookmarks();
  const isDark = isVisuallyDark(bookmark);
  const themeClass = isDark ? 'is-dark' : 'is-light';

  const editBtn = createButton('✎', 'edit', themeClass, () => {
    openModal(bookmarks, index);
  });

  const delBtn = createButton('🗑', 'delete', themeClass, async () => {
    if (confirm(`¿Eliminar ${bookmark.name}?`)) {
      await deleteBookmark(index);
      renderBookmarks();
    }
  });

  container.append(editBtn, delBtn);
}

function createButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `bookmark-btn ${type} ${themeClass}`;
  btn.textContent = text;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    onClick();
  });

  return btn;
}

function isVisuallyDark(bookmark) {
  let dark = isDarkColor(bookmark.bookmarkColor);

  if (bookmark.backgroundImageUrl) {
    dark = true;
  }

  if (bookmark.invertColorBg) {
    dark = !dark;
  }

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