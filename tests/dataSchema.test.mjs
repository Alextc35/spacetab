import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBackupEnvelope,
  createBookmarksEnvelope,
  migratePersistedData,
  parseBackupPayload,
  parseBookmarksPayload
} from '../src/js/core/dataSchema.js';
import { DATA_SCHEMA_VERSION, DEFAULT_SETTINGS } from '../src/js/core/defaults.js';
import { BOOKMARK_DRAG_MODES } from '../src/js/core/bookmarkDragModes.js';

test('separates legacy local images from URLs across themes, bookmarks, folders and presets', () => {
  const reference = 'spacetab-local-image:4c5b9a2e-3f0e-4c7e-889c-72117afc09e9';
  const legacyStyle = { backgroundImageUrl: reference, backgroundImageUrlLocked: true };
  const migrated = migratePersistedData({
    schemaVersion: 4,
    bookmarks: [{ id: 'one', name: 'One', ...legacyStyle }],
    folders: [{ id: 'folder', name: 'Folder', ...legacyStyle }],
    settings: {
      theme: legacyStyle,
      bookmarkDefault: legacyStyle,
      bookmarkPresets: [{ id: 'preset', name: 'Preset', style: legacyStyle }]
    }
  });

  for (const style of [
    migrated.bookmarks[0], migrated.folders[0], migrated.settings.theme,
    migrated.settings.bookmarkDefault, migrated.settings.bookmarkPresets[0].style
  ]) {
    assert.equal(style.backgroundImageLocal, reference);
    assert.equal(style.backgroundImageUrl, null);
    assert.equal(style.backgroundImageUrlLocked, false);
    style.backgroundImageUrl = 'https://images.test/fallback.gif';
    style.backgroundImageUrlLocked = true;
  }

  assert.deepEqual(migratePersistedData(migrated), migrated);
  assert.deepEqual(parseBackupPayload(createBackupEnvelope(migrated)), migrated);
});

test('migrates legacy data and removes identity from the default preset', () => {
  const migrated = migratePersistedData({
    bookmarks: [{ id: 'one', name: 'One', url: 'one.test' }],
    settings: {
      language: 'es',
      bookmarkDefault: {
        name: 'Legacy name',
        url: 'https://legacy.test',
        backgroundColor: '#123456'
      }
    }
  });

  assert.equal(migrated.schemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(migrated.bookmarks[0].url, 'https://one.test');
  assert.equal(migrated.settings.language, 'es');
  assert.equal(migrated.settings.bookmarkDefault.name, undefined);
  assert.equal(migrated.settings.bookmarkDefault.url, undefined);
  assert.equal(migrated.settings.bookmarkDefault.backgroundColor, '#123456');
  assert.equal(migrated.settings.bookmarkDragMode, BOOKMARK_DRAG_MODES.NONE);
  assert.deepEqual(Object.keys(migrated.settings.theme), Object.keys(DEFAULT_SETTINGS.theme));
});

test('normalizes unsupported bookmark drag modes to none', () => {
  const migrated = migratePersistedData({
    bookmarks: [],
    settings: { ...DEFAULT_SETTINGS, bookmarkDragMode: 'unknown' }
  });

  assert.equal(migrated.settings.bookmarkDragMode, BOOKMARK_DRAG_MODES.NONE);
});

test('preserves the none bookmark drag mode', () => {
  const migrated = migratePersistedData({
    bookmarks: [],
    settings: { ...DEFAULT_SETTINGS, bookmarkDragMode: BOOKMARK_DRAG_MODES.NONE }
  });

  assert.equal(migrated.settings.bookmarkDragMode, BOOKMARK_DRAG_MODES.NONE);
});

test('creates and parses a versioned complete backup', () => {
  const data = migratePersistedData({ bookmarks: [], settings: DEFAULT_SETTINGS });
  const envelope = createBackupEnvelope(data);
  const restored = parseBackupPayload(envelope);

  assert.equal(envelope.format, 'spacetab-backup');
  assert.equal(envelope.schemaVersion, DATA_SCHEMA_VERSION);
  assert.deepEqual(restored, data);
});

test('keeps compatibility with the old bookmarks-only export', () => {
  const current = migratePersistedData({ bookmarks: [], settings: DEFAULT_SETTINGS });
  const restored = parseBackupPayload([
    { id: 'legacy', name: 'Legacy', url: 'legacy.test' }
  ], current);

  assert.equal(restored.bookmarks[0].id, 'legacy');
  assert.equal(restored.bookmarks[0].url, 'https://legacy.test');
  assert.deepEqual(restored.settings, current.settings);
});

test('round-trips a versioned bookmarks-only export without replacing settings', () => {
  const current = migratePersistedData({ bookmarks: [], settings: DEFAULT_SETTINGS });
  const envelope = createBookmarksEnvelope([
    {
      id: 'portable',
      name: 'Portable',
      url: 'portable.test',
      folderId: 'reading'
    }
  ], [{ id: 'reading', name: 'Reading', gx: 0, gy: 0 }]);
  const { bookmarks, folders } = parseBookmarksPayload(envelope, current);

  assert.equal(envelope.format, 'spacetab-bookmarks');
  assert.equal(bookmarks[0].id, 'portable');
  assert.equal(bookmarks[0].url, 'https://portable.test');
  assert.equal(bookmarks[0].folderId, 'reading');
  assert.equal(folders[0].name, 'Reading');
});

test('rejects data written by a future schema', () => {
  assert.throws(
    () => migratePersistedData({ schemaVersion: DATA_SCHEMA_VERSION + 1 }),
    error => (
      error.code === 'UNSUPPORTED_DATA_VERSION'
      && error.requiredSchemaVersion === DATA_SCHEMA_VERSION + 1
      && error.supportedSchemaVersion === DATA_SCHEMA_VERSION
    )
  );
});

test('normalizes named presets and workspace references', () => {
  const migrated = migratePersistedData({
    bookmarks: [{ id: 'grouped', name: 'Grouped', groupId: 'work' }],
    settings: {
      ...DEFAULT_SETTINGS,
      bookmarkPresets: [{
        id: 'dark',
        name: '  Dark  ',
        style: { backgroundColor: '#111111', name: 'ignored' }
      }],
      bookmarkGroups: [{ id: 'work', name: ' Work ' }],
      activeBookmarkGroupId: 'work'
    }
  });

  assert.equal(migrated.bookmarks[0].groupId, 'work');
  assert.deepEqual(migrated.settings.bookmarkGroups, [{ id: 'work', name: 'Work' }]);
  assert.equal(migrated.settings.activeBookmarkGroupId, 'work');
  assert.equal(migrated.settings.bookmarkPresets[0].name, 'Dark');
  assert.equal(migrated.settings.bookmarkPresets[0].style.name, undefined);
});

test('falls back to the main workspace when the active group is missing', () => {
  const migrated = migratePersistedData({
    bookmarks: [],
    settings: {
      ...DEFAULT_SETTINGS,
      bookmarkGroups: [],
      activeBookmarkGroupId: 'missing'
    }
  });

  assert.equal(migrated.settings.activeBookmarkGroupId, null);
});

test('normalizes folder references and rejects cross-workspace membership', () => {
  const migrated = migratePersistedData({
    bookmarks: [
      { id: 'inside', name: 'Inside', groupId: 'work', folderId: 'work-folder' },
      { id: 'wrong', name: 'Wrong', groupId: null, folderId: 'work-folder' },
      { id: 'missing', name: 'Missing', folderId: 'missing-folder' }
    ],
    folders: [{ id: 'work-folder', name: 'Work', groupId: 'work', w: 5, h: 4 }],
    settings: {
      ...DEFAULT_SETTINGS,
      bookmarkGroups: [{ id: 'work', name: 'Work' }]
    }
  });

  assert.equal(migrated.folders[0].w, 5);
  assert.equal(migrated.folders[0].h, 4);
  assert.equal(migrated.folders[0].noBackground, false);
  assert.equal(migrated.folders[0].backgroundColor, '#38bdf8');
  assert.equal(migrated.folders[0].backgroundImageUrl, null);
  assert.equal(migrated.folders[0].backgroundImageUrlLocked, false);
  assert.equal(migrated.folders[0].textColor, '#f8fafc');
  assert.equal(migrated.bookmarks[0].folderId, 'work-folder');
  assert.equal(migrated.bookmarks[1].folderId, null);
  assert.equal(migrated.bookmarks[2].folderId, null);
});
