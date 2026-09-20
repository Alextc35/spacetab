/**
 * Current extension version.
 * 
 * - Uses semantic versioning (MAJOR.MINOR.PATCH).
 * 
 * @type {string}
 */
export const VERSION = chrome.runtime.getManifest().version;

/**
 * Initial debug state. SpaceTabDebug.toggle() changes it for the current tab.
 * @type {boolean}
 */
export const DEBUG = false;

/**
 * Maximum number of flash message visible at the same time.
 * 
 * Older messages are removed when this limit is exceeded.
 * @type {number}
 */
export const MAX_FLASHES = 3;
