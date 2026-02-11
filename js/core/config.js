/**
 * =========================================================
 * Global application configuration
 * =========================================================
 *
 * This file defines:
 * - Global constants
 * - Layout configuration
 * - Default application settings
 * - Runtime (mutable) settings
 *
 * It must NOT contain UI logic or side effects.
 * Values here are intended to be imported across core and UI modules.
 */

/**
 * Enables debug mode across the application.
 * When true, extra console logs and diagnostics may appear.
 *
 * @type {boolean}
 */
export const DEBUG = true;

/* =========================================================
 * Layout & grid configuration
 * ========================================================= */

/**
 * Number of columns in the bookmark grid.
 * Used for positioning and resizing bookmarks.
 *
 * @type {number}
 */
export const GRID_COLS = 12;

/**
 * Number of rows in the bookmark grid.
 *
 * @type {number}
 */
export const GRID_ROWS = 6;

/**
 * Internal padding (in pixels) applied to bookmarks
 * when calculating their rendered size.
 *
 * @type {number}
 */
export const PADDING = 10;

/* =========================================================
 * Settings
 * ========================================================= */

/**
 * Default application settings.
 * These values are used on first run or when no stored
 * settings are found.
 *
 * @type {{ language: string }}
 */
export const DEFAULT_SETTINGS = {
  language: 'en',

  theme: {
    backgroundColor: '#333333',
    backgroundImageUrl: 'https://wallpapercave.com/wp/wp2730867.gif'
  }
};

/**
 * Runtime settings object.
 *
 * This object is mutable and represents the current
 * application settings in memory.
 *
 * It is typically:
 * - initialized from DEFAULT_SETTINGS
 * - overwritten with values loaded from storage
 * - updated by the settings UI
 *
 * Other modules (e.g. i18n) should read from this object,
 * but avoid mutating it directly unless necessary.
 *
 * @type {{ language: string }}
 */
export let SETTINGS = structuredClone(DEFAULT_SETTINGS);