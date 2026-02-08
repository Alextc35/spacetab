/**
 * =========================================================
 * Bookmarks UI rendering and interaction
 * =========================================================
 *
 * Responsibilities:
 * - Render bookmarks grid in the DOM
 * - Apply styling based on bookmark properties
 * - Manage edit mode (edit/delete buttons, drag & resize)
 * - Handle favicon loading and fallback generation
 * - Trigger flash messages for user feedback
 *
 * This module is purely UI-focused and depends on core modules:
 * - bookmark.js for data access (CRUD)
 * - config.js for settings and layout constants
 * - dragResize.js for drag & resize behavior
 * - flash.js for user notifications
 * - gridLayout.js for calculating rows/columns sizes
 *
 * Notes:
 * - editMode is controlled via setEditMode() and affects
 *   the rendered bookmarks.
 * - All DOM elements are recreated on each render call.
 */

import { getBookmarks, deleteBookmarkById } from '../core/bookmark.js';
import { PADDING, DEBUG } from '../core/config.js';
import { openModal } from './bookmarksEditModal.js';
import { addDragAndResize } from './dragResize.js';
import { updateGridSize, getRowWidth, getRowHeight } from './gridLayout.js';
import { flashError, flashInfo, flashSuccess } from './flash.js';

/**
 * Main container element where bookmarks are rendered
 * @type {HTMLElement | null}
 */
export const container = document.getElementById('bookmark-container') || null;
if (DEBUG) { console.info('Bookmark container:', container); }

/**
 * Indicates whether the application is in edit mode
 * @type {boolean}
 */
let editMode = false;

/**
 * Toggle edit mode.
 * When enabled, bookmarks show drag handles, edit/delete buttons.
 *
 * @param {boolean} value
 */
export function setEditMode(value) {
  editMode = value;
  const key = value
    ? 'flash.editMode.enabled'
    : 'flash.editMode.disabled';
  flashInfo(key, 1000);
  if (DEBUG) console.info(`Edit mode ${value ? 'enabled' : 'disabled'}`);
}

/**
 * Render all bookmarks into the container.
 * Rebuilds the DOM every time and applies styles, content, and interactions.
 */
export function renderBookmarks() {
  if (!container) return;

  updateGridSize(container);

  const bookmarks = getBookmarks();
  container.innerHTML = '';

  const rowWidth = getRowWidth();
  const rowHeight = getRowHeight();

  bookmarks.forEach((bookmark) => {
    const div = document.createElement('div');
    div.className = 'bookmark';
    div.classList.toggle('is-editing', editMode);

    applyBookmarkStyle(div, bookmark);

    div.style.setProperty('--x', bookmark.gx * rowWidth + 'px');
    div.style.setProperty('--y', bookmark.gy * rowHeight + 'px');
    div.style.setProperty('--w', bookmark.w * rowWidth - PADDING + 'px');
    div.style.setProperty('--h', bookmark.h * rowHeight - PADDING + 'px');
    
    const linkEl = createBookmarkContent(bookmark);
    div.appendChild(linkEl);

    if (editMode) {
      addEditDeleteButtons(div, bookmark);
      addDragAndResize(div, bookmark);
    }

    div.addEventListener('click', (e) => {
      if (editMode) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    container.appendChild(div);
  });
}

/**
 * Apply visual style to a bookmark div based on its properties
 *
 * @param {HTMLElement} div
 * @param {Object} bookmark
 */
function applyBookmarkStyle(div, bookmark) {
  div.classList.remove(
    'is-favicon-bg',
    'has-bg-image',
    'invert-bg-image'
  );
  div.style.removeProperty('--bookmark-bg-image');

  if (bookmark.noBackground) {
    div.style.setProperty('--bookmark-bg', 'transparent');
  } else if (bookmark.faviconBackground) {
    div.classList.add('is-favicon-bg');
    div.style.setProperty('--bookmark-bg', bookmark.bookmarkColor || '#222');
  } else if (bookmark.backgroundImageUrl) {
    div.classList.add('has-bg-image');
    div.style.setProperty(
      '--bookmark-bg-image',
      `url(${bookmark.backgroundImageUrl})`
    );
    div.style.setProperty('--bookmark-bg', bookmark.bookmarkColor || '#222');
    if (bookmark.invertColorBg) {
      div.classList.add('invert-bg-image');
    }
  } else {
    div.style.setProperty(
      '--bookmark-bg',
      bookmark.bookmarkColor || '#222'
    );
  }

  div.style.setProperty(
    '--bookmark-text',
    bookmark.textColor || '#fff'
  );
}

/**
 * Create the inner content of a bookmark (link, icon, text)
 *
 * @param {Object} bookmark
 * @returns {HTMLElement} <a> element
 */
function createBookmarkContent(bookmark) {
  const linkEl = document.createElement('a');
  linkEl.href = bookmark.url || '#';
  linkEl.className = 'bookmark-link';
  linkEl.classList.toggle('is-editing', editMode);

  if (bookmark.faviconBackground) {
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

/**
 * Create the main favicon (large icon) for bookmarks using
 * either fetched favicon or fallback initials.
 */
function appendMainIcon(container, bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  container.appendChild(img);
}

/**
 * Create a small icon for info boxes
 */
function createSmallIcon(bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  img.style.width = '16px';
  img.style.height = '16px';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  return img;
}

/**
 * Create a text span element for bookmark name
 */
function createTextSpan(bookmark) {
  const span = document.createElement('span');
  span.textContent = bookmark.name || '';
  span.style.color = 'var(--bookmark-text)';
  return span;
}

/**
 * Fetch favicon or generate fallback initials canvas
 */
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

/**
 * Generate a base64 image with initials for bookmarks without favicon
 */
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

/**
 * Add edit and delete buttons for bookmarks in edit mode
 *
 * @param {HTMLElement} container
 * @param {Object} bookmark
 */
function addEditDeleteButtons(container, bookmark) {
  const themeClass = isVisuallyDark(bookmark) ? 'is-dark' : 'is-light';

  const editBtn = createButton('✎', 'edit', themeClass, () => {
    openModal(bookmark.id);
  });

  const delBtn = createButton('🗑', 'delete', themeClass, async () => {
    if (confirm(`¿Eliminar ${bookmark.name}?`)) {
      const deleted = await deleteBookmarkById(bookmark.id);
      if (deleted) {
        flashSuccess('flash.bookmark.deleted');
        if (DEBUG) console.info('Bookmark deleted', bookmark);
      } else {
        flashError('flash.bookmark.deleteError');
        if (DEBUG) console.error('Error deleting bookmark', bookmark);
      }
      
      renderBookmarks();
    }
  });

  container.append(editBtn, delBtn);
}

/**
 * Helper to create a styled button
 */
function createButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `bookmark-btn ${type} ${themeClass}`;
  btn.textContent = text;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

/**
 * Determines if the bookmark background/text should be considered "dark"
 *
 * @param {Object} bookmark
 * @returns {boolean}
 */
function isVisuallyDark(bookmark) {
  let dark = isDarkColor(bookmark.bookmarkColor);
  if (bookmark.backgroundImageUrl) dark = true;
  if (bookmark.invertColorBg) dark = !dark;
  return dark;
}

/**
 * Calculates if a color string is visually dark
 *
 * @param {string} color
 * @returns {boolean}
 */
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