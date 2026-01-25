
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
export function isAreaFree(bookmarks, gx, gy, w = 1, h = 1, ignoreId = null) {
  for (const bm of bookmarks) {
    if (ignoreId != null && bm.id === ignoreId) continue;
    if (bm.gx == null || bm.gy == null) continue;

    const separated =
      gx + w <= bm.gx ||
      bm.gx + bm.w <= gx ||
      gy + h <= bm.gy ||
      bm.gy + bm.h <= gy;

    if (!separated) return false;
  }
  return true;
}


