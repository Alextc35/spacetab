import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeBackgroundImage,
  preloadLocalImages,
  resolveBackgroundImage
} from '../src/js/core/localImages.js';

test('uses the URL when a local file is missing, and prefers it only after the file is loaded', async () => {
  const reference = 'spacetab-local-image:4c5b9a2e-3f0e-4c7e-889c-72117afc09e9';
  const background = {
    backgroundImageLocal: reference,
    backgroundImageUrl: 'https://images.test/animated.gif'
  };
  assert.equal(resolveBackgroundImage(background), background.backgroundImageUrl);
  assert.equal(resolveBackgroundImage({ backgroundImageLocal: reference }), null);
  assert.equal(resolveBackgroundImage({ backgroundImageUrl: reference }), null);

  const image = 'data:image/webp;base64,c2FtcGxl';
  globalThis.chrome = {
    runtime: { lastError: null },
    storage: { local: { get(_keys, callback) {
      callback({ 'spacetabLocalImage:4c5b9a2e-3f0e-4c7e-889c-72117afc09e9': { dataUrl: image } });
    } } }
  };
  try {
    await preloadLocalImages(background);
    assert.equal(resolveBackgroundImage(background), image);
    assert.equal(resolveBackgroundImage({ ...background, backgroundImageLocal: null }), background.backgroundImageUrl);
  } finally {
    delete globalThis.chrome;
  }
});

test('does not allow URLs or image bytes in the local reference field', () => {
  for (const invalid of ['https://images.test/local.png', 'data:image/png;base64,c2FtcGxl', {}, 7]) {
    assert.equal(normalizeBackgroundImage({ backgroundImageLocal: invalid }).backgroundImageLocal, null);
  }
});
