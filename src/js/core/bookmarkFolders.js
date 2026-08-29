import '../types/types.js';
import { findFirstFreeSlot } from './grid.js';
import {
  cellKey,
  createFolderBookmarkLayout,
  FOLDER_GRID_CAPACITY,
  findFirstFreeFolderCell,
  isFolderCell
} from './folderGrid.js';
import { getState, setState } from './store.js';
import { normalizeFolderStyle, validateFolderDraft } from './folderModel.js';

export const BOOKMARK_FOLDER_NAME_MAX_LENGTH = 60;

function normalizeBookmarkFolderName(name) {
  return typeof name === 'string'
    ? name.trim().slice(0, BOOKMARK_FOLDER_NAME_MAX_LENGTH)
    : '';
}

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
  const normalizedName = normalizeBookmarkFolderName(name);
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
    ...normalizeFolderStyle(),
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
  const normalizedName = normalizeBookmarkFolderName(name);
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

/** Updates the editable identity and appearance of one folder. */
export function updateBookmarkFolder(folderId, draft) {
  const validation = validateFolderDraft(draft);
  if (!validation.isValid) return null;

  const { data: { folders } } = getState();
  let updatedFolder = null;
  const updated = folders.map(folder => {
    if (folder.id !== folderId) return folder;
    updatedFolder = {
      ...folder,
      ...validation.value,
      name: normalizeBookmarkFolderName(validation.value.name),
      updatedAt: Date.now()
    };
    return updatedFolder;
  });
  if (!updatedFolder?.name) return null;

  setState({ data: { folders: updated } });
  return updatedFolder;
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
  const contents = bookmarks.filter(item => item.folderId === folderId);
  if (
    !folder
    || !bookmark
    || contents.length >= FOLDER_GRID_CAPACITY
    || (folder.groupId ?? null) !== (bookmark.groupId ?? null)
  ) return null;

  const layout = createFolderBookmarkLayout(contents);
  const occupied = new Set(
    Array.from(layout.values(), position => cellKey(position.gx, position.gy))
  );
  const position = findFirstFreeFolderCell(occupied);
  if (!position) return null;

  let moved = null;
  const updated = bookmarks.map(item => {
    if (item.id !== bookmarkId) return item;
    moved = { ...item, ...position, folderId, updatedAt: Date.now() };
    return moved;
  });

  setState({ data: { bookmarks: updated } });
  return moved;
}

/**
 * Commits a complete smart-drag preview inside one folder. All supplied
 * positions are validated and applied with legacy layout normalization in a
 * single store transition, so Sequence remains one undoable action.
 *
 * @param {string} folderId
 * @param {Iterable<{id: string, gx: number, gy: number}>} positions
 * @returns {Bookmark[]}
 */
export function updateFolderBookmarkPositions(folderId, positions) {
  const requested = new Map(Array.from(positions ?? [], position => [
    position.id,
    { gx: position.gx, gy: position.gy }
  ]));
  if (!requested.size) return [];

  const { data: { bookmarks } } = getState();
  const contents = bookmarks.filter(bookmark => bookmark.folderId === folderId);
  const contentIds = new Set(contents.map(bookmark => bookmark.id));
  if (Array.from(requested).some(([id, position]) => (
    !contentIds.has(id) || !isFolderCell(position.gx, position.gy)
  ))) return [];

  const layout = createFolderBookmarkLayout(contents);
  for (const [id, position] of requested) layout.set(id, position);

  const occupied = new Set();
  for (const position of layout.values()) {
    if (!isFolderCell(position.gx, position.gy)) continue;
    const key = cellKey(position.gx, position.gy);
    if (occupied.has(key)) return [];
    occupied.add(key);
  }

  const now = Date.now();
  const changed = [];
  const updated = bookmarks.map(bookmark => {
    if (bookmark.folderId !== folderId) return bookmark;
    const position = layout.get(bookmark.id);
    if (
      !position
      || (bookmark.gx === position.gx && bookmark.gy === position.gy)
    ) return bookmark;

    const next = { ...bookmark, ...position, updatedAt: now };
    changed.push(next);
    return next;
  });

  if (changed.length) setState({ data: { bookmarks: updated } });
  return changed;
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
