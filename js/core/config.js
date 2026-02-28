/**
 * Current extension version.
 * 
 * - Uses semantic versioning (MAJOR.MINOR.PATCH).
 * 
 * @type {string}
 */
export const VERSION = chrome.runtime.getManifest().version;

/**
 * Enables or disables debug logging throughout the app.
 * @type {boolean}
 */
export const DEBUG = true;

/**
 * Number of columns in the bookmark grid layout.
 * @type {number}
 */
export const GRID_COLS = 12;

/**
 * Number of rows in the bookmark grid layout.
 * @type {number}
 */
export const GRID_ROWS = 6;

/**
 * Padding (in pixels) between grid items.
 * @type {number}
 */
export const PADDING = 10;

/**
 * Maximum number of flash message visible at the same time.
 * 
 * Older messages are removed when this limit is exceeded.
 * @type {number}
 */
export const MAX_FLASHES = 3;