import { getBookmarks, saveBookmarks, deleteBookmarkById } from '../core/bookmark.js';
import { isAreaFree } from '../core/grid.js';
import { DEBUG, PADDING } from '../core/config.js';
import { renderBookmarks, container } from './bookmarks.js';
import { colsGrid, rowsGrid } from '../core/config.js';

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
        if (confirm(`¿Eliminar ${bookmark.name}?`)) {
            await deleteBookmarkById(bookmark.id);
            renderBookmarks();
        }
        return;
    }

    if (e.target.classList.contains('edit') || e.target.classList.contains('delete') || e.target.classList.contains("resizer")) return;
    if (e.button !== 0) return;

    e.preventDefault();
    dragging = true;

    startX = e.clientX;
    startY = e.clientY;
    startLeft = div.offsetLeft;
    startTop = div.offsetTop;

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

  const startGX = bookmark.gx;
  const startGY = bookmark.gy;
  const startW = bookmark.w;
  const startH = bookmark.h;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  const onMove = (ev) => {
    if (!resizing) return;
    const rect = container.getBoundingClientRect();
    const localX = ev.clientX - rect.left;
    const localY = ev.clientY - rect.top;

    let newGX = startGX, newGY = startGY, newW = startW, newH = startH;

    if (side === 'right') newW = Math.min(GRID_COLS - startGX, Math.max(1, Math.round(localX / rowWidth) - startGX));
    if (side === 'bottom') newH = Math.min(GRID_ROWS - startGY, Math.max(1, Math.round(localY / rowHeight) - startGY));
    if (side === 'left') {
      const targetGX = Math.round(localX / rowWidth);
      newGX = Math.max(0, Math.min(targetGX, startGX));
      newW = startW + (startGX - newGX);
    }
    if (side === 'top') {
      const targetGY = Math.round(localY / rowHeight);
      newGY = Math.max(0, targetGY);
      newGY = Math.min(newGY, startGY);
      newH = startH + (startGY - newGY);
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