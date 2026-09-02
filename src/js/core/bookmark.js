import '../types/types.js'; // typedefs
import { debug } from './debug.js';
import { getState, setState } from './store.js';
import {
  applyBookmarkPreset,
  createBookmarkDraft,
  normalizeBookmark as normalizeBookmarkValue,
  validateBookmarkDraft
} from './bookmarkModel.js';
import { findFirstFreeSlot } from './grid.js';
import { getGridItemsInGroup } from './bookmarkFolders.js';

/**
 * Adds a new bookmark to the application state.
 *
 * The input data can be partial. Missing properties
 * will be normalized with default values.
 *
 * @param {Partial<Bookmark>} data - Partial bookmark data.
 * @returns {Bookmark} The created bookmark.
 */
export function addBookmark(data) {
  const trace = debug.start('Crear favorito');
  const { data: { bookmarks, settings } } = getState();
  const validation = validateBookmarkDraft(data);
  if (!validation.isValid) {
    trace.end({ status: 'skipped', reason: 'Datos inválidos' });
    return null;
  }

  const bookmark = normalizeBookmarkValue(validation.value, {
    preset: settings.bookmarkDefault
  });
  const updated = [...bookmarks, bookmark];

  setState({ data: { bookmarks: updated } }, { debugTrace: trace });

  return bookmark;
}

/**
 * Updates an existing bookmark by its id.
 *
 * Merges the provided partial data with the current bookmark
 * and normalizes the result to ensure all required properties exist.
 *
 * @param {string} bookmarkId - The id of the bookmark to update.
 * @param {Partial<Bookmark>} updatedData - Partial data to merge into the bookmark.
 * @returns {Bookmark|null} The updated bookmark, or null if not found.
 */
export function updateBookmarkById(bookmarkId, updatedData) {
  const trace = debug.start('Editar favorito', { bookmarkId });
  const { data } = getState();
  const { bookmarks } = data;

  let updatedBookmark = null;

  const updated = bookmarks.map(b => {
    if (b.id !== bookmarkId) return b;

    const validation = validateBookmarkDraft({
      ...b,
      ...updatedData
    });

    if (!validation.isValid) return b;
    updatedBookmark = normalizeBookmarkValue({
      ...b,
      ...validation.value
    });

    return updatedBookmark;
  });

  if (!updatedBookmark) {
    trace.end({ status: 'skipped', reason: 'No encontrado o datos inválidos' });
    return null;
  }

  setState({ data: { bookmarks: updated } }, { debugTrace: trace });

  return updatedBookmark;
}

/**
 * Removes all bookmarks from the state.
 * 
 * @return {boolean} True if the all bookmarks were removed, false otherwise.
 */
export function clearBookmarks() {
  const trace = debug.start('Eliminar todos los favoritos');
  setState({ data: { bookmarks: [] } }, { debugTrace: trace });
  return true;
}

/**
 * Updates several bookmarks in one state transition and one undo step.
 *
 * @param {Iterable<string>} bookmarkIds
 * @param {(bookmark: Bookmark) => Partial<Bookmark>} updater
 * @returns {Bookmark[]}
 */
export function updateBookmarksByIds(bookmarkIds, updater) {
  const trace = debug.start('Actualizar varios favoritos');
  const ids = new Set(bookmarkIds);
  if (!ids.size) {
    trace.end({ status: 'skipped', reason: 'Selección vacía' });
    return [];
  }

  const { data: { bookmarks } } = getState();
  const changed = [];
  const updated = bookmarks.map(bookmark => {
    if (!ids.has(bookmark.id)) return bookmark;

    const candidate = {
      ...bookmark,
      ...updater(structuredClone(bookmark))
    };
    const validation = validateBookmarkDraft(candidate);
    if (!validation.isValid) return bookmark;

    const nextBookmark = normalizeBookmarkValue({
      ...candidate,
      ...validation.value
    });
    changed.push(nextBookmark);
    return nextBookmark;
  });

  if (changed.length) setState({ data: { bookmarks: updated } }, { debugTrace: trace });
  else trace.end({ status: 'skipped', reason: 'Sin cambios' });
  return changed;
}

/** @param {Iterable<string>} bookmarkIds */
export function deleteBookmarksByIds(bookmarkIds) {
  const trace = debug.start('Eliminar favoritos');
  const ids = new Set(bookmarkIds);
  if (!ids.size) {
    trace.end({ status: 'skipped', reason: 'Selección vacía' });
    return 0;
  }
  const { data: { bookmarks } } = getState();
  const updated = bookmarks.filter(bookmark => !ids.has(bookmark.id));
  const deletedCount = bookmarks.length - updated.length;
  if (deletedCount) setState({ data: { bookmarks: updated } }, { debugTrace: trace });
  else trace.end({ status: 'skipped', reason: 'No encontrados' });
  return deletedCount;
}

/**
 * Applies appearance only, preserving identity and layout.
 *
 * @param {Iterable<string>} bookmarkIds
 * @param {BookmarkPreset} preset
 */
export function applyPresetToBookmarks(bookmarkIds, preset) {
  return updateBookmarksByIds(bookmarkIds, bookmark => (
    applyBookmarkPreset(bookmark, preset)
  ));
}

/**
 * Duplicates several bookmarks in one state transition. Each copy is placed in
 * the first free slot of its source workspace and immediately reserves that
 * slot for the next copy.
 *
 * @param {Iterable<string>} bookmarkIds
 * @param {Object} bounds
 * @param {number} bounds.columns
 * @param {number} bounds.rows
 * @param {string} [bounds.nameSuffix='copy']
 * @returns {{duplicates: Bookmark[], skipped: number}}
 */
export function duplicateBookmarksByIds(bookmarkIds, {
  columns,
  rows,
  nameSuffix = 'copy'
} = {}) {
  const trace = debug.start('Duplicar favoritos');
  const ids = new Set(bookmarkIds);
  if (!ids.size) {
    trace.end({ status: 'skipped', reason: 'Selección vacía' });
    return { duplicates: [], skipped: 0 };
  }

  const { data } = getState();
  const { bookmarks } = data;
  const sources = bookmarks.filter(bookmark => ids.has(bookmark.id));
  const occupied = [
    ...bookmarks.filter(bookmark => !bookmark.folderId),
    ...data.folders
  ];
  const duplicates = [];
  let skipped = 0;

  for (const bookmark of sources) {
    const groupBookmarks = occupied.filter(item => (
      (item.groupId ?? null) === (bookmark.groupId ?? null)
    ));
    const position = findFirstFreeSlot(groupBookmarks, {
      columns,
      rows,
      w: bookmark.w,
      h: bookmark.h
    });

    if (!position) {
      skipped += 1;
      continue;
    }

    const duplicate = createBookmarkDuplicate(bookmark, position, nameSuffix);
    duplicates.push(duplicate);
    occupied.push(duplicate);
  }

  if (duplicates.length) {
    setState({ data: { bookmarks: [...bookmarks, ...duplicates] } }, { debugTrace: trace });
  } else trace.end({ status: 'skipped', reason: 'Sin duplicados', skipped });

  return { duplicates, skipped };
}

function createBookmarkDuplicate(bookmark, position, nameSuffix) {
  const duplicate = structuredClone(bookmark);
  delete duplicate.id;
  delete duplicate.createdAt;
  delete duplicate.updatedAt;

  return normalizeBookmarkValue({
    ...duplicate,
    ...position,
    folderId: null,
    name: `${bookmark.name} (${nameSuffix})`
  });
}

/**
 * Returns every item reserving a cell in a workspace.
 * Kept here as a bookmark-facing helper for placement controllers.
 *
 * @param {string|null} groupId
 */
export function getOccupiedGridItems(groupId) {
  return getGridItemsInGroup(getState().data, groupId);
}

export { createBookmarkDraft };
