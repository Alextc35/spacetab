import { getState, setState } from './store.js';
import { findFirstFreeSlot } from './grid.js';

export function createBookmarkGroup(name) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return null;

  const { data: { settings } } = getState();
  const group = { id: crypto.randomUUID(), name: normalizedName };
  const nextSettings = {
    ...settings,
    bookmarkGroups: [...settings.bookmarkGroups, group],
    activeBookmarkGroupId: group.id
  };
  setState({ data: { settings: nextSettings } });
  return group;
}

export function setActiveBookmarkGroup(groupId) {
  const { data: { settings } } = getState();
  const normalizedId = settings.bookmarkGroups.some(group => group.id === groupId)
    ? groupId
    : null;
  if (settings.activeBookmarkGroupId === normalizedId) return false;

  setState({
    data: {
      settings: { ...settings, activeBookmarkGroupId: normalizedId }
    }
  }, { recordHistory: false });
  return true;
}

export function deleteBookmarkGroup(groupId) {
  const { data: { settings, bookmarks } } = getState();
  if (!settings.bookmarkGroups.some(group => group.id === groupId)) return false;

  setState({
    data: {
      bookmarks: bookmarks.filter(bookmark => bookmark.groupId !== groupId),
      settings: {
        ...settings,
        bookmarkGroups: settings.bookmarkGroups.filter(group => group.id !== groupId),
        activeBookmarkGroupId: settings.activeBookmarkGroupId === groupId
          ? null
          : settings.activeBookmarkGroupId
      }
    }
  }, { recordHistory: false });
  return true;
}

export function moveBookmarksToGroup(bookmarkIds, groupId, { columns, rows } = {}) {
  const ids = new Set(bookmarkIds);
  const { data: { settings, bookmarks } } = getState();
  const normalizedId = settings.bookmarkGroups.some(group => group.id === groupId)
    ? groupId
    : null;
  let moved = 0;
  let skipped = 0;
  const occupied = bookmarks.filter(bookmark => (
    (bookmark.groupId ?? null) === normalizedId && !ids.has(bookmark.id)
  ));
  const replacements = new Map();

  for (const bookmark of bookmarks) {
    if (!ids.has(bookmark.id) || bookmark.groupId === normalizedId) continue;
    const position = findFirstFreeSlot(occupied, {
      columns,
      rows,
      w: bookmark.w,
      h: bookmark.h
    });
    if (!position) {
      skipped += 1;
      continue;
    }

    const replacement = {
      ...bookmark,
      ...position,
      groupId: normalizedId,
      updatedAt: Date.now()
    };
    replacements.set(bookmark.id, replacement);
    occupied.push(replacement);
    moved += 1;
  }

  const updated = bookmarks.map(bookmark => replacements.get(bookmark.id) ?? bookmark);

  if (moved) setState({ data: { bookmarks: updated } });
  return { moved, skipped };
}
