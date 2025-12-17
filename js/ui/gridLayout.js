export function updateGridSize() {
  const container = document.getElementById('bookmark-container');
  if (!container) return;

  const cols = 12;
  const rows = 6;

  const rect = container.getBoundingClientRect();

  const cellW = rect.width / cols;
  const cellH = rect.height / rows;

  const gridSize = Math.floor(Math.min(cellW, cellH));

  document.documentElement.style.setProperty(
    '--grid-size',
    gridSize + 'px'
  );
}

export function getMaxVisibleRows() {
  const container = document.getElementById('bookmark-container');
  if (!container) return 0;

  const gridSize = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--grid-size')
  );

  const usableHeight = container.clientHeight;

  return Math.floor(usableHeight / gridSize);
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