import { getState, setState } from './store.js';

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
    name: bookmark.name ?? '',
    url: bookmark.url ?? '',
    gx: bookmark.gx ?? 0,
    gy: bookmark.gy ?? 0,
    w: bookmark.w ?? 1,
    h: bookmark.h ?? 1,
    backgroundImageUrl: bookmark.backgroundImageUrl ?? null,
    backgroundFavicon: bookmark.backgroundFavicon ?? true,
    invertColorBg: bookmark.invertColorBg ?? false,
    noBackground: bookmark.noBackground ?? false,
    backgroundColor: bookmark.backgroundColor ?? '#000000',
    showText: bookmark.showText ?? true,
    textColor: bookmark.textColor ?? '#ffffff',
    showFavicon: bookmark.showFavicon ?? false,
    invertColorIcon: bookmark.invertColorIcon ?? false
  };
}