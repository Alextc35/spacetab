/**
 * dragAndResize.js
 * ------------------------------------------------------
 * Drag & resize behavior for bookmark grid items.
 *
 * Responsibilities:
 * - Enables dragging bookmarks across the grid
 * - Enables resizing bookmarks from all four sides
 * - Enforces grid boundaries and collision rules
 * - Persists position and size changes
 * - Triggers re-rendering after interactions
 *
 * Interaction rules:
 * - Left click + drag → move bookmark
 * - Middle click → delete bookmark (with confirmation)
 * - Resize handles → resize in grid units
 *
 * Notes:
 * - All movement is snapped to the grid
 * - Collisions are validated via isAreaFree
 * - Bookmark mutations are persisted immediately
 * ------------------------------------------------------
 */

import { getBookmarks, saveBookmarks } from '../core/bookmark.js';
import { isAreaFree } from '../core/grid.js';
import { PADDING } from '../core/config.js';
import { renderBookmarks, container, confirmAndDeleteBookmark } from './bookmarks.js';
import { GRID_COLS, GRID_ROWS } from '../core/config.js';

/**
 * Global drag state flag.
 * Prevents drag and resize from overlapping.
 */
let dragging = false;

/**
 * Global resize state flag.
 * Prevents drag and resize from overlapping.
 */
let resizing = false;

/**
 * Attaches drag and resize behavior to a bookmark element.
 *
 * @param {HTMLElement} div - Bookmark DOM element
 * @param {Object} bookmark - Bookmark data object
 */
export function addDragAndResize(div, bookmark) {
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  div.addEventListener('pointerdown', async e => {
    if (resizing) return;
    if (e.button === 1) {
      e.preventDefault(); e.stopPropagation();
      await confirmAndDeleteBookmark(bookmark);
      return;
    }
    if (e.target.classList.contains('edit') || e.target.classList.contains('delete') || e.target.classList.contains("resizer")) return;
    if (e.button !== 0) return;

    e.preventDefault();
    dragging = true;

    startX = e.clientX; startY = e.clientY;
    startLeft = div.offsetLeft; startTop = div.offsetTop;

    div.classList.add('is-dragging');
    div.setPointerCapture(e.pointerId);
    div.style.zIndex = 9999;
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

    if (isAreaFree(getBookmarks(), newGX, newGY, bookmark.w, bookmark.h, bookmark.id)) {
        bookmark.gx = newGX;
        bookmark.gy = newGY;
        applyPosition(div, newGX, newGY);
        div.classList.remove('is-invalid');
    } else {
        div.classList.add('is-invalid');
    }
  });

  div.addEventListener('pointerup', async () => {
    if (!dragging || resizing) return;
    dragging = false;
    div.classList.remove('is-dragging', 'is-invalid');
    div.style.zIndex = '';
    await saveBookmarks();
    renderBookmarks();
  });

  ['top', 'right', 'bottom', 'left'].forEach(side => {
    const resizer = document.createElement('div');
    resizer.className = `resizer ${side}`;
    div.appendChild(resizer);

    resizer.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); e.preventDefault();
      handleResize(e, div, bookmark, side);
    });
  });
}

/**
 * Handles resizing logic for a bookmark.
 *
 * @param {PointerEvent} e
 * @param {HTMLElement} div
 * @param {Object} bookmark
 * @param {'top'|'right'|'bottom'|'left'} side
 */
function handleResize(e, div, bookmark, side) {
  e.preventDefault();
  resizing = true;
  div.classList.add('is-resizing');

  const startMouseX = e.clientX;
  const startMouseY = e.clientY;

  const startGX = bookmark.gx;
  const startGY = bookmark.gy;
  const startW = bookmark.w;
  const startH = bookmark.h;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  const onMove = (ev) => {
    if (!resizing) return;
    let newGX = startGX, newGY = startGY, newW = startW, newH = startH;

    if (side === 'right') {
      const deltaCols = Math.round((ev.clientX - startMouseX) / rowWidth);
      newW = Math.max(1, startW + deltaCols);
    }

    if (side === 'bottom') {
      const deltaRows = Math.round((ev.clientY - startMouseY) / rowHeight);
      newH = Math.max(1, startH + deltaRows);
    }

    if (side === 'left') {
      const deltaCols = Math.round((ev.clientX - startMouseX) / rowWidth);

      newGX = startGX + deltaCols;
      newW  = startW - deltaCols;

      if (newW < 1) {
        newW = 1;
        newGX = startGX + (startW - 1);
      }

      if (newGX < 0) {
        newW += newGX;
        newGX = 0;
      }
    }

    if (side === 'top') {
      const deltaRows = Math.round((ev.clientY - startMouseY) / rowHeight);

      newGY = startGY + deltaRows;
      newH  = startH - deltaRows;

      if (newH < 1) {
        newH = 1;
        newGY = startGY + (startH - 1);
      }

      if (newGY < 0) {
        newH += newGY;
        newGY = 0;
      }
    }

    if (isAreaFree(getBookmarks(), newGX, newGY, newW, newH, bookmark.id)) {
      bookmark.gx = newGX;
      bookmark.gy = newGY;
      bookmark.w = newW;
      bookmark.h = newH;
      applyPosition(div, newGX, newGY);
      div.style.width = newW * rowWidth - PADDING + 'px';
      div.style.height = newH * rowHeight - PADDING + 'px';
    }
  };

  const onUp = async () => {
    resizing = false;
    div.classList.remove('is-resizing');
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    await saveBookmarks();
    renderBookmarks();
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

/**
 * Applies grid-based position to a bookmark element.
 *
 * @param {HTMLElement} div
 * @param {number} gx
 * @param {number} gy
 */
function applyPosition(div, gx, gy) {
  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;
  div.style.left = gx * rowWidth + 'px';
  div.style.top = gy * rowHeight + 'px';
}