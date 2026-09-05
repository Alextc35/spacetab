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

Schema 9 adds folder appearance controls: `outerBackgroundColor` is a nullable
hex color, where null retains the automatic tile gradient. `showFolder`,
`showPreviews`, `showName` and `showCount` default to true so existing folders
keep their appearance. `normalizeFolderStyle()` disables previews whenever
the folder graphic is hidden, including when importing or restoring data.

`src/js/core/bookmark.js`, `src/js/core/bookmarkFolders.js` and
`src/js/core/bookmarkGroups.js` implement application commands. Batch operations
make one store transition, so undo treats them as a single user action.

`src/js/core/bookmarkDragModes.js` owns the persisted drag-mode contract and
normalizes missing or unknown values to None. `src/js/core/browserCapabilities.js`
keeps browser detection out of Settings and only enables synchronized storage
for tested, branded Google Chrome environments.

`src/js/core/store.js` owns live state, the persistence queue and grid-content
undo/redo history. A history snapshot contains bookmarks and folders together.
Synchronization settings are deliberately excluded from undo, preventing a
shortcut from changing where data is stored.

## Folder invariants

Folders are independent entities in `data.folders`. They have an id, name,
workspace, timestamps and a resizable `gx`, `gy`, `w`, `h` grid rectangle. New
folders start at `1 × 1`. Bookmark membership is represented by nullable
`bookmark.folderId`.

The schema and commands enforce these rules:

* A folder and its bookmarks always belong to the same workspace.
* Folders cannot contain other folders.
* A contained bookmark does not reserve grid space.
* A top-level folder reserves its complete `w × h` rectangle.
* New folder membership is capped at 18 bookmarks in a fixed 3-row ×
  6-column grid. Legacy overflow remains accessible in scrollable extra rows.
* Contained bookmarks occupy one local cell while preserving their main-grid
  `w × h` size for a later removal.
* Moving onto an occupied local cell swaps both bookmark positions atomically.
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

Create mode opens as a compact name-and-URL form. Its advanced-options control
animates the same panel to full size, preserving the draft while exposing the
appearance tabs and live preview. Edit and preset modes always open expanded.

Settings opens the same panel in `preset` mode to configure the default bookmark
appearance. The settings tab owns only the button and draft preset; it does not
embed a second editor implementation.

## Grid interaction

`src/js/ui/bookmark/dragResize.js` is the shared pointer controller for bookmark
and folder cards. It owns drag gesture thresholds, folder drop targeting,
eight-direction resize handles, previews and atomic commits through
`updateGridItemsByIds()`. Resize geometry lives in the pure
`resizeGeometry.js` module. An invalid gesture restores the original rectangle,
not the last valid intermediate preview.

`src/js/ui/bookmark/smartDragLayout.js` is a pure layout planner. Persisted state
remains the baseline while pointer previews are reversible:

* `none` rejects occupied pointer targets.
* `relocate` maps blockers into the vacated area or nearest free rectangle.
* `cascade` shifts a chain toward the gap and is exposed as experimental.

Bookmarks are the movable set during a bookmark drag, so a folder is never
displaced and remains available as a drop target. A folder drag includes every
top-level grid item in its movable set, allowing folders to participate in the
same planner without a separate drag implementation. Folder size is always
included in collision checks.

Selection lives in `selection.js` and is intentionally transient. A short
primary click toggles a bookmark, while a held primary click becomes a drag.
Middle click delegates to the same editor entry point as the direct pencil and
prevents the bookmark link from opening a tab.

`gridKeyboardNavigation.js` owns explicit top-level grid focus. `Tab` enters
or leaves the mode, and arrows select the nearest visible bookmark or folder in
the requested direction. Outside edit mode, `Enter` opens the focused item. In
edit mode, `Enter` opens its editor when there is no selection or when the
focused bookmark is the sole selected item; `S` toggles only bookmark selection
and gives folders a transient unavailable-state signal. The active item is
transient UI state rendered as a
keyboard-focus affordance.

`keyboardMovement.js` remains responsible for moving one visible, top-level
selected bookmark in edit mode when keyboard grid navigation is not active.
None mode scans to the next free rectangle; the smart modes exchange bookmarks
one keypress at a time and skip fixed folder rectangles. The resulting bookmark
and displacement updates use one state transition and therefore one undo entry.

## Persistence

Local mode uses `chrome.storage.local`. Sync mode serializes the complete
versioned payload and divides it into quota-safe `chrome.storage.sync` chunks.
The local storage-mode choice remains device-specific.

`browserCapabilities.js` currently permits Sync only in Google Chrome. Brave
and unverified Chromium browsers stay in Local mode because exposing
`chrome.storage.sync` does not guarantee that their profile service propagates
SpaceTab data. The storage facade exposes quota usage for both areas through
`getBytesInUse`, with a byte estimate fallback for compatible implementations.
Settings displays used/total/available capacity for the currently selected mode,
persistence status and synchronized update metadata. Confirmed deletion removes
only SpaceTab's synchronized keys; if Sync is active, it preserves the working
data in Local first.

Future sync schemas and transport formats are treated as a recoverable
compatibility state rather than a fatal hydration error. The storage facade
records a device-local compatibility marker, selects compatible Local data and
never writes to the newer remote payload. Settings reads that marker to disable
Sync and explain the required update. The marker expires automatically when the
installed schema/format catches up, and explicit remote-data deletion also
clears it.

Complete backups use the `spacetab-backup` format; bookmark-only files use
`spacetab-bookmarks`. Both versioned formats preserve folders and membership.
Legacy raw bookmark arrays remain importable without folders.

## UI coordination

Modal controllers translate user actions into core commands. The modal manager
owns stacking, focus trapping, background isolation and focus restoration.

The renderer displays top-level bookmarks and folders in the active workspace.
`src/js/ui/folder/renderer.js` owns the folder card and previews, while
`src/js/ui/modals/folderModal.js` reuses the production bookmark renderer in a
compact 3 × 6 workspace. The modal starts in a link-only view with no action or
drag listeners. Its local edit mode, toggled by the header control or `Space`,
re-renders controls and enables a pointer controller that previews empty-cell
moves and occupied-cell displacement through the same
`calculateSmartDragLayout()` modes as the main grid. Preview positions are
rendered as smooth transforms from each item's persisted cell; on release the
transform remains visible until
`updateFolderBookmarkPositions()` atomically commits that exact layout, avoiding
a source/destination flash. `src/js/core/folderGrid.js` owns the pure local
layout contract and normalizes legacy or colliding positions deterministically.
Main-grid bookmark drag logic detects folder hit targets and delegates
membership changes to the core.

Search indexes all workspaces and contained bookmarks, showing folder context
when present. Selection is pruned when bookmarks disappear and is cleared when
edit mode closes.

`src/js/ui/workspaceToolbar.js` owns cyclic workspace navigation. `Alt/Option`
with the up or down arrow resolves the adjacent workspace through the core,
animates the current grid out and the next grid in, and skips the transition
when the operating system requests reduced motion. Shortcuts are ignored while
typing or while a modal is open.

## Verification

The project has four complementary checks:

1. ESLint for static mistakes and undefined/unused symbols.
2. Node tests for domain, schemas, storage and history.
3. Vitest/jsdom for editor and modal lifecycles.
4. Playwright journeys plus an optional unpacked-extension smoke test.
