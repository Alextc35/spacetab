import { getState } from '../../core/store.js';
import { flashInfo } from '../flash.js';
import { hasOpenModal } from '../modalManager.js';
import { isListView } from '../viewportMode.js';
import { openEditBookmark } from '../modals/bookmarkModal.js';
import { openFolderEditor } from '../modals/folderEditorModal.js';
import { openRecycleBinModal } from '../modals/recycleBinModal.js';
import {
  getSelectedBookmarkIds,
  toggleBookmarkSelection
} from './selection.js';

const ARROW_DIRECTIONS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown'
]);

const OPPOSITE_DIRECTIONS = {
  ArrowLeft: 'ArrowRight',
  ArrowRight: 'ArrowLeft',
  ArrowUp: 'ArrowDown',
  ArrowDown: 'ArrowUp'
};

// A diagonal candidate is only a gap-filler. Keep the current row while there
// are at most one empty column between it and a same-row candidate; once two
// columns are empty, the diagonal route is allowed to win.
const MAX_HORIZONTAL_CROSS_AXIS = 1;
const MAX_HORIZONTAL_ROW_GAP = 1;

let containerRef = null;
let activeItemId = null;
let navigationPoint = null;
let navigationHistory = [];

/**
 * Adds keyboard navigation for the visible top-level grid items.
 *
 * Tab toggles the mode, arrow keys move to the closest item in a direction,
 * and Enter opens the focused item. In edit mode, S only toggles the bulk
 * selection of bookmarks; folders remain navigation-only.
 *
 * @param {HTMLElement|null} container
 */
export function initGridKeyboardNavigation(container) {
  if (!container || containerRef) return;

  containerRef = container;
  containerRef.tabIndex = -1;
  document.addEventListener('keydown', handleGridKeyboardNavigation, { capture: true });
}

/**
 * Whether an item should display the keyboard-focus affordance.
 *
 * @param {string} itemId
 * @returns {boolean}
 */
export function isGridKeyboardActive(itemId) {
  return activeItemId === itemId;
}

/**
 * Whether Tab-based grid navigation currently owns the arrow keys.
 *
 * @returns {boolean}
 */
export function isGridKeyboardNavigationActive() {
  return activeItemId !== null;
}

function handleGridKeyboardNavigation(event) {
  if (
    event.defaultPrevented
    || hasOpenModal()
    || event.altKey
    || event.ctrlKey
    || event.metaKey
  ) return;

  const isGridFocused = document.activeElement === containerRef;
  if (event.key === 'Tab') {
    if (activeItemId) {
      event.preventDefault();
      clearGridKeyboardNavigation();
      flashInfo('flash.selectionMode.disabled');
      return;
    }

    if (!isGridFocused && !canStartGridNavigation()) return;
    const items = getVisibleGridItems();
    if (!items.length) return;
    event.preventDefault();
    setActiveItem(items[0].id);
    navigationPoint = getItemAnchor(items[0]);
    navigationHistory = [];
    flashInfo('flash.selectionMode.enabled');
    return;
  }

  if (!isGridFocused || event.shiftKey || !activeItemId) return;

  if (ARROW_DIRECTIONS.has(event.key)) {
    const current = getVisibleGridItems().find(item => item.id === activeItemId);
    const route = current ? findDirectionalRoute(current, event.key) : null;
    if (!route) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (route.reversed) {
      navigationHistory.pop();
    } else {
      navigationHistory.push({
        from: activeItemId,
        to: route.item.id,
        direction: event.key,
        fromPoint: navigationPoint,
        toPoint: route.point
      });
    }
    navigationPoint = route.point;
    setActiveItem(route.item.id);
    return;
  }

  if (event.key === 'Enter') {
    const { ui } = getState();
    const item = getVisibleGridItems().find(entry => entry.id === activeItemId);
    if (!item) return;

    if (item.kind === 'recycle-bin') {
      event.preventDefault();
      clearGridKeyboardNavigation();
      openGridItem(item);
      return;
    }

    if (!ui.isEditing) {
      event.preventDefault();
      clearGridKeyboardNavigation();
      openGridItem(item);
      return;
    }

    if (!canOpenFocusedItemEditor(item)) return;
    event.preventDefault();
    clearGridKeyboardNavigation();
    if (item.kind === 'bookmark') openEditBookmark(item.id);
    else openFolderEditor(item.id);
    return;
  }

  const item = getVisibleGridItems().find(entry => entry.id === activeItemId);
  if (
    event.key.toLowerCase() === 's'
    && !event.repeat
    && getState().ui.isEditing
    && item
  ) {
    event.preventDefault();
    if (item.kind === 'bookmark') {
      toggleBookmarkSelection(item.id);
    } else {
      flashFolderSelectionUnavailable(item.id);
    }
  }
}

function canStartGridNavigation() {
  const activeElement = document.activeElement;
  return activeElement === document.body
    || activeElement === document.documentElement
    || activeElement === containerRef;
}

function getVisibleGridItems() {
  const { data: { bookmarks, folders, recycleBin, settings } } = getState();
  const activeGroupId = settings.activeBookmarkGroupId ?? null;
  const visibleIds = isListView() ? new Set(
    [...containerRef.querySelectorAll('.bookmark-list-item:not([hidden])')]
      .map(element => element.dataset.bookmarkId ?? element.dataset.folderId)
  ) : null;
  return [
    ...bookmarks
      .filter(bookmark => !bookmark.folderId && (bookmark.groupId ?? null) === activeGroupId)
      .map(bookmark => ({ ...bookmark, kind: 'bookmark' })),
    ...folders
      .filter(folder => (folder.groupId ?? null) === activeGroupId)
      .map(folder => ({ ...folder, kind: 'folder' })),
    ...(!isListView() && activeGroupId === null && settings.showRecycleBin
      ? [{ ...recycleBin, kind: 'recycle-bin' }]
      : [])
  ].filter(item => !visibleIds || visibleIds.has(item.id)).sort((a, b) => (
    a.gy - b.gy
    || a.gx - b.gx
    || a.id.localeCompare(b.id)
  ));
}

function findDirectionalRoute(current, direction) {
  if (isListView()) {
    const items = getVisibleGridItems();
    const index = items.findIndex(item => item.id === current.id);
    if (direction === 'ArrowDown') {
      const item = items[index + 1] ?? null;
      return item ? { item, point: getItemAnchor(item) } : null;
    }
    if (direction === 'ArrowUp') {
      const item = items[index - 1] ?? null;
      return item ? { item, point: getItemAnchor(item) } : null;
    }
    return null;
  }

  const last = navigationHistory.at(-1);
  if (
    last
    && last.to === current.id
    && OPPOSITE_DIRECTIONS[last.direction] === direction
  ) {
    const previous = getVisibleGridItems().find(item => item.id === last.from);
    if (previous && getDirectionalDistance(current, previous, direction, last.toPoint)) {
      return {
        item: previous,
        point: last.fromPoint ?? getItemAnchor(previous),
        reversed: true
      };
    }
  }

  const point = navigationPoint ?? getItemAnchor(current);
  const candidates = getVisibleGridItems()
    .filter(item => item.id !== current.id)
    .map(item => ({
      item,
      distance: getDirectionalDistance(current, item, direction, point)
    }))
    .filter(candidate => candidate.distance);

  // Vertical movement is lane-based. When no item occupies the remembered
  // column, the arrow is intentionally a no-op instead of a diagonal jump.
  const laneCandidates = candidates.filter(candidate => candidate.distance.inLane);
  const isVertical = direction === 'ArrowUp' || direction === 'ArrowDown';
  const immediate = candidates.filter(candidate => (
    candidate.distance.inLane && candidate.distance.forward === 0
  ));
  const sameRow = candidates.filter(candidate => candidate.distance.sameRow);
  const sameRowNear = sameRow.filter(candidate => (
    candidate.distance.forward <= MAX_HORIZONTAL_ROW_GAP
  ));
  const nearby = candidates.filter(candidate => (
    candidate.distance.crossAxis <= MAX_HORIZONTAL_CROSS_AXIS
  ));
  const pool = isVertical
    ? laneCandidates
    : (immediate.length ? immediate : sameRowNear.length ? sameRowNear : nearby);
  const selected = pool.sort((a, b) => (
    isVertical
      ? a.distance.forward - b.distance.forward
        || a.distance.crossAxis - b.distance.crossAxis
      : (a.distance.forward + a.distance.crossAxis)
        - (b.distance.forward + b.distance.crossAxis)
        || a.distance.forward - b.distance.forward
        || a.distance.crossAxis - b.distance.crossAxis
      || a.item.gy - b.item.gy
      || a.item.gx - b.item.gx
  ))[0];

  if (!selected) return null;
  return {
    item: selected.item,
    point: getEntryPoint(selected.item, direction, point)
  };
}

function getDirectionalDistance(current, candidate, direction, point = getItemAnchor(current)) {
  const currentRight = current.gx + current.w;
  const currentBottom = current.gy + current.h;
  const candidateRight = candidate.gx + candidate.w;
  const candidateBottom = candidate.gy + candidate.h;

  switch (direction) {
    case 'ArrowRight':
      if (candidate.gx < currentRight) return null;
      return {
        inLane: point.gy >= candidate.gy && point.gy < candidateBottom,
        sameRow: candidate.gy === point.gy,
        forward: candidate.gx - currentRight,
        crossAxis: Math.abs(point.gy - clamp(point.gy, candidate.gy, candidateBottom - 1))
      };
    case 'ArrowLeft':
      if (candidateRight > current.gx) return null;
      return {
        inLane: point.gy >= candidate.gy && point.gy < candidateBottom,
        sameRow: candidate.gy === point.gy,
        forward: current.gx - candidateRight,
        crossAxis: Math.abs(point.gy - clamp(point.gy, candidate.gy, candidateBottom - 1))
      };
    case 'ArrowDown':
      if (candidate.gy < currentBottom) return null;
      return {
        inLane: point.gx >= candidate.gx && point.gx < candidateRight,
        forward: candidate.gy - currentBottom,
        crossAxis: Math.abs(point.gx - clamp(point.gx, candidate.gx, candidateRight - 1))
      };
    case 'ArrowUp':
      if (candidateBottom > current.gy) return null;
      return {
        inLane: point.gx >= candidate.gx && point.gx < candidateRight,
        forward: current.gy - candidateBottom,
        crossAxis: Math.abs(point.gx - clamp(point.gx, candidate.gx, candidateRight - 1))
      };
    default:
      return null;
  }
}

function getItemAnchor(item) {
  return { gx: item.gx, gy: item.gy };
}

function getEntryPoint(item, direction, point) {
  const right = item.gx + item.w;
  const bottom = item.gy + item.h;
  switch (direction) {
    case 'ArrowRight':
      return { gx: item.gx, gy: clamp(point.gy, item.gy, bottom - 1) };
    case 'ArrowLeft':
      return { gx: right - 1, gy: clamp(point.gy, item.gy, bottom - 1) };
    case 'ArrowDown':
      return { gx: clamp(point.gx, item.gx, right - 1), gy: item.gy };
    case 'ArrowUp':
      return { gx: clamp(point.gx, item.gx, right - 1), gy: bottom - 1 };
    default:
      return getItemAnchor(item);
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function openGridItem(item) {
  if (item.kind === 'recycle-bin') {
    openRecycleBinModal();
    return;
  }
  if (item.kind === 'folder') {
    getGridItemElement(item.id)?.querySelector('.folder-open')?.click();
    return;
  }

  const link = getGridItemElement(item.id)?.querySelector('.bookmark-link');
  if (link?.href) window.location.assign(link.href);
}

function canOpenFocusedItemEditor(item) {
  const selectedIds = getSelectedBookmarkIds();
  if (selectedIds.length > 1) return false;
  return selectedIds.length === 0 || selectedIds[0] === item.id;
}

function setActiveItem(itemId) {
  activeItemId = itemId;
  containerRef?.focus({ preventScroll: true });

  containerRef?.querySelectorAll(
    '.bookmark[data-bookmark-id], .bookmark-folder[data-folder-id], .recycle-bin[data-recycle-bin-id]'
  )
    .forEach(element => {
      const id = element.dataset.bookmarkId
        ?? element.dataset.folderId
        ?? element.dataset.recycleBinId;
      element.classList.toggle('is-keyboard-active', id === itemId);
    });
  getGridItemElement(itemId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function clearGridKeyboardNavigation() {
  activeItemId = null;
  navigationPoint = null;
  navigationHistory = [];
  containerRef?.querySelectorAll('.is-keyboard-active').forEach(element => {
    element.classList.remove('is-keyboard-active');
  });
  containerRef?.blur();
}

function getGridItemElement(itemId) {
  return [...(containerRef?.querySelectorAll(
    '.bookmark[data-bookmark-id], .bookmark-folder[data-folder-id], .recycle-bin[data-recycle-bin-id]'
  ) ?? [])].find(element => (
    element.dataset.bookmarkId === itemId
    || element.dataset.folderId === itemId
    || element.dataset.recycleBinId === itemId
  )) ?? null;
}

function flashFolderSelectionUnavailable(folderId) {
  const element = getGridItemElement(folderId);
  if (!element) return;

  element.classList.remove('is-keyboard-selection-blocked');
  void element.offsetWidth;
  element.classList.add('is-keyboard-selection-blocked');
  element.addEventListener('animationend', () => {
    element.classList.remove('is-keyboard-selection-blocked');
  }, { once: true });
}
