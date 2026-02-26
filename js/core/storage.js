import '../types/types.js'; // typedefs
import { DEFAULT_STATE } from './defaults.js';

/**
 * Default persisted values.
 * Guarantees a fully valid persisted structure.
 * @type {PersistedData}
 */
const DEFAULT_PERSISTED_DATA = {
  bookmarks: DEFAULT_STATE.data.bookmarks,
  settings: DEFAULT_STATE.data.settings
};

/**
 * Promise-based wrapper around chrome.storage.local.
 * Handles defaults and guarantees consistent data shape.
 */
export const storage = {
  /**
   * Retrieves persisted data.
   *
   * If `keys` is null, returns a fully populated PersistedData object.
   * Missing values are automatically replaced with defaults.
   *
   * @param {keyof PersistedData | (keyof PersistedData)[] | null} keys
   * @returns {Promise<PersistedData | Partial<PersistedData>>}
   */
  async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        // If requesting all data → guarantee full structure
        if (keys === null) {
          resolve({
            bookmarks: result.bookmarks ?? DEFAULT_PERSISTED_DATA.bookmarks,
            settings: result.settings ?? DEFAULT_PERSISTED_DATA.settings
          });
          return;
        }

        resolve(result);
      });
    });
  },

  /**
   * Persists bookmarks and/or settings.
   *
   * @param {Partial<PersistedData>} data
   * @returns {Promise<void>}
   */
  async set(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Removes persisted keys.
   *
   * @param {keyof PersistedData | (keyof PersistedData)[]} keys
   * @returns {Promise<void>}
   */
  async remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
};