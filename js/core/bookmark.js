/**
 * bookmarks.js
 * ------------------------------------------------------
 * In-memory bookmark store with persistence support.
 *
 * This module acts as the single source of truth for all bookmarks:
 * - Keeps an internal bookmarks array in memory
 * - Normalizes bookmark data to ensure consistent structure
 * - Provides CRUD operations (add, update, delete)
 * - Persists changes to chrome.storage via the storage abstraction
 *
 * Bookmarks are identified by a stable `id` (UUID).
 * The UI or other modules should interact with bookmarks only through
 * the exported functions and never mutate the internal array directly.
 *
 * Debug logging is controlled via the DEBUG flag.
 * ------------------------------------------------------
 */

import { storage } from './storage.js';

let bookmarks = [];

export function getBookmarks() {
  return [...bookmarks];
}

export function setBookmarks(newList) {
  bookmarks = Array.isArray(newList)
    ? newList.map(normalizeBookmark)
    : [];
}

export async function addBookmark(data) {
  const bookmark = normalizeBookmark(data);
  bookmarks.push(bookmark);
  await saveBookmarks();
  return bookmark;
}

export async function saveBookmarks() {
  await storage.set({ bookmarks });
  return bookmarks;
}

export async function loadBookmarks() {
  const data = await storage.get('bookmarks');
  setBookmarks(data.bookmarks || []);
  return bookmarks;
}

export async function updateBookmarkById(id, updatedData) {
  const index = bookmarks.findIndex(b => b.id === id);
  if (index !== -1) {
    bookmarks[index] = normalizeBookmark({
      ...bookmarks[index],
      ...updatedData
    });
    await saveBookmarks();
    return bookmarks[index];
  }
}

export async function deleteBookmarkById(id) {
  const index = bookmarks.findIndex(b => b.id === id);
  if (index !== -1) {
    bookmarks.splice(index, 1);
    await saveBookmarks();
  }
  return bookmarks;
}

export async function clearBookmarks() {
  bookmarks = [];
  await saveBookmarks();
}

function normalizeBookmark(bookmark) {
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