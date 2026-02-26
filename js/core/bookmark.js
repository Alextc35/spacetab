// bookmark.js
import { getState, setState } from './store.js';
import { DEFAULT_BOOKMARK } from './defaults.js';

/// <reference path="../types/types.js" />

/**
 * Adds a new bookmark to the application state.
 *
 * The input data can be partial. Missing properties
 * will be normalized with default values.
 *
 * @param {Partial<Bookmark>} data - Partial bookmark data.
 * @returns {Bookmark} The created bookmark.
 */
export function addBookmark(data) {
  const { data: { bookmarks } } = getState();

  const bookmark = normalizeBookmark(data);
  const updated = [...bookmarks, bookmark];

  setState({ data: { bookmarks: updated } });

  return bookmark;
}

/**
 * Adds a new bookmark to the application state.
 *
 * The input data can be partial. Missing properties
 * will be normalized with default values.
 *
 * @param {Partial<Bookmark>} data - Partial bookmark data.
 * @returns {Bookmark} The created bookmark.
 */
export function updateBookmarkById(bookmarkId, updatedData) {
  const { data: { bookmarks } } = getState();

  let updatedBookmark = null;

  const updated = bookmarks.map(b => {
    if (b.id !== bookmarkId) return b;

    updatedBookmark = normalizeBookmark({
      ...b,
      ...updatedData
    });

    return updatedBookmark;
  });

  if (!updatedBookmark) return null;

  setState({ data: { bookmarks: updated } });

  return updatedBookmark;
}

/**
 * Deletes a bookmark by its id.
 *
 * @param {string} bookmarkId - The id of the bookmark to delete.
 * @returns {boolean} True if the bookmark was removed, false otherwise.
 */
export function deleteBookmarkById(bookmarkId) {
  const { data: { bookmarks } } = getState();

  const updated = bookmarks.filter(b => b.id !== bookmarkId);
  if (updated.length === bookmarks.length) return false;

  setState({ data: { bookmarks: updated } });

  return true;
}

/**
 * Removes all bookmarks from the state.
 *
 * @returns {Bookmark[]} An empty array.
 */
export function clearBookmarks() {
  setState({ data: { bookmarks: [] } });

  return [];
}

/**
 * Normalizes a bookmark object by ensuring all required
 * properties are present and assigning default values
 * where needed.
 *
 * @param {Partial<Bookmark>} [bookmark={}] - Partial bookmark data.
 * @returns {Bookmark} A fully normalized bookmark object.
 */
function normalizeBookmark(bookmark = {}) {
  return {
    id: bookmark.id || crypto.randomUUID(),
    name: bookmark.name ?? DEFAULT_BOOKMARK.name,
    url: bookmark.url ?? DEFAULT_BOOKMARK.url,
    gx: bookmark.gx ?? DEFAULT_BOOKMARK.gx,
    gy: bookmark.gy ?? DEFAULT_BOOKMARK.gy,
    w: bookmark.w ?? DEFAULT_BOOKMARK.w,
    h: bookmark.h ?? DEFAULT_BOOKMARK.h,
    backgroundImageUrl: bookmark.backgroundImageUrl
      ?? DEFAULT_BOOKMARK.backgroundImageUrl,
    backgroundFavicon: bookmark.backgroundFavicon
      ?? DEFAULT_BOOKMARK.backgroundFavicon,
    invertColorBg: bookmark.invertColorBg 
      ?? DEFAULT_BOOKMARK.invertColorBg,
    noBackground: bookmark.noBackground
      ?? DEFAULT_BOOKMARK.noBackground,
    backgroundColor: bookmark.backgroundColor
      ?? DEFAULT_BOOKMARK.backgroundColor,
    showText: bookmark.showText
      ?? DEFAULT_BOOKMARK.showText,
    textColor: bookmark.textColor 
      ?? DEFAULT_BOOKMARK.textColor,
    showFavicon: bookmark.showFavicon
      ?? DEFAULT_BOOKMARK.showFavicon,
    invertColorIcon: bookmark.invertColorIcon
      ?? DEFAULT_BOOKMARK.invertColorIcon
  };
}