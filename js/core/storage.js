// core/storage.js
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