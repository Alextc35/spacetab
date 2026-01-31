/**
 * grid.js
 * ------------------------------------------------------
 * Grid layout utilities for bookmarks.
 *
 * This module contains pure functions to:
 * - Interpret bookmark grid coordinates (gx, gy, w, h)
 * - Check spatial collisions between bookmarks
 *
 * All logic here is UI-agnostic:
 * - No DOM access
 * - No pixels
 * - No side effects
 *
 * Coordinates are expressed in grid units, not pixels.
 * ------------------------------------------------------
 */

/**
 * Returns a normalized grid rectangle from a bookmark.
 *
 * Ensures gx, gy, w and h always have valid values.
 *
 * @param {Object} bm - Bookmark object
 * @returns {{gx:number, gy:number, w:number, h:number}}
 */
export function getGridRectFromBookmark(bm) {
  return {
    gx: bm.gx ?? 0,
    gy: bm.gy ?? 0,
    w: bm.w || 1,
    h: bm.h || 1
  };
}

/**
 * Checks whether a grid area is free of collisions.
 *
 * The area is defined in grid units.
 * An optional bookmark id can be ignored (useful for drag/resize).
 *
 * @param {Array<Object>} bookmarks - All existing bookmarks
 * @param {number} gx - Target grid column
 * @param {number} gy - Target grid row
 * @param {number} w - Width in grid units
 * @param {number} h - Height in grid units
 * @param {string|null} ignoreId - Bookmark id to ignore
 * @returns {boolean} True if the area is free
 */
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