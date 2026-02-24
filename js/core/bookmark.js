import { getState, setState } from './store.js';

export async function addBookmark(data) {
  const { data: stateData } = getState();
  const { bookmarks } = stateData;

  const bookmark = normalizeBookmark(data);
  const updated = [...bookmarks, bookmark];

  setState({
    data: { bookmarks: updated }
  });

  return bookmark;
}

export async function updateBookmarkById(bookmarkId, updatedData) {
  const { data: stateData } = getState();
  const { bookmarks } = stateData;

  const index = bookmarks.findIndex(b => b.id === bookmarkId);
  if (index === -1) return null;

  const updatedBookmark = normalizeBookmark({
    ...bookmarks[index],
    ...updatedData
  });

  const updated = bookmarks.map(b =>
    b.id === bookmarkId ? updatedBookmark : b
  );

  setState({
    data: { bookmarks: updated }
  });

  return updatedBookmark;
}

export async function deleteBookmarkById(bookmarkId) {
  const { data: stateData } = getState();
  const { bookmarks } = stateData;

  const updated = bookmarks.filter(b => b.id !== bookmarkId);
  if (updated.length === bookmarks.length) return false;

  setState({
    data: { bookmarks: updated }
  });

  return true;
}

export async function clearBookmarks() {
  setState({
    data: { bookmarks: [] }
  });

  return [];
}

function normalizeBookmark(bookmark = {}) {
  return {
    id: bookmark.id || crypto.randomUUID(),
    name: bookmark.name ?? null,
    url: bookmark.url ?? null,
    gx: bookmark.gx ?? null,
    gy: bookmark.gy ?? null,
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