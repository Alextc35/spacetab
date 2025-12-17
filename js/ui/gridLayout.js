export function updateGridSize() {
  const container = document.getElementById('bookmark-container');
  if (!container) return;

  const cols = 12;
  const rows = 6;

  const rect = container.getBoundingClientRect();

  const cellW = rect.width / cols;
  const cellH = rect.height / rows;

  document.documentElement.style.setProperty('--cell-w', cellW + 'px');
  document.documentElement.style.setProperty('--cell-h', cellH + 'px');
}

export function getMaxVisibleRows() {
  return 6;
}

export function getRowWidth() {
  const container = document.getElementById('bookmark-container');
  const cols = 12; // número de columnas fijo o configurable
  return container.clientWidth / cols;
}

export function getRowHeight() {
  const container = document.getElementById('bookmark-container');
  const rows = 6;
  return container.clientHeight / rows;
}