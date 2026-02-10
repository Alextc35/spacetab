/**
 * gridLayout.js
 * ------------------------------------------------------
 * Grid layout utilities and CSS synchronization.
 *
 * Responsibilities:
 * - Computes grid cell dimensions based on container size
 * - Exposes grid limits (rows / columns)
 * - Synchronizes grid measurements with CSS variables
 * - Provides helpers for pixel-to-grid calculations
 *
 * Notes:
 * - Grid dimensions are driven by GRID_COLS / GRID_ROWS
 * - The container element is the visual reference
 * - CSS variables are used by the UI for layout and snapping
 * ------------------------------------------------------
 */

import { GRID_COLS, GRID_ROWS } from '../core/config.js';
import { container } from './bookmarks.js'; 

/**
 * Updates CSS variables representing grid cell size.
 *
 * Sets:
 * - --cell-w : width of a single grid column in pixels
 * - --cell-h : height of a single grid row in pixels
 *
 * This should be called whenever the container is resized.
 *
 * @param {HTMLElement} container - Grid container element
 */
export function updateGridSize(container) {
  if (!container) return;

  const rect = container.getBoundingClientRect();

  const cellW = rect.width / GRID_COLS;
  const cellH = rect.height / GRID_ROWS;

  document.documentElement.style.setProperty('--cell-w', cellW + 'px');
  document.documentElement.style.setProperty('--cell-h', cellH + 'px');
}

/**
 * Returns the maximum number of visible grid rows.
 *
 * @returns {number}
 */
export function getMaxVisibleRows() {
  return GRID_ROWS;
}

/**
 * Returns the maximum number of visible grid columns.
 *
 * @returns {number}
 */
export function getMaxVisibleCols() {
  return GRID_COLS;
}

/**
 * Returns the pixel width of a single grid column.
 *
 * @returns {number}
 */
export function getRowWidth() {
  const cols = getMaxVisibleCols();
  return container.clientWidth / cols;
}

/**
 * Returns the pixel height of a single grid row.
 *
 * @returns {number}
 */
export function getRowHeight() {
  const rows = getMaxVisibleRows();
  return container.clientHeight / rows;
}