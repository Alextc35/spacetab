import '../../types/types.js';
import {
  applyBookmarkPreset,
  normalizeBookmark
} from '../../domain/bookmarks/bookmarkModel.js';
import { DEFAULT_FOLDER_STYLE } from '../../domain/folders/folderDefaults.js';
import { resolveWorkspaceId } from '../../domain/workspaces/workspaceModel.js';
import { findFirstFreeSlot } from '../../shared/grid/gridPlacement.js';
import { clearBookmarkHistory, getState, setState } from '../../core/store.js';
import { getGridItemsInGroup } from './gridSelectors.js';
import { getWorkspaces } from '../workspaces/workspaceSelectors.js';

/** Applies the appropriate default appearance to bookmarks and folders atomically. */
export function applyDefaultStylesToGridItems(selectedItems, bookmarkPreset) {
  const { bookmarkIds, folderIds } = selectedSets(selectedItems);
  if (!bookmarkIds.size && !folderIds.size) return { bookmarks: 0, folders: 0 };

  const { data } = getState();
  const now = Date.now();
  let bookmarkCount = 0;
  let folderCount = 0;
  const bookmarks = data.bookmarks.map(bookmark => {
    if (!bookmarkIds.has(bookmark.id)) return bookmark;
    bookmarkCount += 1;
    return normalizeBookmark({
      ...bookmark,
      ...applyBookmarkPreset(bookmark, bookmarkPreset),
      updatedAt: now
    }, { now });
  });
  const folders = data.folders.map(folder => {
    if (!folderIds.has(folder.id)) return folder;
    folderCount += 1;
    return {
      ...folder,
      ...structuredClone(DEFAULT_FOLDER_STYLE),
      updatedAt: now
    };
  });

  if (bookmarkCount || folderCount) setState({ data: { bookmarks, folders } });
  return { bookmarks: bookmarkCount, folders: folderCount };
}

/**
 * Duplicates top-level bookmarks and complete folders into free grid cells.
 * Folder children receive new identities and remain inside the cloned folder.
 */
export function duplicateGridItems(selectedItems, {
  columns,
  rows,
  nameSuffix = 'copy'
} = {}) {
  const { bookmarkIds, folderIds } = selectedSets(selectedItems);
  const { data } = getState();
  const selectedFolderChildIds = new Set(data.bookmarks
    .filter(bookmark => folderIds.has(bookmark.folderId))
    .map(bookmark => bookmark.id));
  const sources = [
    ...data.bookmarks
      .filter(bookmark => bookmarkIds.has(bookmark.id) && !selectedFolderChildIds.has(bookmark.id))
      .map(item => ({ kind: 'bookmark', item })),
    ...data.folders
      .filter(folder => folderIds.has(folder.id))
      .map(item => ({ kind: 'folder', item }))
  ].sort(compareGridSources);
  if (!sources.length) return { duplicates: [], skipped: 0 };

  const occupied = [
    ...data.bookmarks.filter(bookmark => !bookmark.folderId),
    ...data.folders,
    ...(data.settings.showRecycleBin ? [data.recycleBin] : [])
  ];
  const duplicateBookmarks = [];
  const duplicateFolders = [];
  const duplicates = [];
  let skipped = 0;

  for (const source of sources) {
    const groupId = source.item.groupId ?? null;
    const position = findFirstFreeSlot(occupied.filter(item => (
      (item.groupId ?? null) === groupId
    )), {
      columns,
      rows,
      w: source.item.w,
      h: source.item.h
    });
    if (!position) {
      skipped += 1;
      continue;
    }

    if (source.kind === 'bookmark') {
      const duplicate = createBookmarkDuplicate(source.item, position, nameSuffix);
      duplicateBookmarks.push(duplicate);
      duplicates.push({ kind: 'bookmark', item: duplicate });
      occupied.push(duplicate);
      continue;
    }

    const duplicate = createFolderDuplicate(source.item, position, nameSuffix);
    const children = data.bookmarks
      .filter(bookmark => bookmark.folderId === source.item.id)
      .map(bookmark => createFolderChildDuplicate(bookmark, duplicate));
    duplicateFolders.push(duplicate);
    duplicateBookmarks.push(...children);
    duplicates.push({ kind: 'folder', item: duplicate });
    occupied.push(duplicate);
  }

  if (duplicates.length) {
    setState({
      data: {
        bookmarks: [...data.bookmarks, ...duplicateBookmarks],
        folders: [...data.folders, ...duplicateFolders]
      }
    });
  }
  return { duplicates, skipped };
}

/** Moves selected bookmarks and complete folders to another workspace atomically. */
export function moveGridItemsToWorkspace(selectedItems, workspaceId, { columns, rows } = {}) {
  const { bookmarkIds, folderIds } = selectedSets(selectedItems);
  const { data } = getState();
  const normalizedGroupId = resolveWorkspaceId(
    getWorkspaces(data),
    workspaceId
  );
  const selectedFolderChildIds = new Set(data.bookmarks
    .filter(bookmark => folderIds.has(bookmark.folderId))
    .map(bookmark => bookmark.id));
  const sources = [
    ...data.bookmarks
      .filter(bookmark => (
        bookmarkIds.has(bookmark.id)
        && !selectedFolderChildIds.has(bookmark.id)
        && (bookmark.groupId ?? null) !== normalizedGroupId
      ))
      .map(item => ({ kind: 'bookmark', item })),
    ...data.folders
      .filter(folder => (
        folderIds.has(folder.id)
        && (folder.groupId ?? null) !== normalizedGroupId
      ))
      .map(item => ({ kind: 'folder', item }))
  ].sort(compareGridSources);
  if (!sources.length) return { moved: 0, skipped: 0 };

  const occupied = getGridItemsInGroup(data, normalizedGroupId);
  const replacements = new Map();
  const movedFolderIds = new Set();
  let moved = 0;
  let skipped = 0;
  const now = Date.now();

  for (const source of sources) {
    const position = findFirstFreeSlot(occupied, {
      columns,
      rows,
      w: source.item.w,
      h: source.item.h
    });
    if (!position) {
      skipped += 1;
      continue;
    }

    const replacement = {
      ...source.item,
      ...position,
      groupId: normalizedGroupId,
      ...(source.kind === 'bookmark' ? { folderId: null } : {}),
      updatedAt: now
    };
    replacements.set(source.item.id, replacement);
    if (source.kind === 'folder') movedFolderIds.add(source.item.id);
    occupied.push(replacement);
    moved += 1;
  }

  if (moved) {
    const bookmarks = data.bookmarks.map(bookmark => {
      const replacement = replacements.get(bookmark.id);
      if (replacement) return replacement;
      if (!movedFolderIds.has(bookmark.folderId)) return bookmark;
      return { ...bookmark, groupId: normalizedGroupId, updatedAt: now };
    });
    const folders = data.folders.map(folder => replacements.get(folder.id) ?? folder);
    setState({ data: { bookmarks, folders } });
  }
  return { moved, skipped };
}

/** Permanently deletes one live bookmark or complete folder without creating undo history. */
export function permanentlyDeleteGridItem(kind, itemId) {
  const { data } = getState();
  if (kind === 'bookmark') {
    const bookmarks = data.bookmarks.filter(bookmark => bookmark.id !== itemId);
    if (bookmarks.length === data.bookmarks.length) {
      return { deleted: false, bookmarkCount: 0 };
    }
    setState({ data: { bookmarks } }, { recordHistory: false });
    clearBookmarkHistory();
    return { deleted: true, bookmarkCount: 1 };
  }

  if (kind !== 'folder' || !data.folders.some(folder => folder.id === itemId)) {
    return { deleted: false, bookmarkCount: 0 };
  }

  const bookmarkCount = data.bookmarks.filter(bookmark => bookmark.folderId === itemId).length;
  setState({
    data: {
      bookmarks: data.bookmarks.filter(bookmark => bookmark.folderId !== itemId),
      folders: data.folders.filter(folder => folder.id !== itemId)
    }
  }, { recordHistory: false });
  clearBookmarkHistory();
  return { deleted: true, bookmarkCount };
}

function selectedSets(selectedItems) {
  const bookmarkIds = new Set();
  const folderIds = new Set();
  for (const selected of selectedItems ?? []) {
    if (selected?.kind === 'bookmark') bookmarkIds.add(selected.id);
    if (selected?.kind === 'folder') folderIds.add(selected.id);
  }
  return { bookmarkIds, folderIds };
}

function compareGridSources(a, b) {
  return (a.item.groupId ?? '').localeCompare(b.item.groupId ?? '')
    || a.item.gy - b.item.gy
    || a.item.gx - b.item.gx
    || a.item.id.localeCompare(b.item.id);
}

function createBookmarkDuplicate(bookmark, position, nameSuffix) {
  const duplicate = structuredClone(bookmark);
  delete duplicate.id;
  delete duplicate.createdAt;
  delete duplicate.updatedAt;
  return normalizeBookmark({
    ...duplicate,
    ...position,
    folderId: null,
    name: `${bookmark.name} (${nameSuffix})`
  });
}

function createFolderDuplicate(folder, position, nameSuffix) {
  const now = Date.now();
  return {
    ...structuredClone(folder),
    id: crypto.randomUUID(),
    ...position,
    name: `${folder.name} (${nameSuffix})`,
    createdAt: now,
    updatedAt: now
  };
}

function createFolderChildDuplicate(bookmark, folder) {
  const duplicate = structuredClone(bookmark);
  delete duplicate.id;
  delete duplicate.createdAt;
  delete duplicate.updatedAt;
  return normalizeBookmark({
    ...duplicate,
    groupId: folder.groupId,
    folderId: folder.id
  });
}
