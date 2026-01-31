import { GRID_COLS, GRID_ROWS } from '../core/config.js';
import { container } from './bookmarks.js'; 

export function updateGridSize(container) {
  if (!container) return;

  const rect = container.getBoundingClientRect();

  const cellW = rect.width / GRID_COLS;
  const cellH = rect.height / GRID_ROWS;

  document.documentElement.style.setProperty('--cell-w', cellW + 'px');
  document.documentElement.style.setProperty('--cell-h', cellH + 'px');
}

export function getMaxVisibleRows() {
  return GRID_ROWS;
}

export function getMaxVisibleCols() {
  return GRID_COLS;
}

export function getRowWidth() {
  const cols = getMaxVisibleCols();
  return container.clientWidth / cols;
}

export function getRowHeight() {
  const rows = getMaxVisibleRows();
  return container.clientHeight / rows;
}