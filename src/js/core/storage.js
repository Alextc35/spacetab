import '../types/types.js'; // typedefs
import { migratePersistedData } from './dataSchema.js';

export const STORAGE_MODES = Object.freeze({
  LOCAL: 'local',
  SYNC: 'sync'
});

const STORAGE_MODE_KEY = 'spacetabStorageMode';
const SYNC_META_KEY = 'spacetabSyncMeta';
const SYNC_CHUNK_PREFIX = 'spacetabSyncChunk:';
const SYNC_FORMAT_VERSION = 1;
const SYNC_ITEM_SAFE_BYTES = 7600;

/** @type {'local'|'sync'} */
let activeMode = STORAGE_MODES.LOCAL;
let initialized = false;

/** @type {Set<() => void>} */
const changeListeners = new Set();

/**
 * Converts callback-based chrome.storage calls into promises.
 *
 * @param {chrome.storage.StorageArea} area
 * @param {'get'|'set'|'remove'} method
 * @param {*} value
 * @returns {Promise<*>}
 */
function callStorage(area, method, value) {
  return new Promise((resolve, reject) => {
    area[method](value, result => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(result);
    });
  });
}

/**
 * Returns a complete, cloned data object and fills missing nested settings.
 *
 * @param {Partial<PersistedData>|null|undefined} data
 * @returns {PersistedData}
 */
function normalizePersistedData(data) {
  return migratePersistedData(data);
}

/**
 * Splits serialized data into values that remain below storage.sync's
 * per-item quota, including escaped JSON string characters.
 *
 * @param {string} serialized
 * @returns {string[]}
 */
function splitForSync(serialized) {
  if (!serialized) return [''];

  const encoder = new TextEncoder();
  const chunks = [];
  let start = 0;

  while (start < serialized.length) {
    let low = start + 1;
    let high = serialized.length;
    let best = start;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = serialized.slice(start, middle);
      const bytes = encoder.encode(JSON.stringify(candidate)).length;

      if (bytes <= SYNC_ITEM_SAFE_BYTES) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    if (best === start) {
      throw new Error('A synchronized storage chunk could not be created.');
    }

    chunks.push(serialized.slice(start, best));
    start = best;
  }

  return chunks;
}

/**
 * Estimates how Chrome accounts for sync storage usage.
 *
 * @param {Object<string, *>} items
 * @returns {number}
 */
function getStorageBytes(items) {
  const encoder = new TextEncoder();

  return Object.entries(items).reduce((total, [key, value]) => (
    total + encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length
  ), 0);
}

/**
 * Reads raw local data. A null result means that the extension has not
 * persisted application data on this device yet.
 *
 * @returns {Promise<Partial<PersistedData>|null>}
 */
async function readLocalData() {
  const result = await callStorage(
    chrome.storage.local,
    'get',
    ['schemaVersion', 'bookmarks', 'folders', 'settings']
  );

  if (
    result.schemaVersion === undefined &&
    result.bookmarks === undefined &&
    result.folders === undefined &&
    result.settings === undefined
  ) {
    return null;
  }

  return {
    schemaVersion: result.schemaVersion,
    bookmarks: result.bookmarks,
    folders: result.folders,
    settings: result.settings
  };
}

/**
 * Reads the chunked sync payload. It also accepts the original direct-key
 * shape, making the migration tolerant of early development builds.
 *
 * @returns {Promise<Partial<PersistedData>|null>}
 */
async function readSyncData() {
  const header = await callStorage(
    chrome.storage.sync,
    'get',
    [SYNC_META_KEY, 'schemaVersion', 'bookmarks', 'folders', 'settings']
  );

  const meta = header[SYNC_META_KEY];

  if (!meta) {
    if (
      header.schemaVersion === undefined &&
      header.bookmarks === undefined &&
      header.folders === undefined &&
      header.settings === undefined
    ) {
      return null;
    }

    return {
      schemaVersion: header.schemaVersion,
      bookmarks: header.bookmarks,
      folders: header.folders,
      settings: header.settings
    };
  }

  if (
    meta.version !== SYNC_FORMAT_VERSION ||
    !Number.isInteger(meta.chunkCount) ||
    meta.chunkCount < 1
  ) {
    throw new Error('The synchronized SpaceTab data has an unsupported format.');
  }

  const keys = Array.from(
    { length: meta.chunkCount },
    (_, index) => `${SYNC_CHUNK_PREFIX}${index}`
  );
  const values = await callStorage(chrome.storage.sync, 'get', keys);
  const serialized = keys.map(key => values[key]).join('');

  if (keys.some(key => typeof values[key] !== 'string')) {
    throw new Error('The synchronized SpaceTab data is incomplete.');
  }

  try {
    return JSON.parse(serialized);
  } catch (error) {
    throw new Error('The synchronized SpaceTab data is invalid.', { cause: error });
  }
}

/**
 * Writes the simple local representation used by existing installations.
 *
 * @param {PersistedData} data
 * @returns {Promise<void>}
 */
async function writeLocalData(data) {
  await callStorage(chrome.storage.local, 'set', normalizePersistedData(data));
}

/**
 * Writes application data to storage.sync using quota-safe chunks.
 *
 * @param {PersistedData} data
 * @returns {Promise<void>}
 */
async function writeSyncData(data) {
  const normalized = normalizePersistedData(data);
  const chunks = splitForSync(JSON.stringify(normalized));
  const previous = await callStorage(
    chrome.storage.sync,
    'get',
    [SYNC_META_KEY, 'schemaVersion', 'bookmarks', 'folders', 'settings']
  );
  const previousChunkCount = previous[SYNC_META_KEY]?.chunkCount ?? 0;

  const items = Object.fromEntries(
    chunks.map((chunk, index) => [`${SYNC_CHUNK_PREFIX}${index}`, chunk])
  );

  items[SYNC_META_KEY] = {
    version: SYNC_FORMAT_VERSION,
    chunkCount: chunks.length,
    updatedAt: Date.now()
  };

  const quotaBytes = chrome.storage.sync.QUOTA_BYTES ?? 102400;
  if (getStorageBytes(items) > quotaBytes) {
    const error = new Error('SpaceTab data exceeds the synchronized storage quota.');
    error.code = 'SYNC_QUOTA_EXCEEDED';
    throw error;
  }

  await callStorage(chrome.storage.sync, 'set', items);

  const staleKeys = previousChunkCount > chunks.length
    ? Array.from(
      { length: previousChunkCount - chunks.length },
      (_, index) => `${SYNC_CHUNK_PREFIX}${chunks.length + index}`
    )
    : [];

  const legacyKeys = ['schemaVersion', 'bookmarks', 'folders', 'settings'].filter(
    key => previous[key] !== undefined
  );
  const keysToRemove = [...staleKeys, ...legacyKeys];

  if (keysToRemove.length) {
    await callStorage(chrome.storage.sync, 'remove', keysToRemove);
  }
}

/**
 * Reads raw application data from a selected storage area.
 *
 * @param {'local'|'sync'} mode
 * @returns {Promise<Partial<PersistedData>|null>}
 */
function readData(mode) {
  return mode === STORAGE_MODES.SYNC ? readSyncData() : readLocalData();
}

/**
 * Writes application data to a selected storage area.
 *
 * @param {'local'|'sync'} mode
 * @param {PersistedData} data
 * @returns {Promise<void>}
 */
function writeData(mode, data) {
  return mode === STORAGE_MODES.SYNC
    ? writeSyncData(data)
    : writeLocalData(data);
}

/**
 * Initializes the per-device storage preference.
 *
 * @returns {Promise<'local'|'sync'>}
 */
async function initialize() {
  if (initialized) return activeMode;

  const result = await callStorage(chrome.storage.local, 'get', STORAGE_MODE_KEY);
  activeMode = result[STORAGE_MODE_KEY] === STORAGE_MODES.SYNC
    ? STORAGE_MODES.SYNC
    : STORAGE_MODES.LOCAL;
  initialized = true;

  return activeMode;
}

/**
 * Promise-based storage facade with per-device Local/Sync selection.
 */
export const storage = {
  initialize,

  /** @returns {'local'|'sync'} */
  getMode() {
    return activeMode;
  },

  /**
   * Retrieves persisted data from the active area.
   *
   * @param {keyof PersistedData | (keyof PersistedData)[] | null} keys
   * @returns {Promise<PersistedData | Partial<PersistedData>>}
   */
  async get(keys) {
    await initialize();
    const data = normalizePersistedData(await readData(activeMode));

    if (keys === null) return data;

    const requestedKeys = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(requestedKeys.map(key => [key, data[key]]));
  },

  /**
   * Persists bookmarks and/or settings in the active area.
   *
   * @param {Partial<PersistedData>} data
   * @returns {Promise<void>}
   */
  async set(data) {
    await initialize();

    const isComplete = data.bookmarks !== undefined
      && data.folders !== undefined
      && data.settings !== undefined;
    const nextData = isComplete
      ? normalizePersistedData(data)
      : normalizePersistedData({
          ...(await readData(activeMode) ?? {}),
          ...data
        });

    await writeData(activeMode, nextData);
  },

  /**
   * Removes persisted keys from the active area.
   *
   * @param {keyof PersistedData | (keyof PersistedData)[]} keys
   * @returns {Promise<void>}
   */
  async remove(keys) {
    await initialize();
    const requestedKeys = Array.isArray(keys) ? keys : [keys];
    const current = await readData(activeMode) ?? {};

    for (const key of requestedKeys) delete current[key];
    await writeData(activeMode, normalizePersistedData(current));
  },

  /**
   * Changes the per-device storage mode.
   *
   * Local -> Sync uses existing cloud data when present; otherwise it uploads
   * the current device data. Sync -> Local keeps a local copy of current data.
   * Remote sync data is never deleted when disabling synchronization.
   *
   * @param {'local'|'sync'} mode
   * @param {PersistedData} currentData
   * @returns {Promise<{data: PersistedData, source: 'unchanged'|'existing'|'migrated'}>}
   */
  async changeMode(mode, currentData) {
    await initialize();

    if (!Object.values(STORAGE_MODES).includes(mode)) {
      throw new TypeError(`Unsupported storage mode: ${mode}`);
    }

    if (mode === activeMode) {
      return {
        data: normalizePersistedData(currentData),
        source: 'unchanged'
      };
    }

    let nextData = normalizePersistedData(currentData);
    let source = 'migrated';

    if (mode === STORAGE_MODES.SYNC) {
      const existingSyncData = await readSyncData();

      if (existingSyncData) {
        nextData = normalizePersistedData(existingSyncData);
        source = 'existing';
      } else {
        await writeSyncData(nextData);
      }
    } else {
      await writeLocalData(nextData);
    }

    await callStorage(chrome.storage.local, 'set', {
      [STORAGE_MODE_KEY]: mode
    });
    activeMode = mode;

    return { data: nextData, source };
  },

  /**
   * Subscribes to persisted-data changes in the currently active area.
   *
   * @param {() => void} listener
   * @returns {() => void}
   */
  subscribe(listener) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }
};

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === STORAGE_MODES.LOCAL && changes[STORAGE_MODE_KEY]) {
    activeMode = changes[STORAGE_MODE_KEY].newValue === STORAGE_MODES.SYNC
      ? STORAGE_MODES.SYNC
      : STORAGE_MODES.LOCAL;

    for (const listener of changeListeners) listener();
    return;
  }

  if (areaName !== activeMode) return;

  const changedKeys = Object.keys(changes);
  const isApplicationChange = activeMode === STORAGE_MODES.LOCAL
    ? changedKeys.some(key => (
        key === 'schemaVersion' || key === 'bookmarks' || key === 'settings'
        || key === 'folders'
      ))
    : changedKeys.some(key => (
        key === SYNC_META_KEY ||
        key === 'schemaVersion' ||
        key === 'bookmarks' ||
        key === 'folders' ||
        key === 'settings' ||
        key.startsWith(SYNC_CHUNK_PREFIX)
      ));

  if (!isApplicationChange) return;
  for (const listener of changeListeners) listener();
});
