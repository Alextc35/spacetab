import { GRID_COLS, GRID_ROWS } from '../../core/config.js';
import {
  getGridItemsInGroup,
  updateBookmarkFolderPosition
} from '../../core/bookmarkFolders.js';
import { isAreaFree } from '../../core/grid.js';
import { getState } from '../../core/store.js';

export function addFolderDrag(container, element, folder) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let gx = folder.gx;
  let gy = folder.gy;
  let moved = false;

  const rowWidth = container.clientWidth / GRID_COLS;
  const rowHeight = container.clientHeight / GRID_ROWS;

  element.addEventListener('pointerdown', event => {
    if (
      event.button !== 0
      || event.target.closest('.bookmark-action-menu')
    ) return;

    event.preventDefault();
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = element.offsetLeft;
    startTop = element.offsetTop;
    moved = false;
    element.classList.add('is-dragging');
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener('pointermove', event => {
    if (!dragging) return;

    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 4) {
      moved = true;
    }

    const nextGX = Math.max(0, Math.min(
      Math.round((startLeft + event.clientX - startX) / rowWidth),
      GRID_COLS - 1
    ));
    const nextGY = Math.max(0, Math.min(
      Math.round((startTop + event.clientY - startY) / rowHeight),
      GRID_ROWS - 1
    ));
    const items = getGridItemsInGroup(getState().data, folder.groupId);

    if (isAreaFree(items, nextGX, nextGY, 1, 1, folder.id)) {
      gx = nextGX;
      gy = nextGY;
      element.style.left = `${gx * rowWidth}px`;
      element.style.top = `${gy * rowHeight}px`;
      element.classList.remove('is-invalid');
    } else {
      element.classList.add('is-invalid');
    }
  });

  const finish = (commit = true) => {
    if (!dragging) return;
    dragging = false;
    element.classList.remove('is-dragging', 'is-invalid');
    if (moved) {
      element.dataset.suppressFolderOpen = 'true';
      setTimeout(() => delete element.dataset.suppressFolderOpen, 0);
    }
    if (!commit) {
      element.style.left = `${folder.gx * rowWidth}px`;
      element.style.top = `${folder.gy * rowHeight}px`;
      return;
    }
    if (gx !== folder.gx || gy !== folder.gy) {
      updateBookmarkFolderPosition(folder.id, { gx, gy });
    }
  };

  element.addEventListener('pointerup', () => finish(true));
  element.addEventListener('pointercancel', () => finish(false));
}
