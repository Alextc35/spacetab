# SpaceTab architecture

SpaceTab is a Manifest V3 new-tab extension written in vanilla JavaScript. Its
architecture stays small, but dependencies flow in one direction.

```text
Core domain and schema
        ↓
Store and browser persistence
        ↓
Use-case controllers
        ↓
Reusable UI components and renderers
```

## Core

`js/core/bookmarkModel.js` owns bookmark drafts, presets, normalization and
validation. Its functions do not read global state, making them deterministic.

`js/core/dataSchema.js` is the boundary for stored, synchronized and imported
data. `schemaVersion` changes only when a persisted shape changes. Old data is
migrated before entering the store.

`js/core/bookmark.js` and `js/core/bookmarkGroups.js` implement application
commands. Batch operations make one store transition, so undo treats them as a
single user action.

`js/core/store.js` owns live state, the persistence queue and bookmark-only
undo/redo history. Synchronization settings are deliberately excluded from
undo, preventing a shortcut from changing where data is stored.

## Bookmark editor

`createBookmarkEditorPanel()` supports three modes:

* `create`: blank identity combined with the current appearance preset.
* `edit`: an existing bookmark, including identity and appearance.
* `preset`: appearance sections only; identity and layout cannot leak out.

The panel manages fields, tabs, validation, dirty state, preview and lifecycle.
It does not know about modals, grid placement, persistence or the store.

## Persistence

Local mode uses `chrome.storage.local`. Sync mode serializes the complete
versioned payload and divides it into quota-safe `chrome.storage.sync` chunks.
The local storage-mode choice remains device-specific.

Complete backups use the `spacetab-backup` format; bookmark-only files use
`spacetab-bookmarks`. Legacy raw bookmark arrays remain importable.

## UI coordination

Modal controllers translate user actions into core commands. The modal manager
owns stacking, focus trapping, background isolation and focus restoration.

The renderer displays the active workspace. Search indexes all workspaces.
Selection is transient UI state and is pruned when bookmarks disappear.

## Verification

The project has four complementary checks:

1. ESLint for static mistakes and undefined/unused symbols.
2. Node tests for domain, schemas, storage and history.
3. Vitest/jsdom for editor and modal lifecycles.
4. Playwright journeys plus an optional unpacked-extension smoke test.
