import '../types/types.js'; // typedefs
import { getState, setState } from './store.js';
import {
  applyBookmarkPreset,
  createBookmarkDraft,
  normalizeBookmark as normalizeBookmarkValue,
  validateBookmarkDraft
} from './bookmarkModel.js';

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
  const { data: { bookmarks, settings } } = getState();
  const validation = validateBookmarkDraft(data);
  if (!validation.isValid) return null;

  const bookmark = normalizeBookmarkValue(validation.value, {
    preset: settings.bookmarkDefault
  });
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

    const validation = validateBookmarkDraft({
      ...b,
      ...updatedData
    });

    if (!validation.isValid) return b;
    updatedBookmark = normalizeBookmarkValue({
      ...b,
      ...validation.value
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
 * @return {boolean} True if the all bookmarks were removed, false otherwise.
 */
export function clearBookmarks() {
  setState({ data: { bookmarks: [] } });
  return true;
}

/**
 * Updates several bookmarks in one state transition and one undo step.
 *
 * @param {Iterable<string>} bookmarkIds
 * @param {(bookmark: Bookmark) => Partial<Bookmark>} updater
 * @returns {Bookmark[]}
 */
export function updateBookmarksByIds(bookmarkIds, updater) {
  const ids = new Set(bookmarkIds);
  if (!ids.size) return [];

  const { data: { bookmarks } } = getState();
  const changed = [];
  const updated = bookmarks.map(bookmark => {
    if (!ids.has(bookmark.id)) return bookmark;

    const candidate = {
      ...bookmark,
      ...updater(structuredClone(bookmark))
    };
    const validation = validateBookmarkDraft(candidate);
    if (!validation.isValid) return bookmark;

    const nextBookmark = normalizeBookmarkValue({
      ...candidate,
      ...validation.value
    });
    changed.push(nextBookmark);
    return nextBookmark;
  });

  if (changed.length) setState({ data: { bookmarks: updated } });
  return changed;
}

/** @param {Iterable<string>} bookmarkIds */
export function deleteBookmarksByIds(bookmarkIds) {
  const ids = new Set(bookmarkIds);
  if (!ids.size) return 0;
  const { data: { bookmarks } } = getState();
  const updated = bookmarks.filter(bookmark => !ids.has(bookmark.id));
  const deletedCount = bookmarks.length - updated.length;
  if (deletedCount) setState({ data: { bookmarks: updated } });
  return deletedCount;
}

/**
 * Applies appearance only, preserving identity and layout.
 *
 * @param {Iterable<string>} bookmarkIds
 * @param {BookmarkPreset} preset
 */
export function applyPresetToBookmarks(bookmarkIds, preset) {
  return updateBookmarksByIds(bookmarkIds, bookmark => (
    applyBookmarkPreset(bookmark, preset)
  ));
}

/**
 * Duplicates a bookmark into a caller-selected free position.
 *
 * @param {string} bookmarkId
 * @param {{gx: number, gy: number}} position
 * @param {string} [nameSuffix='copy']
 * @returns {Bookmark|null}
 */
export function duplicateBookmarkById(bookmarkId, position, nameSuffix = 'copy') {
  const bookmark = getState().data.bookmarks.find(item => item.id === bookmarkId);
  if (!bookmark || !position) return null;

  const duplicate = structuredClone(bookmark);
  delete duplicate.id;
  delete duplicate.createdAt;
  delete duplicate.updatedAt;

  return addBookmark({
    ...duplicate,
    ...position,
    name: `${bookmark.name} (${nameSuffix})`
  });
}

export { createBookmarkDraft };
