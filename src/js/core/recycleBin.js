import '../types/types.js';
import { GRID_COLS, GRID_ROWS } from './config.js';
import { DEFAULT_RECYCLE_BIN } from './defaults.js';
import {
  cellKey,
  createFolderBookmarkLayout,
  FOLDER_GRID_CAPACITY,
  findFirstFreeFolderCell
} from './folderGrid.js';
import { findFirstFreeSlot, isAreaFree } from './grid.js';
import { clearBookmarkHistory, getState, setState } from './store.js';

export const RECYCLE_BIN_RETENTION_DAYS = 28;
export const RECYCLE_BIN_RETENTION_MS = RECYCLE_BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function makeTrashId() {
  return crypto.randomUUID();
}

function bookmarkEntry(bookmark, deletedAt) {
  return {
    id: makeTrashId(),
    type: 'bookmark',
    deletedAt,
    bookmark: structuredClone(bookmark)
  };
}

function folderEntry(folder, bookmarks, deletedAt) {
  return {
    id: makeTrashId(),
    type: 'folder',
    deletedAt,
    folder: structuredClone(folder),
    bookmarks: structuredClone(bookmarks)
  };
}

/** Moves bookmarks to the recycle bin in one undoable state change. */
export function moveBookmarksToRecycleBin(bookmarkIds) {
  const ids = new Set(bookmarkIds);
  if (!ids.size) return 0;

  const { data } = getState();
  const deleted = data.bookmarks.filter(bookmark => ids.has(bookmark.id));
  if (!deleted.length) return 0;

  const deletedAt = Date.now();
  setState({
    data: {
      bookmarks: data.bookmarks.filter(bookmark => !ids.has(bookmark.id)),
      trash: [...data.trash, ...deleted.map(bookmark => bookmarkEntry(bookmark, deletedAt))]
    }
  });
  return deleted.length;
}

/** Moves a folder and all of its contents to the recycle bin as one unit. */
export function moveFolderToRecycleBin(folderId) {
  const { data } = getState();
  const folder = data.folders.find(item => item.id === folderId);
  if (!folder) return { deleted: false, bookmarkCount: 0 };

  const children = data.bookmarks.filter(bookmark => bookmark.folderId === folderId);
  const childIds = new Set(children.map(bookmark => bookmark.id));
  setState({
    data: {
      bookmarks: data.bookmarks.filter(bookmark => !childIds.has(bookmark.id)),
      folders: data.folders.filter(item => item.id !== folderId),
      trash: [...data.trash, folderEntry(folder, children, Date.now())]
    }
  });
  return { deleted: true, bookmarkCount: children.length };
}

/** Moves a mixed selection of top-level bookmarks and folders in one undo step. */
export function moveGridItemsToRecycleBin({ bookmarkIds = [], folderIds = [] } = {}) {
  const requestedBookmarkIds = new Set(bookmarkIds);
  const requestedFolderIds = new Set(folderIds);
  if (!requestedBookmarkIds.size && !requestedFolderIds.size) {
    return { bookmarks: 0, folders: 0 };
  }

  const { data } = getState();
  const folders = data.folders.filter(folder => requestedFolderIds.has(folder.id));
  const existingFolderIds = new Set(folders.map(folder => folder.id));
  const folderChildren = data.bookmarks.filter(bookmark => existingFolderIds.has(bookmark.folderId));
  const folderChildIds = new Set(folderChildren.map(bookmark => bookmark.id));
  const bookmarks = data.bookmarks.filter(bookmark => (
    requestedBookmarkIds.has(bookmark.id) && !folderChildIds.has(bookmark.id)
  ));
  if (!bookmarks.length && !folders.length) return { bookmarks: 0, folders: 0 };

  const deletedAt = Date.now();
  const entries = folders.map(folder => folderEntry(
    folder,
    folderChildren.filter(bookmark => bookmark.folderId === folder.id),
    deletedAt
  ));
  entries.push(...bookmarks.map(bookmark => bookmarkEntry(bookmark, deletedAt)));
  const deletedBookmarkIds = new Set([
    ...folderChildIds,
    ...bookmarks.map(bookmark => bookmark.id)
  ]);

  setState({
    data: {
      bookmarks: data.bookmarks.filter(bookmark => !deletedBookmarkIds.has(bookmark.id)),
      folders: data.folders.filter(folder => !existingFolderIds.has(folder.id)),
      trash: [...data.trash, ...entries]
    }
  });
  return { bookmarks: bookmarks.length, folders: folders.length };
}

/** Moves all requested grid data to the recycle bin. */
export function moveAllToRecycleBin({ includeFolders = false } = {}) {
  const { data } = getState();
  const deletedAt = Date.now();

  if (!includeFolders) {
    if (!data.bookmarks.length) return true;
    setState({
      data: {
        bookmarks: [],
        trash: [
          ...data.trash,
          ...data.bookmarks.map(bookmark => bookmarkEntry(bookmark, deletedAt))
        ]
      }
    });
    return true;
  }

  const entries = createCollectionEntries(data.bookmarks, data.folders, deletedAt);
  if (!entries.length) return true;

  setState({
    data: {
      bookmarks: [],
      folders: [],
      trash: [...data.trash, ...entries]
    }
  });
  return true;
}

/** Replaces an imported grid without permanently discarding the previous one. */
export async function replaceGridDataThroughRecycleBin(bookmarks, folders) {
  const { data } = getState();
  const entries = createCollectionEntries(data.bookmarks, data.folders, Date.now());
  await setState({
    data: {
      bookmarks,
      folders,
      trash: [...data.trash, ...entries]
    }
  });
  return entries.length;
}

/** Deletes a workspace while retaining its contents in the recycle bin. */
export function moveWorkspaceToRecycleBin(groupId, nextSettings) {
  const { data } = getState();
  const folders = data.folders.filter(folder => folder.groupId === groupId);
  const folderIds = new Set(folders.map(folder => folder.id));
  const bookmarks = data.bookmarks.filter(bookmark => bookmark.groupId === groupId);
  const deletedAt = Date.now();
  const entries = folders.map(folder => folderEntry(
    folder,
    bookmarks.filter(bookmark => bookmark.folderId === folder.id),
    deletedAt
  ));
  entries.push(...bookmarks
    .filter(bookmark => !folderIds.has(bookmark.folderId))
    .map(bookmark => bookmarkEntry(bookmark, deletedAt)));

  setState({
    data: {
      bookmarks: data.bookmarks.filter(bookmark => bookmark.groupId !== groupId),
      folders: data.folders.filter(folder => folder.groupId !== groupId),
      trash: [...data.trash, ...entries],
      settings: nextSettings
    }
  }, { recordHistory: false });
  return entries.length;
}

export function permanentlyDeleteTrashEntries(entryIds) {
  const ids = new Set(entryIds);
  if (!ids.size) return 0;
  const { data } = getState();
  const next = data.trash.filter(entry => !ids.has(entry.id));
  const count = data.trash.length - next.length;
  if (count) {
    setState({ data: { trash: next } }, { recordHistory: false });
    clearBookmarkHistory();
  }
  return count;
}

export function emptyRecycleBin() {
  const { data } = getState();
  if (!data.trash.length) return 0;
  const count = data.trash.length;
  setState({ data: { trash: [] } }, { recordHistory: false });
  clearBookmarkHistory();
  return count;
}

/** Permanently removes entries after their 28-day retention period. */
export function purgeExpiredRecycleBinEntries(now = Date.now()) {
  const { data } = getState();
  const next = data.trash.filter(entry => (
    now - entry.deletedAt < RECYCLE_BIN_RETENTION_MS
  ));
  const count = data.trash.length - next.length;
  if (count) {
    setState({ data: { trash: next } }, { recordHistory: false });
    clearBookmarkHistory();
  }
  return count;
}

/**
 * Restores entries where there is room. Items that cannot fit remain in the bin.
 * Folder contents are restored atomically with their folder.
 */
export function restoreTrashEntries(entryIds) {
  const requested = new Set(entryIds);
  if (!requested.size) return { restored: 0, skipped: 0 };

  const { data } = getState();
  const selected = data.trash.filter(entry => requested.has(entry.id))
    .sort((a, b) => Number(b.type === 'folder') - Number(a.type === 'folder'));
  let bookmarks = structuredClone(data.bookmarks);
  let folders = structuredClone(data.folders);
  const restoredEntryIds = new Set();
  let restored = 0;
  let skipped = 0;

  for (const entry of selected) {
    if (entry.type === 'folder') {
      const result = restoreFolderEntry(entry, { data, bookmarks, folders });
      if (!result) {
        skipped += 1;
        continue;
      }
      bookmarks = result.bookmarks;
      folders = result.folders;
    } else {
      const result = restoreBookmarkEntry(entry, { data, bookmarks, folders });
      if (!result) {
        skipped += 1;
        continue;
      }
      bookmarks = result.bookmarks;
    }
    restoredEntryIds.add(entry.id);
    restored += 1;
  }

  if (restored) {
    setState({
      data: {
        bookmarks,
        folders,
        trash: data.trash.filter(entry => !restoredEntryIds.has(entry.id))
      }
    });
  }
  return { restored, skipped };
}

export function restoreAllTrashEntries() {
  return restoreTrashEntries(getState().data.trash.map(entry => entry.id));
}

function restoreFolderEntry(entry, { data, bookmarks, folders }) {
  const validGroupId = resolveGroupId(data.settings, entry.folder.groupId);
  const folderId = uniqueId(entry.folder.id, new Set(folders.map(folder => folder.id)));
  const candidate = {
    ...structuredClone(entry.folder),
    id: folderId,
    groupId: validGroupId,
    updatedAt: Date.now()
  };
  const position = findRestorePosition(candidate, occupiedGridItems(
    { ...data, bookmarks, folders },
    validGroupId
  ));
  if (!position) return null;

  const folder = { ...candidate, ...position };
  const bookmarkIds = new Set(bookmarks.map(bookmark => bookmark.id));
  const children = entry.bookmarks.map(bookmark => {
    const id = uniqueId(bookmark.id, bookmarkIds);
    bookmarkIds.add(id);
    return {
      ...structuredClone(bookmark),
      id,
      folderId,
      groupId: validGroupId,
      updatedAt: Date.now()
    };
  });
  return { bookmarks: [...bookmarks, ...children], folders: [...folders, folder] };
}

function restoreBookmarkEntry(entry, { data, bookmarks, folders }) {
  const bookmarkIds = new Set(bookmarks.map(bookmark => bookmark.id));
  const id = uniqueId(entry.bookmark.id, bookmarkIds);
  const original = { ...structuredClone(entry.bookmark), id, updatedAt: Date.now() };
  const folder = folders.find(item => item.id === original.folderId);

  if (folder) {
    const contents = bookmarks.filter(bookmark => bookmark.folderId === folder.id);
    if (contents.length < FOLDER_GRID_CAPACITY) {
      const layout = createFolderBookmarkLayout(contents);
      const occupied = new Set(Array.from(layout.values(), position => (
        cellKey(position.gx, position.gy)
      )));
      const position = findFirstFreeFolderCell(occupied);
      if (position) {
        return {
          bookmarks: [...bookmarks, {
            ...original,
            ...position,
            folderId: folder.id,
            groupId: folder.groupId
          }]
        };
      }
    }
  }

  const groupId = resolveGroupId(data.settings, original.groupId);
  const candidate = { ...original, groupId, folderId: null };
  const position = findRestorePosition(candidate, occupiedGridItems(
    { ...data, bookmarks, folders },
    groupId
  ));
  if (!position) return null;
  return { bookmarks: [...bookmarks, { ...candidate, ...position }] };
}

function findRestorePosition(item, occupied) {
  const inBounds = item.gx >= 0 && item.gy >= 0
    && item.gx + item.w <= GRID_COLS
    && item.gy + item.h <= GRID_ROWS;
  if (inBounds && isAreaFree(occupied, item.gx, item.gy, item.w, item.h)) {
    return { gx: item.gx, gy: item.gy };
  }
  return findFirstFreeSlot(occupied, {
    columns: GRID_COLS,
    rows: GRID_ROWS,
    w: item.w,
    h: item.h
  });
}

function occupiedGridItems(data, groupId) {
  const normalizedGroupId = groupId ?? null;
  const items = [
    ...data.bookmarks.filter(bookmark => (
      !bookmark.folderId && (bookmark.groupId ?? null) === normalizedGroupId
    )),
    ...data.folders.filter(folder => (
      (folder.groupId ?? null) === normalizedGroupId
    ))
  ];
  if (normalizedGroupId === null && data.settings.showRecycleBin) {
    items.push(data.recycleBin);
  }
  return items;
}

function resolveGroupId(settings, groupId) {
  return settings.bookmarkGroups.some(group => group.id === groupId) ? groupId : null;
}

function uniqueId(preferred, used) {
  if (typeof preferred === 'string' && preferred && !used.has(preferred)) return preferred;
  let id = makeTrashId();
  while (used.has(id)) id = makeTrashId();
  return id;
}

function createCollectionEntries(bookmarks, folders, deletedAt) {
  const folderIds = new Set(folders.map(folder => folder.id));
  return [
    ...folders.map(folder => folderEntry(
      folder,
      bookmarks.filter(bookmark => bookmark.folderId === folder.id),
      deletedAt
    )),
    ...bookmarks
      .filter(bookmark => !folderIds.has(bookmark.folderId))
      .map(bookmark => bookmarkEntry(bookmark, deletedAt))
  ];
}

/** Relocates a newly shown or migrated recycle bin if its saved area is occupied. */
export function ensureRecycleBinPosition() {
  const { data } = getState();
  if (!data.settings.showRecycleBin) return true;
  const occupied = occupiedGridItems({
    ...data,
    settings: { ...data.settings, showRecycleBin: false }
  }, null);
  const bin = data.recycleBin ?? structuredClone(DEFAULT_RECYCLE_BIN);
  const fits = bin.gx + bin.w <= GRID_COLS
    && bin.gy + bin.h <= GRID_ROWS
    && isAreaFree(occupied, bin.gx, bin.gy, bin.w, bin.h);
  if (fits) return true;

  const position = findFirstFreeSlot(occupied, {
    columns: GRID_COLS,
    rows: GRID_ROWS,
    w: bin.w,
    h: bin.h
  });
  if (!position) return false;
  setState({
    data: {
      recycleBin: { ...bin, ...position, groupId: null, updatedAt: Date.now() }
    }
  }, { recordHistory: false });
  return true;
}
