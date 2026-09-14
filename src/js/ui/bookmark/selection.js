const selectedItems = new Map();
const bookmarkListeners = new Set();
const gridItemListeners = new Set();

export function getSelectedBookmarkIds() {
  return getSelectedGridItems()
    .filter(item => item.kind === 'bookmark')
    .map(item => item.id);
}

export function isBookmarkSelected(bookmarkId) {
  return isGridItemSelected('bookmark', bookmarkId);
}

export function toggleBookmarkSelection(bookmarkId) {
  return toggleGridItemSelection('bookmark', bookmarkId);
}

export function clearBookmarkSelection() {
  clearGridItemSelection();
}

export function getSelectedGridItems() {
  return [...selectedItems.values()].map(item => ({ ...item }));
}

export function isGridItemSelected(kind, itemId) {
  return selectedItems.has(selectionKey(kind, itemId));
}

export function toggleGridItemSelection(kind, itemId) {
  if (!['bookmark', 'folder'].includes(kind) || !itemId) return false;

  const key = selectionKey(kind, itemId);
  if (selectedItems.has(key)) selectedItems.delete(key);
  else selectedItems.set(key, { kind, id: itemId });
  notify();
  return selectedItems.has(key);
}

export function clearGridItemSelection() {
  if (!selectedItems.size) return;
  selectedItems.clear();
  notify();
}

export function pruneBookmarkSelection(validIds) {
  const allowed = new Set(validIds);
  let changed = false;
  for (const [key, item] of selectedItems) {
    if (item.kind !== 'bookmark' || allowed.has(item.id)) continue;
    selectedItems.delete(key);
    changed = true;
  }
  if (changed) notify();
}

export function pruneGridItemSelection({ bookmarkIds = [], folderIds = [] } = {}) {
  const allowedByKind = {
    bookmark: new Set(bookmarkIds),
    folder: new Set(folderIds)
  };
  let changed = false;

  for (const [key, item] of selectedItems) {
    if (allowedByKind[item.kind]?.has(item.id)) continue;
    selectedItems.delete(key);
    changed = true;
  }
  if (changed) notify();
}

export function subscribeToBookmarkSelection(listener) {
  bookmarkListeners.add(listener);
  listener(getSelectedBookmarkIds());
  return () => bookmarkListeners.delete(listener);
}

export function subscribeToGridItemSelection(listener) {
  gridItemListeners.add(listener);
  listener(getSelectedGridItems());
  return () => gridItemListeners.delete(listener);
}

function notify() {
  const items = getSelectedGridItems();
  const bookmarkIds = items
    .filter(item => item.kind === 'bookmark')
    .map(item => item.id);
  for (const listener of bookmarkListeners) listener(bookmarkIds);
  for (const listener of gridItemListeners) listener(items);
}

function selectionKey(kind, itemId) {
  return `${kind}:${itemId}`;
}
