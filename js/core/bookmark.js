import { storage } from './storage.js';

let bookmarks = [];

export function getBookmarks() {
  return bookmarks;
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
  console.log('Bookmark added:', bookmark);
  return bookmark;
}

export async function saveBookmarks() {
  await storage.set({ bookmarks });
  console.log('Bookmarks saved:', bookmarks);
}

export async function loadBookmarks() {
  const data = await storage.get('bookmarks');
  setBookmarks(data.bookmarks || []);
  console.log('Bookmarks loaded:', bookmarks);
  return bookmarks;
}

export async function updateBookmark(index, updatedData) {
  if (bookmarks[index]) {
    bookmarks[index] = { ...bookmarks[index], ...updatedData };
    await saveBookmarks();
  }
  console.log('Bookmark updated at index', index, ':', bookmarks[index]);
  return bookmarks;
}

export async function deleteBookmark(index) {
  if (index >= 0 && index < bookmarks.length) {
    bookmarks.splice(index, 1);
    await saveBookmarks();
  }
  console.log('Bookmark deleted at index', index);
  return bookmarks;
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