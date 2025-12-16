export function updateGridSize() {
  const container = document.getElementById('bookmark-container');
  if (!container) return;

  const cols = 13;
  const rows = 7;

  const rect = container.getBoundingClientRect();

  const cellW = rect.width / cols;
  const cellH = rect.height / rows;

  const gridSize = Math.floor(Math.min(cellW, cellH));

  document.documentElement.style.setProperty(
    '--grid-size',
    gridSize + 'px'
  );
}
