import { getState } from '../../core/store.js';
import { hasOpenModal } from '../modalManager.js';
import { openEditBookmark } from '../modals/bookmarkModal.js';
import { openFolderEditor } from '../modals/folderEditorModal.js';
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

let containerRef = null;
let activeItemId = null;

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
      return;
    }

    if (!isGridFocused && !canStartGridNavigation()) return;
    const items = getVisibleGridItems();
    if (!items.length) return;
    event.preventDefault();
    setActiveItem(items[0].id);
    return;
  }

  if (!isGridFocused || event.shiftKey || !activeItemId) return;

  if (ARROW_DIRECTIONS.has(event.key)) {
    const current = getVisibleGridItems().find(item => item.id === activeItemId);
    const next = current ? findDirectionalItem(current, event.key) : null;
    if (!next) return;

    event.preventDefault();
    setActiveItem(next.id);
    return;
  }

  if (event.key === 'Enter') {
    const { ui } = getState();
    const item = getVisibleGridItems().find(entry => entry.id === activeItemId);
    if (!item) return;

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
  const { data: { bookmarks, folders, settings } } = getState();
  const activeGroupId = settings.activeBookmarkGroupId ?? null;
  return [
    ...bookmarks
      .filter(bookmark => !bookmark.folderId && (bookmark.groupId ?? null) === activeGroupId)
      .map(bookmark => ({ ...bookmark, kind: 'bookmark' })),
    ...folders
      .filter(folder => (folder.groupId ?? null) === activeGroupId)
      .map(folder => ({ ...folder, kind: 'folder' }))
  ].sort((a, b) => (
    a.gy - b.gy
    || a.gx - b.gx
    || a.id.localeCompare(b.id)
  ));
}

function findDirectionalItem(current, direction) {
  const candidates = getVisibleGridItems()
    .filter(item => item.id !== current.id)
    .map(item => ({
      item,
      distance: getDirectionalDistance(current, item, direction)
    }))
    .filter(candidate => candidate.distance)
    .sort((a, b) => (
      a.distance.forward - b.distance.forward
      || a.distance.crossAxis - b.distance.crossAxis
      || a.item.gy - b.item.gy
      || a.item.gx - b.item.gx
    ));

  return candidates[0]?.item ?? null;
}

function getDirectionalDistance(current, candidate, direction) {
  const currentRight = current.gx + current.w;
  const currentBottom = current.gy + current.h;
  const candidateRight = candidate.gx + candidate.w;
  const candidateBottom = candidate.gy + candidate.h;

  switch (direction) {
    case 'ArrowRight':
      if (candidate.gx < currentRight) return null;
      return {
        forward: candidate.gx - currentRight,
        crossAxis: centerDistance(current.gy, currentBottom, candidate.gy, candidateBottom)
      };
    case 'ArrowLeft':
      if (candidateRight > current.gx) return null;
      return {
        forward: current.gx - candidateRight,
        crossAxis: centerDistance(current.gy, currentBottom, candidate.gy, candidateBottom)
      };
    case 'ArrowDown':
      if (candidate.gy < currentBottom) return null;
      return {
        forward: candidate.gy - currentBottom,
        crossAxis: centerDistance(current.gx, currentRight, candidate.gx, candidateRight)
      };
    case 'ArrowUp':
      if (candidateBottom > current.gy) return null;
      return {
        forward: current.gy - candidateBottom,
        crossAxis: centerDistance(current.gx, currentRight, candidate.gx, candidateRight)
      };
    default:
      return null;
  }
}

function centerDistance(startA, endA, startB, endB) {
  return Math.abs((startA + endA) / 2 - (startB + endB) / 2);
}

function openGridItem(item) {
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

  containerRef?.querySelectorAll('.bookmark[data-bookmark-id], .bookmark-folder[data-folder-id]')
    .forEach(element => {
      const id = element.dataset.bookmarkId ?? element.dataset.folderId;
      element.classList.toggle('is-keyboard-active', id === itemId);
    });
}

function clearGridKeyboardNavigation() {
  activeItemId = null;
  containerRef?.querySelectorAll('.is-keyboard-active').forEach(element => {
    element.classList.remove('is-keyboard-active');
  });
  containerRef?.blur();
}

function getGridItemElement(itemId) {
  return [...(containerRef?.querySelectorAll(
    '.bookmark[data-bookmark-id], .bookmark-folder[data-folder-id]'
  ) ?? [])].find(element => (
    element.dataset.bookmarkId === itemId || element.dataset.folderId === itemId
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
