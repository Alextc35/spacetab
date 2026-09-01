import { getState } from '../../core/store.js';
import { updateGridSize } from '../gridLayout.js';
import { createFavicon } from './favicon.js';
import { addDragAndResize } from './dragResize.js';
import { addBookmarkActions } from './actions.js';
import { isBookmarkSelected } from './selection.js';
import { isGridKeyboardActive } from './gridKeyboardNavigation.js';
import { applyGridItemPosition } from '../gridItemLayout.js';
import { createFolderElement, enableFolderEditing } from '../folder/renderer.js';
import { resolveImageSource } from '../../core/localImages.js';

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
  const { data: { bookmarks, folders, settings } } = state;
  const { ui: { isEditing } } = state;
  const visibleBookmarks = bookmarks.filter(
    bookmark => !bookmark.folderId
      && (bookmark.groupId ?? null) === settings.activeBookmarkGroupId
  );
  const visibleFolders = folders.filter(
    folder => (folder.groupId ?? null) === settings.activeBookmarkGroupId
  );
  const bookmarksByFolderId = new Map();
  for (const bookmark of bookmarks) {
    if (!bookmark.folderId) continue;
    const folderBookmarks = bookmarksByFolderId.get(bookmark.folderId) ?? [];
    folderBookmarks.push(bookmark);
    bookmarksByFolderId.set(bookmark.folderId, folderBookmarks);
  }

  updateGridSize(container);
  const items = document.createDocumentFragment();

  visibleBookmarks.forEach((bookmark) => {
    const div = document.createElement('div');
    div.className = 'bookmark';
    div.dataset.bookmarkId = bookmark.id;
    div.classList.toggle('is-editing', isEditing);
    div.classList.toggle('is-selected', isBookmarkSelected(bookmark.id));
    div.classList.toggle('is-keyboard-active', isGridKeyboardActive(bookmark.id));

    applyBookmarkStyle(container, div, bookmark);
    createBookmarkContent(div, bookmark, isEditing);

    if (isEditing) {
      enableBookmarkEditing(container, div, bookmark);
    }

    div.addEventListener('click', (e) => {
      if (div.classList.contains('is-editing')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    items.appendChild(div);
  });

  visibleFolders.forEach(folder => {
    items.appendChild(createFolderElement({
      container,
      folder,
      bookmarks: bookmarksByFolderId.get(folder.id) ?? [],
      isEditing
    }));
  });

  container.replaceChildren(items);
}

/**
 * Adds edit-only controls to the already-rendered grid.
 *
 * Entering edit mode used to rebuild every bookmark, including every favicon.
 * Decorating the existing cards keeps that transition responsive on busy
 * workspaces. Leaving edit mode still renders from state, which removes the
 * transient controls and their listeners in one pass.
 *
 * @param {HTMLElement} container
 * @returns {void}
 */
export function enableGridEditing(container) {
  if (!container) return;

  const { data: { bookmarks, folders } } = getState();
  const bookmarksById = new Map(bookmarks.map(bookmark => [bookmark.id, bookmark]));
  const foldersById = new Map(folders.map(folder => [folder.id, folder]));

  for (const element of container.querySelectorAll('.bookmark[data-bookmark-id]')) {
    const bookmark = bookmarksById.get(element.dataset.bookmarkId);
    if (!bookmark) continue;

    element.classList.add('is-editing');
    element.querySelector('.bookmark-link')?.classList.add('is-editing');
    enableBookmarkEditing(container, element, bookmark);
  }

  for (const element of container.querySelectorAll('.bookmark-folder[data-folder-id]')) {
    const folder = foldersById.get(element.dataset.folderId);
    if (!folder) continue;

    element.classList.add('is-editing');
    enableFolderEditing(container, element, folder);
  }
}

function enableBookmarkEditing(container, element, bookmark) {
  if (element.dataset.editingControlsAttached === 'true') return;

  element.dataset.editingControlsAttached = 'true';
  addBookmarkActions(element, bookmark);
  addDragAndResize(container, element, bookmark);
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
 * @param {string|null} [options.faviconUrl=null] - Optional preview-only favicon source.
 * @returns {HTMLDivElement} The generated bookmark element.
 */
export function createBookmarkElement(bookmark, options = {}) {
  const { isEditing = false, isPreview = false, faviconUrl = null } = options;

  const div = document.createElement('div');
  div.className = 'bookmark';

  if (isEditing) div.classList.add('is-editing');
  if (isPreview) div.classList.add('is-preview');

  applyBookmarkStyle(null, div, bookmark);

  createBookmarkContent(div, bookmark, isEditing, faviconUrl);

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
  if (container) applyGridItemPosition(container, div, bookmark);
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
  const backgroundImage = resolveImageSource(bookmark.backgroundImageUrl);
  if (backgroundImage) {
    div.classList.add('has-bg-image');

    div.style.setProperty(
      '--bookmark-bg-image',
      `url("${backgroundImage}")`
    );

    if (bookmark.invertColorBg) {
      div.classList.add('invert-bg-image');
    }
  }

  if (bookmark.backgroundFavicon) {
    div.classList.add('is-favicon-bg');
  }

  if (!bookmark.noBackground && bookmark.backgroundColor) {
    div.style.setProperty('--color-bg-bookmark', bookmark.backgroundColor);
  } else if (bookmark.noBackground) {
    div.style.setProperty('--color-bg-bookmark', 'transparent');
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
 * @param {string|null} [faviconUrl]
 * @returns {void}
 */
function createBookmarkContent(div, bookmark, isEditing, faviconUrl = null) {
  const linkEl = document.createElement('a');
  linkEl.href = bookmark.url || '#';
  linkEl.className = 'bookmark-link';
  linkEl.classList.toggle('is-editing', isEditing);

  if (bookmark.backgroundFavicon) {
    appendMainIcon(linkEl, bookmark, faviconUrl);
    if (bookmark.showText) {
      linkEl.appendChild(createTextSpan(bookmark));
      div.appendChild(linkEl);
      return;
    }
  }

  const infoBox = document.createElement('div');
  infoBox.className = 'bookmark-info';
  if (bookmark.showFavicon ?? true) infoBox.appendChild(createSmallIcon(bookmark, faviconUrl));
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
 * @param {string|null} faviconUrl
 * @returns {void}
 */
function appendMainIcon(container, bookmark, faviconUrl) {
  const img = createFavicon(bookmark, { placeholderUrl: faviconUrl });
  img.alt = bookmark.name || '';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  container.appendChild(img);
}

/**
 * Creates a small favicon element for inline display.
 *
 * @param {Bookmark} bookmark
 * @param {string|null} faviconUrl
 * @returns {HTMLImageElement}
 */
function createSmallIcon(bookmark, faviconUrl) {
  const img = createFavicon(bookmark, { placeholderUrl: faviconUrl });
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
  span.className = 'bookmark-title';
  span.textContent = bookmark.name || '';
  span.style.color = 'var(--color-text-bookmark)';
  return span;
}
