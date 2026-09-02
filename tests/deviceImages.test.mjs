import assert from 'node:assert/strict';
import test from 'node:test';
import { migratePersistedData } from '../src/js/core/dataSchema.js';
import {
  DEVICE_IMAGE_SELECTIONS_KEY,
  restoreDeviceImageSelections,
  saveDeviceImageSelections,
  withoutDeviceImages
} from '../src/js/core/deviceImages.js';

const owned = 'spacetab-local-image:4c5b9a2e-3f0e-4c7e-889c-72117afc09e9';
const replacement = 'spacetab-local-image:8c5b9a2e-3f0e-4c7e-889c-72117afc09e9';
const foreign = 'spacetab-local-image:9c5b9a2e-3f0e-4c7e-889c-72117afc09e9';
const local = {
  'spacetabLocalImage:4c5b9a2e-3f0e-4c7e-889c-72117afc09e9': { dataUrl: 'data:image/webp;base64,b3duZWQ=', name: 'owned.webp' },
  'spacetabLocalImage:8c5b9a2e-3f0e-4c7e-889c-72117afc09e9': { dataUrl: 'data:image/webp;base64,bmV3', name: 'new.webp' }
};
globalThis.chrome = {
  runtime: { lastError: null },
  storage: { local: {
    get(keys, callback) {
      callback(Object.fromEntries((Array.isArray(keys) ? keys : [keys])
        .filter(key => Object.hasOwn(local, key)).map(key => [key, structuredClone(local[key])])));
    },
    set(items, callback) { Object.assign(local, structuredClone(items)); callback(); }
  } }
};

function dataWithImage(reference) {
  const style = { backgroundImageLocal: reference, backgroundImageUrl: 'https://images.test/fallback.gif' };
  return migratePersistedData({
    bookmarks: [{ id: 'bookmark', name: 'Bookmark', ...style }],
    folders: [{ id: 'folder', name: 'Folder', ...style }],
    settings: {
      theme: style,
      bookmarkDefault: style,
      bookmarkPresets: [{ id: 'preset', name: 'Preset', style }]
    }
  });
}

function styles(data) {
  return [data.settings.theme, data.settings.bookmarkDefault, data.settings.bookmarkPresets[0].style,
    data.bookmarks[0], data.folders[0]];
}

test('migrates only available legacy files and keeps every image slot local through remote updates', async () => {
  const legacy = dataWithImage(owned);
  legacy.folders[0].backgroundImageLocal = foreign;
  const restored = await restoreDeviceImageSelections(legacy);
  assert.equal(restored.settings.theme.backgroundImageLocal, owned);
  assert.equal(restored.folders[0].backgroundImageLocal, null);
  assert.equal(Object.keys(local[DEVICE_IMAGE_SELECTIONS_KEY]).length, 5);

  for (const style of styles(restored)) style.backgroundImageLocal = replacement;
  await saveDeviceImageSelections(restored);
  const refreshed = await restoreDeviceImageSelections(dataWithImage(foreign));
  for (const style of styles(refreshed)) assert.equal(style.backgroundImageLocal, replacement);

  const shared = withoutDeviceImages(refreshed);
  assert.equal(JSON.stringify(shared).includes('spacetab-local-image:'), false);
  for (const style of styles(shared)) {
    assert.equal(Object.hasOwn(style, 'backgroundImageLocal'), false);
    assert.equal(style.backgroundImageUrl, 'https://images.test/fallback.gif');
  }
  for (const style of styles(refreshed)) assert.equal(style.backgroundImageLocal, replacement);

  for (const style of styles(refreshed)) style.backgroundImageLocal = null;
  await saveDeviceImageSelections(refreshed);
  const afterRemoval = await restoreDeviceImageSelections(dataWithImage(owned));
  for (const style of styles(afterRemoval)) assert.equal(style.backgroundImageLocal, null);
});
