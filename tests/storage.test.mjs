import assert from 'node:assert/strict';
import test from 'node:test';

const storageChangeListeners = [];

function selectValues(data, keys) {
  if (keys === null || keys === undefined) return structuredClone(data);

  const requested = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(
    requested
      .filter(key => Object.hasOwn(data, key))
      .map(key => [key, structuredClone(data[key])])
  );
}

function createStorageArea(areaName) {
  const data = {};

  return {
    data,
    QUOTA_BYTES: areaName === 'sync' ? 102400 : 10485760,

    get(keys, callback) {
      callback(selectValues(data, keys));
    },

    set(items, callback) {
      const changes = {};

      for (const [key, value] of Object.entries(items)) {
        changes[key] = {
          oldValue: data[key],
          newValue: structuredClone(value)
        };
        data[key] = structuredClone(value);
      }

      callback();
      for (const listener of storageChangeListeners) listener(changes, areaName);
    },

    remove(keys, callback) {
      const changes = {};

      for (const key of (Array.isArray(keys) ? keys : [keys])) {
        if (!Object.hasOwn(data, key)) continue;
        changes[key] = { oldValue: data[key] };
        delete data[key];
      }

      callback();
      for (const listener of storageChangeListeners) listener(changes, areaName);
    }
  };
}

globalThis.chrome = {
  runtime: { lastError: null },
  storage: {
    local: createStorageArea('local'),
    sync: createStorageArea('sync'),
    onChanged: {
      addListener(listener) {
        storageChangeListeners.push(listener);
      }
    }
  }
};

const { storage, STORAGE_MODES } = await import('../js/core/storage.js');

const SETTINGS = {
  language: 'es',
  theme: {
    backgroundDefault: false,
    backgroundColor: '#123456',
    backgroundImageUrl: null,
    backgroundImageUrlLocked: false
  },
  bookmarkDefault: {
    name: 'Default',
    url: 'https://example.com'
  }
};

const LOCAL_DATA = {
  bookmarks: [{ id: 'local', name: 'Local bookmark', url: 'https://local.test' }],
  settings: SETTINGS
};

test('migrates local data to an empty synchronized area', async () => {
  await storage.initialize();
  await storage.set(LOCAL_DATA);

  const result = await storage.changeMode(STORAGE_MODES.SYNC, LOCAL_DATA);

  assert.equal(result.source, 'migrated');
  assert.equal(storage.getMode(), STORAGE_MODES.SYNC);
  assert.deepEqual(await storage.get(null), {
    bookmarks: LOCAL_DATA.bookmarks,
    settings: {
      ...SETTINGS,
      bookmarkDefault: {
        backgroundImageUrl: null,
        backgroundImageUrlLocked: false,
        backgroundFavicon: true,
        invertColorBg: false,
        noBackground: true,
        backgroundColor: '#000000',
        showText: true,
        textColor: '#ffffff',
        showFavicon: true,
        invertColorIcon: false,
        ...SETTINGS.bookmarkDefault
      }
    }
  });
  assert.ok(chrome.storage.sync.data.spacetabSyncMeta);
  assert.equal(chrome.storage.sync.data.bookmarks, undefined);
});

test('keeps a local copy when synchronization is disabled', async () => {
  const syncData = await storage.get(null);
  const result = await storage.changeMode(STORAGE_MODES.LOCAL, syncData);

  assert.equal(result.source, 'migrated');
  assert.equal(storage.getMode(), STORAGE_MODES.LOCAL);
  assert.deepEqual((await storage.get(null)).bookmarks, LOCAL_DATA.bookmarks);
  assert.ok(chrome.storage.sync.data.spacetabSyncMeta);
});

test('uses existing synchronized data instead of overwriting it', async () => {
  await storage.set({
    bookmarks: [{ id: 'different-local' }],
    settings: SETTINGS
  });

  const currentLocal = await storage.get(null);
  const result = await storage.changeMode(STORAGE_MODES.SYNC, currentLocal);

  assert.equal(result.source, 'existing');
  assert.deepEqual(result.data.bookmarks, LOCAL_DATA.bookmarks);
});

test('chunks values safely below Chrome per-item quota', async () => {
  const chunkedData = {
    bookmarks: [{
      id: 'chunked',
      name: '🙂 "quoted" \\ value '.repeat(1000),
      url: 'https://example.com'
    }],
    settings: SETTINGS
  };

  await storage.set(chunkedData);

  const chunkEntries = Object.entries(chrome.storage.sync.data)
    .filter(([key]) => key.startsWith('spacetabSyncChunk:'));
  const encoder = new TextEncoder();

  assert.ok(chunkEntries.length > 1);
  assert.ok(chunkEntries.every(([key, value]) => (
    encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length < 8192
  )));
  assert.deepEqual((await storage.get(null)).bookmarks, chunkedData.bookmarks);
});

test('rejects synchronized payloads above Chrome quota', async () => {
  const oversized = {
    bookmarks: [{ id: 'huge', name: 'x'.repeat(110000) }],
    settings: SETTINGS
  };

  await assert.rejects(
    storage.set(oversized),
    error => error.code === 'SYNC_QUOTA_EXCEEDED'
  );
});

test('follows storage-mode changes made by another open tab', async () => {
  let notifications = 0;
  const unsubscribe = storage.subscribe(() => { notifications += 1; });

  chrome.storage.local.set({ spacetabStorageMode: STORAGE_MODES.LOCAL }, () => {});

  assert.equal(storage.getMode(), STORAGE_MODES.LOCAL);
  assert.equal(notifications, 1);
  unsubscribe();
});
