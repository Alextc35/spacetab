const selectedIds = new Set();
const listeners = new Set();

export function getSelectedBookmarkIds() {
  return [...selectedIds];
}

export function isBookmarkSelected(bookmarkId) {
  return selectedIds.has(bookmarkId);
}

export function toggleBookmarkSelection(bookmarkId) {
  if (selectedIds.has(bookmarkId)) selectedIds.delete(bookmarkId);
  else selectedIds.add(bookmarkId);
  notify();
  return selectedIds.has(bookmarkId);
}

export function clearBookmarkSelection() {
  if (!selectedIds.size) return;
  selectedIds.clear();
  notify();
}

export function pruneBookmarkSelection(validIds) {
  const allowed = new Set(validIds);
  let changed = false;
  for (const id of selectedIds) {
    if (allowed.has(id)) continue;
    selectedIds.delete(id);
    changed = true;
  }
  if (changed) notify();
}

export function subscribeToBookmarkSelection(listener) {
  listeners.add(listener);
  listener(getSelectedBookmarkIds());
  return () => listeners.delete(listener);
}

function notify() {
  const snapshot = getSelectedBookmarkIds();
  for (const listener of listeners) listener(snapshot);
}
