import '../types/types.js';
import { findFirstFreeSlot } from './grid.js';
import { getState, setState } from './store.js';

/**
 * Returns the items that currently reserve cells in one workspace.
 * Bookmarks inside folders deliberately do not participate in grid collisions.
 *
 * @param {Pick<DataState, 'bookmarks'|'folders'>} data
 * @param {string|null} groupId
 * @returns {Array<Bookmark|BookmarkFolder>}
 */
export function getGridItemsInGroup(data, groupId) {
  const normalizedGroupId = groupId ?? null;
  return [
    ...data.bookmarks.filter(bookmark => (
      !bookmark.folderId
      && (bookmark.groupId ?? null) === normalizedGroupId
    )),
    ...data.folders.filter(folder => (
      (folder.groupId ?? null) === normalizedGroupId
    ))
  ];
}

/**
 * Creates a fixed-size folder in the first free cell of the active workspace.
 *
 * @param {string} name
 * @param {{columns: number, rows: number}} bounds
 * @returns {BookmarkFolder|null}
 */
export function createBookmarkFolder(name, { columns, rows } = {}) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return null;

  const { data } = getState();
  const groupId = data.settings.activeBookmarkGroupId ?? null;
  const position = findFirstFreeSlot(getGridItemsInGroup(data, groupId), {
    columns,
    rows
  });
  if (!position) return null;

  const now = Date.now();
  const folder = {
    id: crypto.randomUUID(),
    name: normalizedName,
    ...position,
    w: 1,
    h: 1,
    groupId,
    createdAt: now,
    updatedAt: now
  };

  setState({ data: { folders: [...data.folders, folder] } });
  return folder;
}

/** @returns {BookmarkFolder|null} */
export function renameBookmarkFolder(folderId, name) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return null;

  const { data: { folders } } = getState();
  let renamed = null;
  const updated = folders.map(folder => {
    if (folder.id !== folderId) return folder;
    renamed = { ...folder, name: normalizedName, updatedAt: Date.now() };
    return renamed;
  });
  if (!renamed) return null;

  setState({ data: { folders: updated } });
  return renamed;
}

/** @returns {BookmarkFolder|null} */
export function updateBookmarkFolderPosition(folderId, position) {
  const { data: { folders } } = getState();
  let moved = null;
  const updated = folders.map(folder => {
    if (folder.id !== folderId) return folder;
    moved = {
      ...folder,
      gx: position.gx,
      gy: position.gy,
      updatedAt: Date.now()
    };
    return moved;
  });
  if (!moved) return null;

  setState({ data: { folders: updated } });
  return moved;
}

/**
 * Moves a bookmark into a folder in the same workspace.
 *
 * @returns {Bookmark|null}
 */
export function addBookmarkToFolder(bookmarkId, folderId) {
  const { data: { bookmarks, folders } } = getState();
  const folder = folders.find(item => item.id === folderId);
  const bookmark = bookmarks.find(item => item.id === bookmarkId);
  if (
    !folder
    || !bookmark
    || (folder.groupId ?? null) !== (bookmark.groupId ?? null)
  ) return null;

  let moved = null;
  const updated = bookmarks.map(item => {
    if (item.id !== bookmarkId) return item;
    moved = { ...item, folderId, updatedAt: Date.now() };
    return moved;
  });

  setState({ data: { bookmarks: updated } });
  return moved;
}

/**
 * Returns a bookmark to the first free cell in its folder's workspace.
 *
 * @returns {{bookmark: Bookmark|null, reason: 'not-found'|'no-space'|null}}
 */
export function removeBookmarkFromFolder(bookmarkId, { columns, rows } = {}) {
  const { data } = getState();
  const bookmark = data.bookmarks.find(item => item.id === bookmarkId);
  const folder = data.folders.find(item => item.id === bookmark?.folderId);
  if (!bookmark || !folder) return { bookmark: null, reason: 'not-found' };

  const position = findFirstFreeSlot(
    getGridItemsInGroup(data, folder.groupId),
    { columns, rows, w: bookmark.w, h: bookmark.h }
  );
  if (!position) return { bookmark: null, reason: 'no-space' };

  const restored = {
    ...bookmark,
    ...position,
    folderId: null,
    updatedAt: Date.now()
  };
  setState({
    data: {
      bookmarks: data.bookmarks.map(item => (
        item.id === bookmarkId ? restored : item
      ))
    }
  });
  return { bookmark: restored, reason: null };
}

/**
 * Deletes a folder and every bookmark contained by it in one undoable change.
 *
 * @returns {{deleted: boolean, bookmarkCount: number}}
 */
export function deleteBookmarkFolder(folderId) {
  const { data: { bookmarks, folders } } = getState();
  if (!folders.some(folder => folder.id === folderId)) {
    return { deleted: false, bookmarkCount: 0 };
  }

  const remainingBookmarks = bookmarks.filter(bookmark => bookmark.folderId !== folderId);
  const bookmarkCount = bookmarks.length - remainingBookmarks.length;
  setState({
    data: {
      bookmarks: remainingBookmarks,
      folders: folders.filter(folder => folder.id !== folderId)
    }
  });
  return { deleted: true, bookmarkCount };
}
