import '../types/types.js'; // typedefs
import { getState, setState } from './store.js';
import { DEFAULT_BOOKMARK } from './defaults.js';

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
 * Updates an existing bookmark by its id.
 *
 * Merges the provided partial data with the current bookmark
 * and normalizes the result to ensure all required properties exist.
 *
 * @param {string} bookmarkId - The id of the bookmark to update.
 * @param {Partial<Bookmark>} updatedData - Partial data to merge into the bookmark.
 * @returns {Bookmark|null} The updated bookmark, or null if not found.
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
 */
export function clearBookmarks() {
  setState({ data: { bookmarks: [] } });
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
    ...DEFAULT_BOOKMARK,
    ...bookmark,
    id: bookmark.id ?? crypto.randomUUID()
  };
}