import {
  getGridItemsInGroup,
  updateGridItemsByIds
} from '../../core/bookmarkFolders.js';
import {
  GRID_COLS,
  GRID_ROWS
} from '../../core/config.js';
import { getState } from '../../core/store.js';
import { hasOpenModal } from '../modalManager.js';
import { isGridKeyboardNavigationActive } from './gridKeyboardNavigation.js';
import { getSelectedBookmarkIds } from './selection.js';
import { calculateKeyboardMoveLayout } from './smartDragLayout.js';

const ARROW_STEPS = Object.freeze({
  ArrowLeft: { gx: -1, gy: 0 },
  ArrowRight: { gx: 1, gy: 0 },
  ArrowUp: { gx: 0, gy: -1 },
  ArrowDown: { gx: 0, gy: 1 }
});

/**
 * Enables one-cell keyboard movement for a single selected bookmark.
 *
 * Plain arrow keys are deliberately reserved for the bookmark itself. Form
 * controls, modal dialogs and modified arrow shortcuts retain their native
 * behavior.
 */
export function initBookmarkKeyboardMovement() {
  document.addEventListener('keydown', handleBookmarkArrowKey);
}

function handleBookmarkArrowKey(event) {
  const step = ARROW_STEPS[event.key];
  if (
    !step
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || event.defaultPrevented
    || hasOpenModal()
    || isGridKeyboardNavigationActive()
    || isEditingTextOrControl(document.activeElement)
  ) return;

  const selectedIds = getSelectedBookmarkIds();
  if (selectedIds.length !== 1) return;

  const state = getState();
  if (!state.ui.isEditing) return;

  const bookmark = state.data.bookmarks.find(item => (
    item.id === selectedIds[0]
    && !item.folderId
    && (item.groupId ?? null) === (
      state.data.settings.activeBookmarkGroupId ?? null
    )
  ));
  if (!bookmark) return;

  event.preventDefault();

  const items = getGridItemsInGroup(state.data, bookmark.groupId);
  const topLevelBookmarkIds = new Set(state.data.bookmarks
    .filter(item => (
      !item.folderId
      && (item.groupId ?? null) === (bookmark.groupId ?? null)
    ))
    .map(item => item.id));
  const layout = calculateKeyboardMoveLayout({
    items,
    draggedId: bookmark.id,
    step,
    movableIds: topLevelBookmarkIds,
    mode: state.data.settings.bookmarkDragMode,
    columns: GRID_COLS,
    rows: GRID_ROWS
  });
  if (!layout.isValid) return;

  const currentById = new Map(items.map(item => [item.id, item]));
  const updates = new Map();
  for (const position of layout.positions) {
    const current = currentById.get(position.id);
    if (
      current
      && (position.gx !== current.gx || position.gy !== current.gy)
    ) updates.set(position.id, { gx: position.gx, gy: position.gy });
  }

  updateGridItemsByIds(updates);
}

function isEditingTextOrControl(element) {
  return Boolean(element?.closest?.(
    'input, textarea, select, [contenteditable="true"]'
  ));
}
