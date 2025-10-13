// core/grid.js
import { GRID_SIZE } from './config.js';

// convierte píxeles a unidades de cuadrícula
export function pxToGrid(px) {
  return Math.round(px / GRID_SIZE);
}

// convierte unidades de cuadrícula a píxeles
export function gridToPx(g) {
  return g * GRID_SIZE;
}

// obtiene el rectángulo de cuadrícula de un bookmark
export function getGridRectFromBookmark(bm) {
  const gx = pxToGrid(bm.x ?? 0);
  const gy = pxToGrid(bm.y ?? 0);
  const w = bm.w || 1;
  const h = bm.h || 1;
  return { gx, gy, w, h };
}

// comprueba si un área está libre dentro del conjunto de bookmarks
export function isAreaFree(bookmarks, gx, gy, w, h, ignoreIndex = -1) {
  for (let i = 0; i < bookmarks.length; i++) {
    if (i === ignoreIndex) continue;
    const bm = bookmarks[i];
    if (bm.x == null || bm.y == null) continue;

    const other = getGridRectFromBookmark(bm);
    const separated =
      gx + w <= other.gx ||
      other.gx + other.w <= gx ||
      gy + h <= other.gy ||
      other.gy + other.h <= gy;
    if (!separated) return false;
  }
  return true;
}