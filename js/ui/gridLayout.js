import { colsGrid, rowsGrid } from '../core/config.js';
import { container } from './bookmarks.js'; 

export function updateGridSize(container) {
  if (!container) return;

  const cols = colsGrid;
  const rows = rowsGrid;

  const rect = container.getBoundingClientRect();

  const cellW = rect.width / cols;
  const cellH = rect.height / rows;

  document.documentElement.style.setProperty('--cell-w', cellW + 'px');
  document.documentElement.style.setProperty('--cell-h', cellH + 'px');
}

export function getMaxVisibleRows() {
  return rowsGrid;
}

export function getMaxVisibleCols() {
  return colsGrid;
}

export function getRowWidth() {
  const cols = getMaxVisibleCols();
  return container.clientWidth / cols;
}

export function getRowHeight() {
  const rows = getMaxVisibleRows();
  return container.clientHeight / rows;
}