
// obtiene el rectángulo de cuadrícula de un bookmark
export function getGridRectFromBookmark(bm) {
  return {
    gx: bm.gx ?? 0,
    gy: bm.gy ?? 0,
    w: bm.w || 1,
    h: bm.h || 1
  };
}

// comprueba si un área está libre dentro del conjunto de bookmarks
export function isAreaFree(bookmarks, gx, gy, w = 1, h = 1, ignoreIndex = -1) {
  for (let i = 0; i < bookmarks.length; i++) {
    if (i === ignoreIndex) continue;
    const bm = bookmarks[i];
    if (bm.gx == null || bm.gy == null) continue;

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

