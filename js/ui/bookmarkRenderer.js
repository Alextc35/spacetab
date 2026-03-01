import { getState } from '../core/store.js';
import { updateGridSize, getRowWidth, getRowHeight } from './gridLayout.js';
import { PADDING } from '../core/config.js';
import { createFavicon } from './favicon.js';
import { addDragAndResize } from './bookmarkDragResize.js';
import { addEditDeleteButtons } from './bookmarkActions.js';

/**
 * Renders all bookmarks into the given container element.
 *
 * Responsible for:
 * - Reading application state
 * - Calculating grid dimensions
 * - Creating bookmark DOM elements
 * - Applying layout positioning
 * - Attaching edit, drag and resize behaviors when editing mode is enabled
 *
 * @param {HTMLElement} container - Grid container element.
 * @returns {void}
 */
export function renderBookmarks(container) {
  if (!container) return;

  const state = getState();
  const { data: { bookmarks } } = state;
  const { ui: { isEditing } } = state;

  updateGridSize(container);
  container.innerHTML = '';

  bookmarks.forEach((bookmark) => {
    const div = document.createElement('div');
    div.className = 'bookmark';
    div.classList.toggle('is-editing', isEditing);

    applyBookmarkStyle(container, div, bookmark);
    createBookmarkContent(div, bookmark, isEditing);

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

/**
 * Creates a bookmark DOM element without attaching it to the container.
 *
 * Useful for previews or isolated rendering scenarios.
 *
 * @param {Bookmark} bookmark - Bookmark data object.
 * @param {Object} [options]
 * @param {boolean} [options.isEditing=false] - Whether editing styles should apply.
 * @param {boolean} [options.isPreview=false] - Whether preview styles should apply.
 * @returns {HTMLDivElement} The generated bookmark element.
 */
export function createBookmarkElement(bookmark, options = {}) {
  const { isEditing = false, isPreview = false } = options;

  const div = document.createElement('div');
  div.className = 'bookmark';

  if (isEditing) div.classList.add('is-editing');
  if (isPreview) div.classList.add('is-preview');

  applyBookmarkStyle(div, bookmark);

  createBookmarkContent(div, bookmark, isEditing);

  return div;
}

/**
 * Applies full visual styling to a bookmark element.
 *
 * Includes background, image, color and text styling.
 *
 * @param {HTMLDivElement} div - Bookmark DOM element.
 * @param {Bookmark} bookmark - Bookmark data object.
 * @returns {void}
 */
function applyBookmarkStyle(container, div, bookmark) {
  applyBookmarkPosition(container, div, bookmark);
  resetBookmarkVisualState(div);
  applyBackgroundStyle(div, bookmark);
  applyTextStyle(div, bookmark);
}

/**
 * Calculates and applies grid-based positioning CSS variables to a bookmark element.
 *
 * Uses the container dimensions to convert grid coordinates (gx, gy) and size (w, h)
 * into pixel values for --x, --y, --w and --h CSS custom properties.
 * The PADDING constant is subtracted from width and height.
 *
 * @param {HTMLElement} container - The grid container element used for dimension calculations.
 * @param {HTMLDivElement} div - Bookmark DOM element to apply position styles to.
 * @param {Bookmark} bookmark - Bookmark data object containing grid position (gx, gy) and size (w, h).
 * @returns {void}
 */
function applyBookmarkPosition(container, div, bookmark) {
  const rowWidth = getRowWidth(container);
  const rowHeight = getRowHeight(container);

  div.style.setProperty('--x', bookmark.gx * rowWidth + 'px');
  div.style.setProperty('--y', bookmark.gy * rowHeight + 'px');
  div.style.setProperty('--w', bookmark.w * rowWidth - PADDING + 'px');
  div.style.setProperty('--h', bookmark.h * rowHeight - PADDING + 'px');
}

/**
 * Resets visual state and CSS variables before applying new styles.
 *
 * Prevents style leakage between renders.
 *
 * @param {HTMLDivElement} div
 * @returns {void}
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
 * Applies background-related styles based on bookmark configuration.
 *
 * Supports:
 * - Transparent background
 * - Favicon background mode
 * - Custom background image
 * - Solid background color
 *
 * @param {HTMLDivElement} div
 * @param {Bookmark} bookmark
 * @returns {void}
 */
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

/**
 * Applies text color styling to a bookmark element.
 *
 * @param {HTMLDivElement} div
 * @param {Bookmark} bookmark
 * @returns {void}
 */
function applyTextStyle(div, bookmark) {
  if (bookmark.textColor) {
    div.style.setProperty('--color-text-bookmark', bookmark.textColor);
  }
}

/**
 * Creates the inner anchor content for a bookmark.
 *
 * Handles:
 * - Favicon-only layout
 * - Favicon + text layout
 * - Conditional visibility of text and icon
 *
 * @param {HTMLDivElement} div
 * @param {Bookmark} bookmark
 * @param {boolean} isEditing
 * @returns {void}
 */
function createBookmarkContent(div, bookmark, isEditing) {
  const linkEl = document.createElement('a');
  linkEl.href = bookmark.url || '#';
  linkEl.className = 'bookmark-link';
  linkEl.classList.toggle('is-editing', isEditing);

  if (bookmark.backgroundFavicon) {
    appendMainIcon(linkEl, bookmark);
    if (bookmark.showText) {
      linkEl.appendChild(createTextSpan(bookmark));
      div.appendChild(linkEl);
      return;
    }
  }

  const infoBox = document.createElement('div');
  infoBox.className = 'bookmark-info';
  if (bookmark.showFavicon ?? true) infoBox.appendChild(createSmallIcon(bookmark));
  if (bookmark.showText ?? true) infoBox.appendChild(createTextSpan(bookmark));
  linkEl.appendChild(infoBox);
  div.appendChild(linkEl);
  return;
}

/**
 * Appends the main favicon as background-style icon.
 *
 * @param {HTMLElement} container
 * @param {Bookmark} bookmark
 * @returns {void}
 */
function appendMainIcon(container, bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  container.appendChild(img);
}

/**
 * Creates a small favicon element for inline display.
 *
 * @param {Bookmark} bookmark
 * @returns {HTMLImageElement}
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
 * Creates a text span element for bookmark title.
 *
 * @param {Bookmark} bookmark
 * @returns {HTMLSpanElement}
 */
function createTextSpan(bookmark) {
  const span = document.createElement('span');
  span.textContent = bookmark.name || '';
  span.style.color = 'var(--color-text-bookmark)';
  return span;
}