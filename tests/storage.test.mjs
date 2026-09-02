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

const { storage, STORAGE_MODES } = await import('../src/js/core/storage.js');
const { DATA_SCHEMA_VERSION } = await import('../src/js/core/defaults.js');

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
  bookmarks: [{
    id: 'local', name: 'Local bookmark', url: 'https://local.test', folderId: 'saved'
  }],
  folders: [{ id: 'saved', name: 'Saved', gx: 0, gy: 0, w: 1, h: 1 }],
  settings: SETTINGS
};

test('reports used, total, and available bytes for both storage areas', async () => {
  const local = await storage.getUsage(STORAGE_MODES.LOCAL);
  const sync = await storage.getUsage(STORAGE_MODES.SYNC);

  assert.equal(local.mode, STORAGE_MODES.LOCAL);
  assert.equal(local.quotaBytes, 10485760);
  assert.equal(local.availableBytes, local.quotaBytes - local.usedBytes);
  assert.ok(local.usedBytes >= 0);

  assert.equal(sync.mode, STORAGE_MODES.SYNC);
  assert.equal(sync.quotaBytes, 102400);
  assert.equal(sync.availableBytes, sync.quotaBytes - sync.usedBytes);
  assert.ok(sync.usedBytes >= 0);

  await assert.rejects(storage.getUsage('session'), /Unsupported storage mode/);
});

test('migrates local data to an empty synchronized area', async () => {
  await storage.initialize();
  await storage.set(LOCAL_DATA);

  const result = await storage.changeMode(STORAGE_MODES.SYNC, LOCAL_DATA);

  assert.equal(result.source, 'migrated');
  assert.equal(storage.getMode(), STORAGE_MODES.SYNC);
  const stored = await storage.get(null);
  assert.equal(stored.schemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(stored.bookmarks[0].id, 'local');
  assert.equal(stored.bookmarks[0].name, 'Local bookmark');
  assert.equal(stored.bookmarks[0].folderId, 'saved');
  assert.equal(stored.folders[0].name, 'Saved');
  assert.deepEqual(stored.settings.bookmarkDefault, {
    backgroundImageUrl: null,
    backgroundImageLocal: null,
    backgroundImageUrlLocked: false,
    backgroundFavicon: true,
    invertColorBg: false,
    noBackground: true,
    backgroundColor: '#000000',
    showText: true,
    textColor: '#ffffff',
    showFavicon: true,
    invertColorIcon: false
  });
  assert.ok(chrome.storage.sync.data.spacetabSyncMeta);
  assert.equal(chrome.storage.sync.data.bookmarks, undefined);
});

test('keeps a local copy when synchronization is disabled', async () => {
  const syncData = await storage.get(null);
  const result = await storage.changeMode(STORAGE_MODES.LOCAL, syncData);

  assert.equal(result.source, 'migrated');
  assert.equal(storage.getMode(), STORAGE_MODES.LOCAL);
  assert.equal((await storage.get(null)).bookmarks[0].id, 'local');
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
  assert.equal(result.data.bookmarks[0].id, 'local');
});

test('identifies synchronized writes from this and other devices', async () => {
  const events = [];
  const unsubscribe = storage.subscribe(change => events.push(change));

  await storage.set(LOCAL_DATA);

  const ownMeta = chrome.storage.sync.data.spacetabSyncMeta;
  assert.equal(typeof ownMeta.writerDeviceId, 'string');
  assert.equal(typeof ownMeta.writeId, 'string');
  assert.equal(events.at(-1).areaName, STORAGE_MODES.SYNC);
  assert.equal(events.at(-1).origin, 'same-device');

  chrome.storage.sync.set({
    spacetabSyncMeta: {
      ...ownMeta,
      updatedAt: ownMeta.updatedAt + 1,
      writerDeviceId: 'another-device',
      writeId: 'another-device-write'
    }
  }, () => {});

  assert.equal(events.at(-1).areaName, STORAGE_MODES.SYNC);
  assert.equal(events.at(-1).origin, 'other-device');
  unsubscribe();
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
  const storedBookmarks = (await storage.get(null)).bookmarks;
  assert.equal(storedBookmarks[0].id, 'chunked');
  assert.equal(storedBookmarks[0].name, chunkedData.bookmarks[0].name.trim());
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

test('reports and deletes only SpaceTab synchronized data', async () => {
  chrome.storage.sync.data.unrelatedExtensionValue = 'keep';

  const beforeDelete = await storage.getSyncMetadata();
  assert.equal(beforeDelete.hasData, true);
  assert.equal(Number.isFinite(beforeDelete.updatedAt), true);

  const deleted = await storage.clearSyncData();
  const afterDelete = await storage.getSyncMetadata();

  assert.equal(deleted, true);
  assert.deepEqual(afterDelete, { hasData: false, updatedAt: null });
  assert.equal(chrome.storage.sync.data.unrelatedExtensionValue, 'keep');
});

test('follows storage-mode changes made by another open tab', async () => {
  let notifications = 0;
  const unsubscribe = storage.subscribe(() => { notifications += 1; });

  chrome.storage.local.set({ spacetabStorageMode: STORAGE_MODES.LOCAL }, () => {});

  assert.equal(storage.getMode(), STORAGE_MODES.LOCAL);
  assert.equal(notifications, 1);
  unsubscribe();
});

test('falls back to compatible local data when sync was written by a newer version', async () => {
  await storage.set(LOCAL_DATA);
  const futureSchemaVersion = DATA_SCHEMA_VERSION + 1;
  const futureSyncData = {
    schemaVersion: futureSchemaVersion,
    bookmarks: [{ id: 'future', name: 'Future bookmark' }],
    folders: [],
    settings: SETTINGS
  };

  chrome.storage.sync.set(futureSyncData, () => {});
  chrome.storage.local.set({ spacetabStorageMode: STORAGE_MODES.SYNC }, () => {});

  const recovered = await storage.get(null);
  const compatibility = storage.getSyncCompatibility();

  assert.equal(storage.getMode(), STORAGE_MODES.LOCAL);
  assert.equal(recovered.bookmarks[0].id, 'local');
  assert.equal(compatibility.reason, 'newer-sync-data');
  assert.equal(compatibility.requiredSchemaVersion, futureSchemaVersion);
  assert.equal(compatibility.supportedSchemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(chrome.storage.local.data.spacetabStorageMode, STORAGE_MODES.LOCAL);
  assert.equal(chrome.storage.sync.data.schemaVersion, futureSchemaVersion);
  assert.equal(chrome.storage.sync.data.bookmarks[0].id, 'future');

  await assert.rejects(
    storage.changeMode(STORAGE_MODES.SYNC, recovered),
    error => error.code === 'SYNC_REQUIRES_NEWER_VERSION'
  );

  await storage.clearSyncData();
  assert.equal(storage.getSyncCompatibility(), null);
});
