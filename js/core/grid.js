import '../types/types.js'; // typedefs

/**
 * Checks whether a rectangular grid area is free of overlapping bookmarks.
 *
 * @param {Bookmark[]} bookmarks
 * @param {number} gx
 * @param {number} gy
 * @param {number} [w=1]
 * @param {number} [h=1]
 * @param {string|null} [ignoreId=null]
 * @returns {boolean}
 */
export function isAreaFree(bookmarks, gx, gy, w = 1, h = 1, ignoreId = null) {
  for (const bm of bookmarks) {
    if (ignoreId != null && bm.id === ignoreId) continue;
    if (bm.gx == null || bm.gy == null) continue;

    if (rectanglesOverlap(gx, gy, w, h, bm.gx, bm.gy, bm.w, bm.h)) return false;
  }

  return true;
}

/**
 * Checks whether two grid rectangles overlap.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} aw
 * @param {number} ah
 * @param {number} bx
 * @param {number} by
 * @param {number} bw
 * @param {number} bh
 * @returns {boolean}
 */
function rectanglesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  const separated =
    ax + aw <= bx ||
    bx + bw <= ax ||
    ay + ah <= by ||
    by + bh <= ay;

  return !separated;
}