/**
 * bookmarks.js
 * ------------------------------------------------------
 * In-memory bookmark store with persistence support.
 *
 * Responsibilities:
 * - Acts as the single source of truth for bookmarks
 * - Keeps an internal in-memory array
 * - Normalizes bookmark data to a stable structure
 * - Provides CRUD operations
 * - Persists changes via the storage abstraction
 *
 * Notes:
 * - Bookmarks are identified by a stable `id`
 * - Consumers must NOT mutate returned objects directly
 * - All mutations should go through this module
 * ------------------------------------------------------
 */

import { storage } from './storage.js';

/**
 * In-memory bookmark list.
 *
 * This is the single source of truth for bookmarks during runtime.
 * All operations should read from and write to this arrays
 * 
 * @type {Array<Object>}
 */
let bookmarks = [];

/**
 * Loads bookmarks from persistent storage into memory.
 *
 * Normalizes all loaded data and replaces the current state.
 *
 * @returns {Promise<Array<Object>>} All bookmarks
 */
export async function loadBookmarks() {
  const data = await storage.get('bookmarks');
  setBookmarks(data?.bookmarks ?? []);

  return [...bookmarks];
}

/**
 * Replaces the current in-memory bookmark list.
 *
 * This function does NOT persist automatically.
 *
 * @param {Array<Object>} data
 */
export function setBookmarks(data) {
  bookmarks = Array.isArray(data)
    ? data.map(normalizeBookmark)
    : [];
}

/**
 * Adds a new bookmark to the store.
 *
 * The bookmark is normalized and persisted.
 *
 * @param {Object} data
 * @returns {Promise<Object>} The created bookmark
 */
export async function addBookmark(data) {
  const bookmark = normalizeBookmark(data);
  bookmarks.push(bookmark);

  await saveBookmarks();

  return bookmark;
}

/**
 * Persists the current in-memory bookmarks to storage.
 *
 * @returns {Promise<Array<Object>>} All bookmarks
 */
export async function saveBookmarks() {
  await storage.set({ bookmarks });

  return [...bookmarks];
}

/**
 * Returns a shallow copy of all bookmarks.
 *
 * Consumers should treat returned objects as read-only.
 *
 * @returns {Array<Object>}
 */
export function getBookmarks() {
  return [...bookmarks];
}

/**
 * Updates a bookmark by id.
 *
 * The bookmark is merged with the provided data,
 * normalized again and persisted.
 *
 * @param {string} bookmarkId
 * @param {Object} updatedData
 * @returns {Promise<Object|null>} Updated bookmark or null if not found
 */
export async function updateBookmarkById(bookmarkId, updatedData) {
  const index = bookmarks.findIndex(bookmark => bookmark.id === bookmarkId);

  if (index === -1) { return null; }

  bookmarks[index] = normalizeBookmark({
    ...bookmarks[index],
    ...updatedData
  });

  await saveBookmarks();

  return bookmarks[index];
}

/**
 * Deletes a bookmark by id.
 *
 * @param {string} bookmarkId
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteBookmarkById(bookmarkId) {
  const index = bookmarks.findIndex(bookmark => bookmark.id === bookmarkId);

  if (index === -1) {
    return false;
  }

  bookmarks.splice(index, 1);

  await saveBookmarks();

  return true;
}

/**
 * Removes all bookmarks from memory and storage.
 *
 * @returns {Promise<Array<Object>>} Empty bookmark list
 */
export async function clearBookmarks() {
  bookmarks = [];

  await saveBookmarks();

  return [...bookmarks];
}

/**
 * Ensures a bookmark has a complete and valid structure.
 *
 * - Fills missing properties with defaults
 * - Generates a UUID if missing
 * - Guarantees grid and visual fields exist
 *
 * @param {Object} bookmark
 * @returns {Object} Normalized bookmark
 */
function normalizeBookmark(bookmark = {}) {
  return {
    id: bookmark.id || crypto.randomUUID(),
    name: bookmark.name ?? 'New Bookmark',
    url: bookmark.url ?? 'https://',
    gx: bookmark.gx ?? 0,
    gy: bookmark.gy ?? 0,
    w: bookmark.w ?? 1,
    h: bookmark.h ?? 1,
    backgroundImageUrl: bookmark.backgroundImageUrl ?? null,
    faviconBackground: bookmark.faviconBackground ?? true,
    invertColorBg: bookmark.invertColorBg ?? false,
    noBackground: bookmark.noBackground ?? false,
    bookmarkColor: bookmark.bookmarkColor ?? "#cccccc",
    showText: bookmark.showText ?? true,
    textColor: bookmark.textColor ?? "#000000",
    showFavicon: bookmark.showFavicon ?? false,
    invertColorIcon: bookmark.invertColorIcon ?? false
  };
}