import '../types/types.js';
import {
  DATA_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_STATE
} from './defaults.js';
import {
  normalizeBookmark,
  normalizeBookmarkPreset
} from './bookmarkModel.js';

/**
 * Upgrades and normalizes application data from every supported SpaceTab
 * version. This is the only entry point for data crossing a persistence or
 * import boundary.
 *
 * @param {Partial<PersistedData>|null|undefined} input
 * @param {Object} [options]
 * @param {boolean} [options.useDefaultsWhenEmpty=true]
 * @returns {PersistedData}
 */
export function migratePersistedData(input, { useDefaultsWhenEmpty = true } = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const sourceVersion = Number.isInteger(source.schemaVersion)
    ? source.schemaVersion
    : 0;

  if (sourceVersion > DATA_SCHEMA_VERSION) {
    const error = new Error('This SpaceTab data was created by a newer version.');
    error.code = 'UNSUPPORTED_DATA_VERSION';
    throw error;
  }

  const rawBookmarks = Array.isArray(source.bookmarks)
    ? source.bookmarks
    : (useDefaultsWhenEmpty ? DEFAULT_STATE.data.bookmarks : []);
  const rawSettings = source.settings && typeof source.settings === 'object'
    ? source.settings
    : {};
  const now = Date.now();

  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    bookmarks: rawBookmarks
      .filter(bookmark => bookmark && typeof bookmark === 'object')
      .map((bookmark, index) => normalizeBookmark(bookmark, {
        now,
        touchUpdatedAt: false,
        idFactory: () => `migrated-${now}-${index}`
      })),
    settings: {
      ...structuredClone(DEFAULT_SETTINGS),
      ...rawSettings,
      theme: {
        ...structuredClone(DEFAULT_SETTINGS.theme),
        ...(rawSettings.theme && typeof rawSettings.theme === 'object'
          ? rawSettings.theme
          : {})
      },
      bookmarkDefault: normalizeBookmarkPreset(rawSettings.bookmarkDefault)
    }
  };
}

/**
 * Creates the versioned envelope used for complete backups.
 *
 * @param {PersistedData} data
 * @returns {{format: string, schemaVersion: number, exportedAt: string, data: PersistedData}}
 */
export function createBackupEnvelope(data) {
  return {
    format: 'spacetab-backup',
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: migratePersistedData(data)
  };
}

/**
 * Creates a portable, versioned bookmarks-only document.
 *
 * @param {Bookmark[]} bookmarks
 * @returns {{format: string, schemaVersion: number, exportedAt: string, bookmarks: Bookmark[]}}
 */
export function createBookmarksEnvelope(bookmarks) {
  const normalized = migratePersistedData({
    bookmarks,
    settings: DEFAULT_SETTINGS
  }, { useDefaultsWhenEmpty: false });

  return {
    format: 'spacetab-bookmarks',
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    bookmarks: normalized.bookmarks
  };
}

/**
 * Accepts current backups and the legacy bookmarks-only array.
 *
 * @param {*} payload
 * @param {PersistedData} [currentData]
 * @returns {PersistedData}
 */
export function parseBackupPayload(payload, currentData = DEFAULT_STATE.data) {
  if (Array.isArray(payload)) {
    return migratePersistedData({
      ...currentData,
      bookmarks: payload
    });
  }

  if (payload?.format === 'spacetab-backup' && payload.data) {
    return migratePersistedData(payload.data);
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.bookmarks)) {
    return migratePersistedData(payload);
  }

  const error = new Error('Invalid SpaceTab backup.');
  error.code = 'INVALID_BACKUP';
  throw error;
}

/**
 * Reads bookmark-only exports, legacy arrays and complete backups while keeping
 * the current settings untouched.
 *
 * @param {*} payload
 * @param {PersistedData} currentData
 * @returns {Bookmark[]}
 */
export function parseBookmarksPayload(payload, currentData = DEFAULT_STATE.data) {
  if (payload?.format === 'spacetab-bookmarks' && Array.isArray(payload.bookmarks)) {
    return migratePersistedData({
      ...currentData,
      bookmarks: payload.bookmarks
    }, { useDefaultsWhenEmpty: false }).bookmarks;
  }

  return parseBackupPayload(payload, currentData).bookmarks;
}
