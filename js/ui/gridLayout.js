import { colsGrid, rowsGrid } from '../core/config.js';

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
  const container = document.getElementById('bookmark-container');
  const cols = getMaxVisibleCols();
  return container.clientWidth / cols;
}

export function getRowHeight() {
  const container = document.getElementById('bookmark-container');
  const rows = getMaxVisibleRows();
  return container.clientHeight / rows;
}