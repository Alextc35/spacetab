import { isLocalImageReference, preloadLocalImages, resolveImageSource } from './localImages.js';

export const DEVICE_IMAGE_SELECTIONS_KEY = 'spacetabLocalImageSelections';

/** Stable slots let each device choose its own file for the same synchronized item. */
function imageSlots(data) {
  return [
    ['theme', data.settings?.theme],
    ['bookmarkDefault', data.settings?.bookmarkDefault],
    ...(data.bookmarks ?? []).map(item => [`bookmark:${item.id}`, item]),
    ...(data.folders ?? []).map(item => [`folder:${item.id}`, item]),
    ...(data.settings?.bookmarkPresets ?? []).map(item => [`preset:${item.id}`, item.style])
  ].filter(([, style]) => style && typeof style === 'object');
}

/** Removes device selections from the payload sent to Sync, without changing app state. */
export function withoutDeviceImages(data) {
  const shared = structuredClone(data);
  for (const [, style] of imageSlots(shared)) delete style.backgroundImageLocal;
  return shared;
}

/** Commits local selections, including explicit removals, when the user saves a draft. */
export async function saveDeviceImageSelections(data) {
  const selections = await readSelections();
  let changed = false;
  for (const [key, style] of imageSlots(data)) {
    const reference = isLocalImageReference(style.backgroundImageLocal)
      ? style.backgroundImageLocal : null;
    if (!Object.hasOwn(selections, key) && !reference) continue;
    if (selections[key] === reference) continue;
    selections[key] = reference;
    changed = true;
  }
  if (changed) await writeSelections(selections);
}

/**
 * Overlays this device's choices on incoming data. Legacy inline references are
 * adopted only where the file is available locally and no choice has been made.
 * A saved null prevents a removed image from reappearing after a sync refresh.
 */
export async function restoreDeviceImageSelections(data) {
  const restored = structuredClone(data);
  const selections = await readSelections();
  const slots = imageSlots(restored);
  const candidates = slots.map(([key, style]) => (
    Object.hasOwn(selections, key) ? selections[key] : style.backgroundImageLocal
  ));
  await preloadLocalImages(candidates);

  let changed = false;
  for (const [key, style] of slots) {
    const hasSelection = Object.hasOwn(selections, key);
    const reference = hasSelection ? selections[key] : style.backgroundImageLocal;
    const available = isLocalImageReference(reference) && resolveImageSource(reference);
    style.backgroundImageLocal = available ? reference : null;
    if (!hasSelection && isLocalImageReference(reference)) {
      selections[key] = style.backgroundImageLocal;
      changed = true;
    }
  }
  if (changed) await writeSelections(selections);
  return restored;
}

async function readSelections() {
  const stored = await callLocalStorage('get', DEVICE_IMAGE_SELECTIONS_KEY);
  const value = stored[DEVICE_IMAGE_SELECTIONS_KEY];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, reference]) => (
    reference === null || isLocalImageReference(reference)
  )));
}

function writeSelections(selections) {
  return callLocalStorage('set', { [DEVICE_IMAGE_SELECTIONS_KEY]: selections });
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
