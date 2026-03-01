import '../types/types.js'; // typedefs
import { updateBookmarkById } from '../core/bookmark.js';
import { GRID_COLS, GRID_ROWS, PADDING } from '../core/config.js';
import { isAreaFree } from '../core/grid.js';
import { getState } from '../core/store.js';
import { confirmDeleteBookmark } from './bookmarkActions.js';

let dragging = false;
let resizing = false;

/**
 * Enables drag and resize behavior for a bookmark element.
 *
 * Handles:
 * - Grid-based dragging with collision detection.
 * - Resizing from all four sides.
 * - Middle-click deletion shortcut.
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

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  div.addEventListener('pointerdown', async e => {
    if (resizing) return;

    // Middle click delete
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      await confirmDeleteBookmark(bookmark);
      return;
    }

    if (
      e.target.classList.contains('edit') ||
      e.target.classList.contains('delete') ||
      e.target.classList.contains('resizer')
    ) return;

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

    if (
      isAreaFree(
        getState().data.bookmarks,
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

  div.addEventListener('pointerup', async () => {
    if (!dragging || resizing) return;

    dragging = false;
    div.classList.remove('is-dragging', 'is-invalid');
    div.style.zIndex = '';

    // Persist changes via store
    if (tempGX !== bookmark.gx || tempGY !== bookmark.gy) {
      updateBookmarkById(bookmark.id, {
        gx: tempGX,
        gy: tempGY
      });
    }
  });

  ['top', 'right', 'bottom', 'left'].forEach(side => {
    const resizer = document.createElement('div');
    resizer.className = `resizer ${side}`;
    div.appendChild(resizer);

    resizer.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleResize(container, e, div, bookmark, side);
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
 * @param {'top'|'right'|'bottom'|'left'} side - Resize direction.
 * @returns {void}
 */
function handleResize(container, e, div, bookmark, side) {
  resizing = true;
  div.classList.add('is-resizing');

  const startMouseX = e.clientX;
  const startMouseY = e.clientY;

  const startGX = bookmark.gx;
  const startGY = bookmark.gy;
  const startW = bookmark.w;
  const startH = bookmark.h;

  let tempGX = startGX;
  let tempGY = startGY;
  let tempW = startW;
  let tempH = startH;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  const onMove = (ev) => {
    if (!resizing) return;

    let newGX = startGX;
    let newGY = startGY;
    let newW = startW;
    let newH = startH;

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
      newW = startW - deltaCols;

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
      newH = startH - deltaRows;

      if (newH < 1) {
        newH = 1;
        newGY = startGY + (startH - 1);
      }

      if (newGY < 0) {
        newH += newGY;
        newGY = 0;
      }
    }

    if (
      isAreaFree(
        getState().data.bookmarks,
        newGX,
        newGY,
        newW,
        newH,
        bookmark.id
      )
    ) {
      tempGX = newGX;
      tempGY = newGY;
      tempW = newW;
      tempH = newH;

      applyPosition(container, div, newGX, newGY);
      div.style.width = newW * rowWidth - PADDING + 'px';
      div.style.height = newH * rowHeight - PADDING + 'px';
      div.classList.remove('is-invalid');
    } else {
      div.classList.add('is-invalid');
    }
  };

  const onUp = async () => {
    resizing = false;
    div.classList.remove('is-resizing');

    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);

    if (
      tempGX !== bookmark.gx ||
      tempGY !== bookmark.gy ||
      tempW !== bookmark.w ||
      tempH !== bookmark.h
    ) {
      updateBookmarkById(bookmark.id, {
        gx: tempGX,
        gy: tempGY,
        w: tempW,
        h: tempH
      });
    }
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
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