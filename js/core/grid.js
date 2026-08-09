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
 * Finds the first free grid position, scanning columns from left to right and
 * rows from top to bottom to preserve SpaceTab's current placement behavior.
 *
 * @param {Bookmark[]} bookmarks
 * @param {Object} bounds
 * @param {number} bounds.columns
 * @param {number} bounds.rows
 * @param {number} [bounds.w=1]
 * @param {number} [bounds.h=1]
 * @param {string|null} [bounds.ignoreId=null]
 * @returns {{gx: number, gy: number}|null}
 */
export function findFirstFreeSlot(bookmarks, {
  columns,
  rows,
  w = 1,
  h = 1,
  ignoreId = null
}) {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) {
    return null;
  }

  for (let gx = 0; gx <= columns - w; gx += 1) {
    for (let gy = 0; gy <= rows - h; gy += 1) {
      if (isAreaFree(bookmarks, gx, gy, w, h, ignoreId)) return { gx, gy };
    }
  }

  return null;
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
