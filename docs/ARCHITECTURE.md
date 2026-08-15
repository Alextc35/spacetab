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

`src/js/core/bookmarkModel.js` owns bookmark drafts, presets, normalization and
validation. Its functions do not read global state, making them deterministic.

`src/js/core/dataSchema.js` is the boundary for stored, synchronized and imported
data. `schemaVersion` changes only when a persisted shape changes. Old data is
migrated before entering the store. Schema 3 adds `folders` and the nullable
`bookmark.folderId` reference; schema 0–2 data migrates with an empty folder
collection.

`src/js/core/bookmark.js`, `src/js/core/bookmarkFolders.js` and
`src/js/core/bookmarkGroups.js` implement application commands. Batch operations
make one store transition, so undo treats them as a single user action.

`src/js/core/store.js` owns live state, the persistence queue and grid-content
undo/redo history. A history snapshot contains bookmarks and folders together.
Synchronization settings are deliberately excluded from undo, preventing a
shortcut from changing where data is stored.

## Folder invariants

Folders are independent entities in `data.folders`. They have an id, name,
workspace, timestamps and a fixed one-cell grid rectangle. Bookmark membership
is represented by nullable `bookmark.folderId`.

The schema and commands enforce these rules:

* A folder and its bookmarks always belong to the same workspace.
* Folders cannot contain other folders.
* A contained bookmark does not reserve grid space.
* Removing a bookmark requires a free area matching its saved `w × h` size.
* Deleting a folder deletes its contained bookmarks in the same state change.
* Deleting a workspace deletes its folders and all bookmarks in that workspace.

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
`spacetab-bookmarks`. Both versioned formats preserve folders and membership.
Legacy raw bookmark arrays remain importable without folders.

## UI coordination

Modal controllers translate user actions into core commands. The modal manager
owns stacking, focus trapping, background isolation and focus restoration.

The renderer displays top-level bookmarks and folders in the active workspace.
`src/js/ui/folder/renderer.js` owns the folder card and previews, while
`src/js/ui/modals/folderModal.js` owns its contents panel. Bookmark drag logic
detects folder hit targets and delegates membership changes to the core.

Search indexes all workspaces and contained bookmarks, showing folder context
when present. Selection is transient UI state and is pruned when bookmarks
disappear.

## Verification

The project has four complementary checks:

1. ESLint for static mistakes and undefined/unused symbols.
2. Node tests for domain, schemas, storage and history.
3. Vitest/jsdom for editor and modal lifecycles.
4. Playwright journeys plus an optional unpacked-extension smoke test.
