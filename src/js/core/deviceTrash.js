export const DEVICE_TRASH_KEY = 'spacetabLocalTrash';

/** Removes deleted entries from the payload shared through Sync. */
export function withoutDeviceTrash(data) {
  const shared = structuredClone(data);
  delete shared.trash;
  return shared;
}

/** Persists this device's current recycle-bin contents, including an empty bin. */
export async function saveDeviceTrash(data) {
  const trash = Array.isArray(data?.trash) ? structuredClone(data.trash) : [];
  await callLocalStorage('set', { [DEVICE_TRASH_KEY]: trash });
}

/**
 * Overlays this device's recycle-bin contents on synchronized data. Legacy
 * synchronized entries are adopted once so upgrading does not lose them.
 */
export async function restoreDeviceTrash(data) {
  const restored = structuredClone(data);
  const stored = await callLocalStorage('get', DEVICE_TRASH_KEY);

  if (Object.hasOwn(stored, DEVICE_TRASH_KEY)) {
    restored.trash = Array.isArray(stored[DEVICE_TRASH_KEY])
      ? structuredClone(stored[DEVICE_TRASH_KEY])
      : [];
    return restored;
  }

  const legacyTrash = Array.isArray(restored.trash)
    ? structuredClone(restored.trash)
    : [];
  await callLocalStorage('set', { [DEVICE_TRASH_KEY]: legacyTrash });
  restored.trash = legacyTrash;
  return restored;
}

/** Removes device-only recycle-bin contents during a complete data reset. */
export function clearDeviceTrash() {
  return callLocalStorage('remove', DEVICE_TRASH_KEY);
}

function callLocalStorage(method, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local[method](value, result => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}
