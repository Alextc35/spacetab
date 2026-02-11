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

import { version } from '../core/translations.js';
import { getBookmarks, deleteBookmarkById } from '../core/bookmark.js';
import { PADDING, DEBUG } from '../core/config.js';
import { openModal } from './modals/editBookmarkModal.js';
import { addDragAndResize } from './dragResize.js';
import { updateGridSize, getRowWidth, getRowHeight } from './gridLayout.js';
import { flashError, flashInfo, flashSuccess } from './flash.js';
import { createFavicon } from './favicon.js';
import { showAlert } from './modals/alertModal.js';
import { t } from '../core/i18n.js';

if (DEBUG) console.info('Initializing SpaceTab ' + version + ' alfa');

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
 * 
 * @returns {void}
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

  if (DEBUG) console.log('Bookmarks loaded:', bookmarks);
}

/**
 * Apply visual style to a bookmark element
 *
 * Orchestrates visual updates:
 * - Resets previous dynamic state
 * - Applies background rules
 * - Applies text styling
 *
 * @param {HTMLElement} div
 * @param {Object} bookmark
 */
function applyBookmarkStyle(div, bookmark) {
  resetBookmarkVisualState(div);
  applyBackgroundStyle(div, bookmark);
  applyTextStyle(div, bookmark);
}

/* =====================================================
 * Private helpers
 * ===================================================== */

/**
 * Clears dynamic classes and inline CSS variables.
 *
 * Prevents style leakage between re-renders.
 *
 * @param {HTMLElement} div
 */
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

/**
 * Applies background-related styles.
 *
 * Handles:
 * - Transparent mode
 * - Favicon background mode
 * - Image background mode
 * - Solid color mode
 *
 * @param {HTMLElement} div
 * @param {Object} bookmark
 */
function applyBackgroundStyle(div, bookmark) {
  if (bookmark.noBackground) {
    div.style.setProperty('--color-bg-bookmark', 'transparent');
    return;
  }

  if (bookmark.faviconBackground) {
    div.classList.add('is-favicon-bg');

    if (bookmark.bookmarkColor) {
      div.style.setProperty('--color-bg-bookmark', bookmark.bookmarkColor);
    }
    return;
  }

  if (bookmark.backgroundImageUrl) {
    div.classList.add('has-bg-image');

    div.style.setProperty(
      '--bookmark-bg-image',
      `url("${bookmark.backgroundImageUrl}")`
    );

    if (bookmark.bookmarkColor) {
      div.style.setProperty('--color-bg-bookmark', bookmark.bookmarkColor);
    }

    if (bookmark.invertColorBg) {
      div.classList.add('invert-bg-image');
    }

    return;
  }

  if (bookmark.bookmarkColor) {
    div.style.setProperty('--color-bg-bookmark', bookmark.bookmarkColor);
  }
}

/**
 * Applies text color styling.
 *
 * @param {HTMLElement} div
 * @param {Object} bookmark
 */
function applyTextStyle(div, bookmark) {
  if (bookmark.textColor) {
    div.style.setProperty('--color-text-bookmark', bookmark.textColor);
  }
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
 * 
 * @param {HTMLElement} container
 * @param {Object} bookmark
 */
function appendMainIcon(container, bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  container.appendChild(img);
}

/**
 * Create a small icon for info boxes
 * 
 * @param {Object} bookmark
 * @returns {HTMLElement} <img> element
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
 * 
 * @param {Object} bookmark
 * @returns {HTMLElement} <span> element
 */
function createTextSpan(bookmark) {
  const span = document.createElement('span');
  span.textContent = bookmark.name || '';
  span.style.color = 'var(--color-text-bookmark)';
  return span;
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

  const delBtn = createButton('🗑', 'delete', themeClass, () => {
    confirmAndDeleteBookmark(bookmark);
  });

  container.append(editBtn, delBtn);
}

/**
 * Helper to create a styled button
 * 
 * @param {string} text - Button text content
 * @param {string} type - 'edit' or 'delete' for styling
 * @param {string} themeClass - 'is-dark' or 'is-light' for contrast
 * @param {Function} onClick - Click handler function
 * @returns {HTMLElement} <button> element
 */
function createButton(text, type, themeClass, onClick) {
  const btn = document.createElement('button');
  btn.className = `bookmark-btn ${type} ${themeClass}`;
  btn.textContent = text;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

/**
 * Delete a bookmark after user confirmation.
 * Can be called desde botones o middle-click events.
 *
 * @param {Object} bookmark
 * @returns {Promise<void>}
 */
export async function confirmAndDeleteBookmark(bookmark) {
  if (!bookmark) return;

  const message = t('alert.bookmark.confirmDelete').replace('{name}', bookmark.name);
  const confirmed = await showAlert(message, { type: 'confirm' });
  if (!confirmed) return;

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