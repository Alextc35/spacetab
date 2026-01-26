import { storage } from './storage.js';

let bookmarks = [];

export async function loadBookmarks() {
  const data = await storage.get('bookmarks');
  setBookmarks(data?.bookmarks ?? []);

  return [...bookmarks];
}

export function setBookmarks(data) {
  bookmarks = Array.isArray(data)
    ? data.map(normalizeBookmark)
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

  return [...bookmarks];
}

export function getBookmarks() {
  return [...bookmarks];
}

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

export async function deleteBookmarkById(bookmarkId) {
  const index = bookmarks.findIndex(bookmark => bookmark.id === bookmarkId);

  if (index === -1) {
    return false;
  }

  bookmarks.splice(index, 1);

  await saveBookmarks();

  return true;
}

export async function clearBookmarks() {
  bookmarks = [];

  await saveBookmarks();

  return [...bookmarks];
}

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