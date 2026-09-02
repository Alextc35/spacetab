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
import { normalizeBookmarkDragMode } from './bookmarkDragModes.js';
import { normalizeBookmarkResizeMode } from './bookmarkResizeModes.js';
import { normalizeFolderStyle } from './folderModel.js';
import { normalizeBackgroundImage } from './localImages.js';

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
    error.requiredSchemaVersion = sourceVersion;
    error.supportedSchemaVersion = DATA_SCHEMA_VERSION;
    throw error;
  }

  const rawBookmarks = Array.isArray(source.bookmarks)
    ? source.bookmarks
    : (useDefaultsWhenEmpty ? DEFAULT_STATE.data.bookmarks : []);
  const rawFolders = Array.isArray(source.folders) ? source.folders : [];
  const rawSettings = source.settings && typeof source.settings === 'object'
    ? source.settings
    : {};
  const now = Date.now();

  const bookmarkGroups = normalizeBookmarkGroups(rawSettings.bookmarkGroups);
  const bookmarkGroupIds = new Set(bookmarkGroups.map(group => group.id));
  const activeBookmarkGroupId = bookmarkGroups.some(
    group => group.id === rawSettings.activeBookmarkGroupId
  ) ? rawSettings.activeBookmarkGroupId : null;

  const folders = rawFolders
    .filter(folder => folder && typeof folder === 'object')
    .map((folder, index) => normalizeBookmarkFolder(folder, {
      index,
      now,
      bookmarkGroupIds
    }));
  const folderById = new Map(folders.map(folder => [folder.id, folder]));

  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    bookmarks: rawBookmarks
      .filter(bookmark => bookmark && typeof bookmark === 'object')
      .map((bookmark, index) => {
        const normalized = normalizeBookmark(bookmark, {
          now,
          touchUpdatedAt: false,
          idFactory: () => `migrated-${now}-${index}`
        });
        normalized.groupId = bookmarkGroupIds.has(normalized.groupId)
          ? normalized.groupId
          : null;
        const folder = folderById.get(normalized.folderId);
        normalized.folderId = folder
          && (folder.groupId ?? null) === (normalized.groupId ?? null)
          ? folder.id
          : null;
        return normalized;
      }),
    folders,
    settings: {
      ...structuredClone(DEFAULT_SETTINGS),
      ...rawSettings,
      theme: normalizeTheme(rawSettings.theme),
      bookmarkDefault: normalizeBookmarkPreset(rawSettings.bookmarkDefault),
      bookmarkDragMode: normalizeBookmarkDragMode(rawSettings.bookmarkDragMode),
      bookmarkResizeMode: normalizeBookmarkResizeMode(rawSettings.bookmarkResizeMode),
      bookmarkPresets: normalizeNamedPresets(rawSettings.bookmarkPresets),
      bookmarkGroups,
      activeBookmarkGroupId
    }
  };
}

function normalizeTheme(value) {
  const source = value && typeof value === 'object' ? value : {};
  const theme = {
    ...structuredClone(DEFAULT_SETTINGS.theme),
    ...source,
    ...normalizeBackgroundImage(source)
  };
  theme.backgroundDefault = theme.backgroundDefault === true;
  theme.backgroundSolid = !theme.backgroundDefault && theme.backgroundSolid === true;
  return theme;
}

function normalizeBookmarkFolder(folder, { index, now, bookmarkGroupIds }) {
  const groupId = bookmarkGroupIds.has(folder.groupId) ? folder.groupId : null;

  return {
    ...normalizeFolderStyle(folder),
    id: typeof folder.id === 'string' && folder.id.trim()
      ? folder.id
      : `folder-${now}-${index}`,
    name: typeof folder.name === 'string' && folder.name.trim()
      ? folder.name.trim()
      : `Folder ${index + 1}`,
    gx: normalizeGridValue(folder.gx),
    gy: normalizeGridValue(folder.gy),
    w: normalizeGridSize(folder.w),
    h: normalizeGridSize(folder.h),
    groupId,
    createdAt: normalizeTimestamp(folder.createdAt, now),
    updatedAt: normalizeTimestamp(folder.updatedAt, now)
  };
}

function normalizeGridValue(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizeGridSize(value) {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function normalizeTimestamp(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeNamedPresets(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(preset => preset && typeof preset === 'object')
    .map((preset, index) => ({
      id: typeof preset.id === 'string' && preset.id.trim()
        ? preset.id
        : `preset-${index + 1}`,
      name: typeof preset.name === 'string' && preset.name.trim()
        ? preset.name.trim()
        : `Preset ${index + 1}`,
      style: normalizeBookmarkPreset(preset.style ?? preset)
    }));
}

function normalizeBookmarkGroups(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(group => group && typeof group === 'object')
    .map((group, index) => ({
      id: typeof group.id === 'string' && group.id.trim()
        ? group.id
        : `workspace-${index + 1}`,
      name: typeof group.name === 'string' && group.name.trim()
        ? group.name.trim()
        : `Workspace ${index + 1}`
    }));
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
 * @param {BookmarkFolder[]} [folders=[]]
 * @returns {{format: string, schemaVersion: number, exportedAt: string, bookmarks: Bookmark[], folders: BookmarkFolder[]}}
 */
export function createBookmarksEnvelope(bookmarks, folders = []) {
  const normalized = migratePersistedData({
    bookmarks,
    folders,
    settings: DEFAULT_SETTINGS
  }, { useDefaultsWhenEmpty: false });

  return {
    format: 'spacetab-bookmarks',
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    bookmarks: normalized.bookmarks,
    folders: normalized.folders
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
      bookmarks: payload,
      folders: []
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
 * @returns {{bookmarks: Bookmark[], folders: BookmarkFolder[]}}
 */
export function parseBookmarksPayload(payload, currentData = DEFAULT_STATE.data) {
  if (payload?.format === 'spacetab-bookmarks' && Array.isArray(payload.bookmarks)) {
    const migrated = migratePersistedData({
      ...currentData,
      bookmarks: payload.bookmarks,
      folders: Array.isArray(payload.folders) ? payload.folders : []
    }, { useDefaultsWhenEmpty: false });
    return { bookmarks: migrated.bookmarks, folders: migrated.folders };
  }

  const restored = parseBackupPayload(payload, currentData);
  const migrated = migratePersistedData({
    ...currentData,
    bookmarks: restored.bookmarks,
    folders: restored.folders
  }, { useDefaultsWhenEmpty: false });
  return { bookmarks: migrated.bookmarks, folders: migrated.folders };
}
