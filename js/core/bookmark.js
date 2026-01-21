import { storage } from './storage.js';

let bookmarks = [];

export function getBookmarks() {
  return bookmarks;
}

export function setBookmarks(newList) {
  bookmarks = Array.isArray(newList)
    ? newList.map(b => ({ ...b, w: b.w || 1, h: b.h || 1 }))
    : [];
}

export async function addBookmark(bookmark) {
  bookmarks.push(bookmark);
  await saveBookmarks();
  return bookmarks;
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
  return bookmarks;
}

export async function deleteBookmark(index) {
  if (index >= 0 && index < bookmarks.length) {
    bookmarks.splice(index, 1);
    await saveBookmarks();
  }
  return bookmarks;
}

export function createBookmark({ name, url, gx = 0, gy = 0, w = 1, h = 1 }) {
  return {
    id: crypto.randomUUID(),
    name,
    url,
    gx,
    gy,
    w,
    h,
    invertColorBg: false,
    invertColorIcon: false,
    noBackground: false,
    bookmarkColor: "#cccccc",
    textColor: "#000000",
    showFavicon: true,
    showText: true
  };
}