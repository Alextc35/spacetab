import '../../types/types.js'; // typedefs
import { updateBookmarkById } from '../../core/bookmark.js';
import { addBookmarkToFolder, getGridItemsInGroup } from '../../core/bookmarkFolders.js';
import { GRID_COLS, GRID_ROWS, PADDING } from '../../core/config.js';
import { isAreaFree } from '../../core/grid.js';
import { getState } from '../../core/store.js';
import { flashSuccess } from '../flash.js';
import { toggleBookmarkSelection } from './selection.js';
import {
  calculateResizeGeometry,
  RESIZE_DIRECTIONS
} from './resizeGeometry.js';

let dragging = false;
let resizing = false;

/**
 * Enables drag and resize behavior for a bookmark element.
 *
 * Handles:
 * - Grid-based dragging with collision detection.
 * - Continuous resizing from all four sides and corners.
 * - Middle-click selection shortcut.
 * - State persistence via store updates.
 *
 * @param {HTMLElement} container - Grid container element.
 * @param {HTMLElement} div - Bookmark DOM element.
 * @param {Bookmark} bookmark - Bookmark data object.
 * @returns {void}
 */
export function addDragAndResize(container, div, bookmark) {
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  let tempGX = bookmark.gx;
  let tempGY = bookmark.gy;
  let folderTarget = null;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  div.addEventListener('auxclick', e => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
  });

  div.addEventListener('pointerdown', e => {
    if (resizing) return;

    // Middle click toggles the same selection exposed by the three-dot control.
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      const selected = toggleBookmarkSelection(bookmark.id);
      div.classList.toggle('is-selected', selected);
      return;
    }

    if (e.target.closest('.item-actions, .resizer')) return;

    if (e.button !== 0) return;

    e.preventDefault();
    dragging = true;

    startX = e.clientX;
    startY = e.clientY;
    startLeft = div.offsetLeft;
    startTop = div.offsetTop;

    tempGX = bookmark.gx;
    tempGY = bookmark.gy;

    div.classList.add('is-dragging');
    div.setPointerCapture(e.pointerId);
  });

  div.addEventListener('pointermove', (e) => {
    if (!dragging || resizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    let newGX = Math.round(newLeft / rowWidth);
    let newGY = Math.round(newTop / rowHeight);

    newGX = Math.max(0, Math.min(newGX, GRID_COLS - bookmark.w));
    newGY = Math.max(0, Math.min(newGY, GRID_ROWS - bookmark.h));

    const nextFolderTarget = findFolderTarget(e.clientX, e.clientY);
    if (nextFolderTarget) {
      setFolderTarget(nextFolderTarget);
      div.classList.remove('is-invalid');
      return;
    }
    setFolderTarget(null);

    if (
      isAreaFree(
        getGridItemsInGroup(getState().data, bookmark.groupId),
        newGX,
        newGY,
        bookmark.w,
        bookmark.h,
        bookmark.id
      )
    ) {
      tempGX = newGX;
      tempGY = newGY;

      applyPosition(container, div, newGX, newGY);
      div.classList.remove('is-invalid');
    } else {
      div.classList.add('is-invalid');
    }
  });

  const finishDrag = async (commit = true) => {
    if (!dragging || resizing) return;

    dragging = false;
    div.classList.remove('is-dragging', 'is-invalid');
    div.style.zIndex = '';

    if (!commit) {
      setFolderTarget(null);
      applyPosition(container, div, bookmark.gx, bookmark.gy);
      return;
    }

    if (folderTarget) {
      const targetId = folderTarget.dataset.folderId;
      setFolderTarget(null);
      if (addBookmarkToFolder(bookmark.id, targetId)) {
        flashSuccess('flash.folder.bookmarkAdded');
      }
      return;
    }

    // Persist changes via store
    if (tempGX !== bookmark.gx || tempGY !== bookmark.gy) {
      updateBookmarkById(bookmark.id, {
        gx: tempGX,
        gy: tempGY
      });
    }
  };

  div.addEventListener('pointerup', () => finishDrag(true));
  div.addEventListener('pointercancel', () => finishDrag(false));

  function setFolderTarget(nextTarget) {
    if (folderTarget === nextTarget) return;
    folderTarget?.classList.remove('is-drop-target');
    folderTarget = nextTarget;
    folderTarget?.classList.add('is-drop-target');
    div.classList.toggle('is-over-folder', Boolean(folderTarget));
  }

  const resizeIndicator = document.createElement('span');
  resizeIndicator.className = 'resize-indicator';
  resizeIndicator.setAttribute('aria-hidden', 'true');
  div.appendChild(resizeIndicator);

  RESIZE_DIRECTIONS.forEach(direction => {
    const resizer = document.createElement('div');
    resizer.className = `resizer ${direction}`;
    resizer.setAttribute('aria-hidden', 'true');
    div.appendChild(resizer);

    resizer.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleResize(container, e, div, bookmark, direction, resizer, resizeIndicator);
    });
  });
}

/**
 * Handles resize interaction for a bookmark.
 *
 * Dynamically recalculates grid position and dimensions while ensuring:
 * - Minimum size constraints.
 * - Grid boundary limits.
 * - Collision-free placement.
 *
 * Persists changes on pointer release.
 *
 * @param {HTMLElement} container - Grid container element.
 * @param {PointerEvent} e - Initial pointer event.
 * @param {HTMLElement} div - Bookmark DOM element.
 * @param {Bookmark} bookmark - Bookmark data object.
 * @param {string} direction - Side or corner being dragged.
 * @param {HTMLElement} handle - Active resize handle.
 * @param {HTMLElement} indicator - Grid size feedback element.
 * @returns {void}
 */
function handleResize(container, e, div, bookmark, direction, handle, indicator) {
  if (e.button !== 0 || resizing) return;

  resizing = true;
  div.classList.add('is-resizing');
  handle.classList.add('is-active');

  const startMouseX = e.clientX;
  const startMouseY = e.clientY;
  const pointerId = e.pointerId;
  const start = pickGridRectangle(bookmark);
  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;
  let lastValid = start;
  let latestGeometry = calculateResizeGeometry({
    direction,
    deltaX: 0,
    deltaY: 0,
    start,
    cellWidth: rowWidth,
    cellHeight: rowHeight,
    columns: GRID_COLS,
    rows: GRID_ROWS
  });
  let animationFrame = null;
  let active = true;

  indicator.textContent = formatGridSize(start);
  handle.setPointerCapture(pointerId);

  const onMove = (ev) => {
    if (!active || ev.pointerId !== pointerId) return;

    latestGeometry = calculateResizeGeometry({
      direction,
      deltaX: ev.clientX - startMouseX,
      deltaY: ev.clientY - startMouseY,
      start,
      cellWidth: rowWidth,
      cellHeight: rowHeight,
      columns: GRID_COLS,
      rows: GRID_ROWS
    });

    const { grid } = latestGeometry;
    const isValid = isAreaFree(
      getGridItemsInGroup(getState().data, bookmark.groupId),
      grid.gx,
      grid.gy,
      grid.w,
      grid.h,
      bookmark.id
    );

    if (isValid) lastValid = grid;
    div.classList.toggle('is-invalid', !isValid);
    indicator.textContent = formatGridSize(grid);
    queueResizeFrame();
  };

  const queueResizeFrame = () => {
    if (animationFrame != null) return;
    animationFrame = requestAnimationFrame(() => {
      animationFrame = null;
      applyContinuousResize(div, latestGeometry.pixel);
    });
  };

  const finish = (commit) => {
    if (!active) return;
    active = false;
    resizing = false;
    if (animationFrame != null) cancelAnimationFrame(animationFrame);

    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onCancel);
    handle.removeEventListener('lostpointercapture', onLostPointerCapture);
    if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);

    handle.classList.remove('is-active');
    div.classList.remove('is-resizing', 'is-invalid');

    const target = commit ? lastValid : start;
    applyGridGeometry(container, div, target);

    if (
      commit && (
        target.gx !== bookmark.gx ||
        target.gy !== bookmark.gy ||
        target.w !== bookmark.w ||
        target.h !== bookmark.h
      )
    ) {
      updateBookmarkById(bookmark.id, {
        gx: target.gx,
        gy: target.gy,
        w: target.w,
        h: target.h
      });
    }
  };

  const onUp = ev => {
    if (ev.pointerId === pointerId) finish(true);
  };
  const onCancel = ev => {
    if (ev.pointerId === pointerId) finish(false);
  };
  const onLostPointerCapture = ev => {
    if (ev.pointerId === pointerId) finish(false);
  };

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onCancel);
  handle.addEventListener('lostpointercapture', onLostPointerCapture);
}

function pickGridRectangle(bookmark) {
  return {
    gx: bookmark.gx,
    gy: bookmark.gy,
    w: bookmark.w,
    h: bookmark.h
  };
}

function formatGridSize({ w, h }) {
  return `${w} × ${h}`;
}

function applyContinuousResize(element, { left, top, width, height }) {
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${width - PADDING}px`;
  element.style.height = `${height - PADDING}px`;
}

function applyGridGeometry(container, element, geometry) {
  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  applyPosition(container, element, geometry.gx, geometry.gy);
  element.style.width = `${geometry.w * rowWidth - PADDING}px`;
  element.style.height = `${geometry.h * rowHeight - PADDING}px`;
}

function findFolderTarget(clientX, clientY) {
  return Array.from(document.querySelectorAll('.bookmark-folder[data-folder-id]'))
    .find(element => {
      const rect = element.getBoundingClientRect();
      return clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom;
    }) ?? null;
}

/**
 * Applies grid-based positioning to a bookmark element.
 *
 * Converts grid coordinates (gx, gy) into pixel-based positioning
 * relative to the container dimensions.
 *
 * @param {HTMLElement} container - Grid container element.
 * @param {HTMLElement} div - Bookmark DOM element.
 * @param {number} gx - Grid column position.
 * @param {number} gy - Grid row position.
 * @returns {void}
 */
function applyPosition(container, div, gx, gy) {
  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  div.style.left = gx * rowWidth + 'px';
  div.style.top = gy * rowHeight + 'px';
}
