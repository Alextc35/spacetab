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
 * Creates a folder in the first free cell of the active workspace.
 * New folders start at one cell and can then be resized in edit mode.
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

/**
 * Updates bookmark and folder grid rectangles in one state transition.
 * Keeping both collections in the same write makes smart mixed-item drags
 * atomic and therefore produces a single undo step.
 *
 * @param {Map<string, Partial<Pick<Bookmark, 'gx'|'gy'|'w'|'h'>>>} updates
 * @returns {Array<Bookmark|BookmarkFolder>}
 */
export function updateGridItemsByIds(updates) {
  if (!(updates instanceof Map) || !updates.size) return [];

  const { data } = getState();
  const changed = [];
  const now = Date.now();
  const updateItem = item => {
    const patch = updates.get(item.id);
    if (!patch) return item;

    const rectangle = {
      gx: patch.gx ?? item.gx,
      gy: patch.gy ?? item.gy,
      w: patch.w ?? item.w,
      h: patch.h ?? item.h
    };
    if (
      !Number.isInteger(rectangle.gx) || rectangle.gx < 0
      || !Number.isInteger(rectangle.gy) || rectangle.gy < 0
      || !Number.isInteger(rectangle.w) || rectangle.w < 1
      || !Number.isInteger(rectangle.h) || rectangle.h < 1
    ) return item;

    if (
      rectangle.gx === item.gx
      && rectangle.gy === item.gy
      && rectangle.w === item.w
      && rectangle.h === item.h
    ) return item;

    const updated = { ...item, ...rectangle, updatedAt: now };
    changed.push(updated);
    return updated;
  };

  const bookmarks = data.bookmarks.map(updateItem);
  const folders = data.folders.map(updateItem);
  if (changed.length) setState({ data: { bookmarks, folders } });
  return changed;
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
