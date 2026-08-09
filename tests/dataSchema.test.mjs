import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBackupEnvelope,
  migratePersistedData,
  parseBackupPayload
} from '../js/core/dataSchema.js';
import { DATA_SCHEMA_VERSION, DEFAULT_SETTINGS } from '../js/core/defaults.js';

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
  assert.deepEqual(Object.keys(migrated.settings.theme), Object.keys(DEFAULT_SETTINGS.theme));
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

test('rejects data written by a future schema', () => {
  assert.throws(
    () => migratePersistedData({ schemaVersion: DATA_SCHEMA_VERSION + 1 }),
    error => error.code === 'UNSUPPORTED_DATA_VERSION'
  );
});
