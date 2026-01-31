/**
 * storage.js
 * ------------------------------------------------------
 * Promise-based wrapper around chrome.storage.local.
 *
 * Acts as the single persistence layer for the application.
 * All modules must interact with Chrome storage exclusively
 * through this abstraction.
 * ------------------------------------------------------
 */

/**
 * @typedef {Object.<string, any>} StorageData
 */

export const storage = {
  /**
   * Retrieves values from storage.
   *
   * @param {string|string[]|Object|null} keys
   * @returns {Promise<Object>}
   */
  async get(keys) {
    return new Promise(resolve => chrome.storage.local.get(keys, resolve));
  },

  /**
   * Persists data to storage.
   *
   * @param {StorageData} data
   * @returns {Promise<void>}
   */
  async set(data) {
    return new Promise(resolve => chrome.storage.local.set(data, resolve));
  },

  /**
   * Removes keys from storage.
   *
   * @param {string|string[]} keys
   * @returns {Promise<void>}
   */
  async remove(keys) {
    return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
  }
};