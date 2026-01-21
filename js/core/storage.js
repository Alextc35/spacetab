/**
 * core/storage.js
 * ------------------------------------------------------
 * Wrapper around the `chrome.storage.local` API.
 *
 * Converts Chrome's callback-based storage methods
 * into Promises so the rest of the project can use
 * `async / await` syntax.
 *
 * This file does NOT implement a custom storage system.
 * It simply delegates all operations to
 * `chrome.storage.local`.
 *
 * Typical usage:
 *   const data = await storage.get("bookmarks");
 *   await storage.set({ bookmarks });
 *
 * Notes:
 * - Data is stored per user profile and per extension.
 * - All operations are asynchronous.
 * - `get(null)` returns the entire local storage.
 * 
 * Debug logging is controlled via the DEBUG flag.
 * ------------------------------------------------------
 */

import { DEBUG } from './config.js';

if (DEBUG) console.log('Storage module initialized.');

export const storage = {
  async get(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  },

  async set(data) {
    return new Promise((resolve) => chrome.storage.local.set(data, resolve));
  },

  async remove(keys) {
    return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
  }
};