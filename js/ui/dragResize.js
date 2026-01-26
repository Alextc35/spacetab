import { getBookmarks, saveBookmarks, deleteBookmarkById } from '../core/bookmark.js';
import { isAreaFree } from '../core/grid.js';
import { DEBUG, PADDING } from '../core/config.js';
import { renderBookmarks, container } from './bookmarks.js';
import { colsGrid, rowsGrid } from '../core/config.js';
import { flashError, flashSuccess } from './flash.js';

const GRID_COLS = colsGrid;
const GRID_ROWS = rowsGrid;
let dragging = false;
let resizing = false;

export function addDragAndResize(div, bookmark) {
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  div.addEventListener('pointerdown', async e => {
    if (resizing) return;
    if (e.button === 1) {
      e.preventDefault(); e.stopPropagation();
      await handleMiddleClickDelete(bookmark);
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

function applyPosition(div, gx, gy) {
  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;
  div.style.left = gx * rowWidth + 'px';
  div.style.top = gy * rowHeight + 'px';
}

async function handleMiddleClickDelete(bookmark) {
  if (confirm(`¿Eliminar ${bookmark.name}?`)) {
    const deleted = await deleteBookmarkById(bookmark.id);

    if (deleted) {
      flashSuccess('flash.bookmark.deleted');
      if (DEBUG) console.info('Bookmark deleted', bookmark);
    } else {
      flashError('flash.bookmark.deleteError');
      if (DEBUG) console.error('Error deleting bookmark', bookmark);
    }

    renderBookmarks();
  }
}