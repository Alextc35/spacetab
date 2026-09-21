# SpaceTab architecture

SpaceTab is a Manifest V3 new-tab extension written in vanilla JavaScript. Its
architecture is being migrated incrementally from technical folders
(`core/`, `ui/`) toward explicit application, domain, feature, platform and
shared boundaries. The legacy folders remain valid transition points: files
move only when a tested boundary exists for them.

## Direction and dependency rules

```text
newtab.html -> main.js -> app (composition)
                           |
                           v
                     features --------> domain
                        |                  |
                        v                  v
                      shared <--------- platform adapters
                        |
                        v
                 browser DOM / Chrome APIs
```

The intended responsibilities are:

- `app/`: bootstrap and dependency composition. It may register features but
  must not contain bookmark, folder, workspace or recycle-bin rules.
- `domain/`: deterministic entities, normalization, validation and rules. It
  must not access the DOM or Chrome APIs.
- `features/`: complete user-facing capabilities and their adapters. A feature
  may use domain and shared code and receive platform services through its
  application boundary.
- `platform/`: Chrome storage, synchronization, browser capabilities, local
  images and i18n loading. Domain code must not import it.
- `shared/`: proven cross-feature mechanisms. It must stay small; feature rules
  do not move here merely because several files call them.

During migration, `core/` contains a mixture of domain and platform code and
`ui/` contains shared UI plus feature UI. New dependencies should follow the
direction above. Existing files are moved only as part of a behavior-preserving
feature phase, not to make the tree look finished.

## Current migration status

Phases 1 through 4 establish the first domain and feature seams:

```text
src/js/
├── app/
│   └── registerGridItemTypes.js
├── domain/
│   ├── bookmarks/
│   │   ├── bookmarkDefaults.js
│   │   └── bookmarkModel.js
│   ├── folders/
│   │   ├── folderDefaults.js
│   │   ├── folderGrid.js
│   │   └── folderModel.js
│   ├── recycle-bin/
│   │   ├── recycleBinDefaults.js
│   │   ├── recycleBinEntries.js
│   │   └── recycleBinModel.js
│   └── workspaces/
│       └── workspaceModel.js
├── features/
│   ├── bookmarks/
│   │   ├── bookmarkActions.js
│   │   ├── bookmarkCard.js
│   │   └── bookmarkGridItem.js
│   ├── folders/
│   │   ├── folderActions.js
│   │   └── folderGridItem.js
│   ├── grid/
│   │   ├── gridItemActions.js
│   │   ├── gridRenderer.js
│   │   └── gridSelectors.js
│   ├── recycle-bin/
│   │   ├── recycleBinActions.js
│   │   ├── recycleBinAppearance.js
│   │   ├── recycleBinEditorModal.js
│   │   ├── recycleBinGridItem.js
│   │   └── recycleBinModal.js
│   └── workspaces/
│       ├── workspaceActions.js
│       └── workspaceSelectors.js
├── platform/
│   └── storage/
│       └── deviceTrashStorage.js
└── shared/
    ├── grid/
    │   ├── gridGeometry.js
    │   ├── gridItemRegistry.js
    │   └── gridPlacement.js
    └── images/
        └── backgroundImage.js
```

The recycle-bin slice now has an explicit split. Pure entry creation,
expiration, restoration and collision rules live in `domain/recycle-bin`.
Store-backed use cases live in `features/recycle-bin`, alongside the card and
modal UI. Device-only trash persistence lives under `platform/storage`.
Time and id generation remain in the feature action layer and are injected
into the pure domain operations, keeping their tests deterministic.

Bookmark, folder and recycle-bin defaults and normalization now live in
`domain/`. Their shared background-image value rules are separate from the
device image cache, Chrome Storage and Canvas processing that remain in the
legacy platform module. Store-backed bookmark, folder and mixed-grid commands
live in their feature slices. `core/defaults.js` temporarily composes and
re-exports domain defaults so schema and compatibility callers can migrate
without a persisted-data change. CSS remains under `css/features/` because its
loading lifecycle has not changed.

Workspace identity, naming, normalization and cyclic navigation now live in
`domain/workspaces`. Store-backed creation, activation, deletion and bookmark
movement live in `features/workspaces`; selectors adapt the legacy persisted
field names for UI and other feature consumers.

## GridItem and the item-type registry

`GridItem` is a structural contract: `id`, `gx`, `gy`, `w`, `h` and `groupId`.
Bookmarks, folders and the recycle bin already satisfy it. The type is supplied
by a feature adapter rather than persisted on every item, so this phase needs no
schema migration and old synchronized data remains compatible.

`shared/grid/gridItemRegistry.js` knows only the adapter protocol. A definition
provides:

- a stable `type`;
- `select(state)` to expose visible feature items;
- `render({ view, ... })` for grid and compact-list views;
- a DOM selector plus `getElementId()` for generic resize lookup;
- optional `enableEditing()` behavior;
- independent grid and list ordering.

`features/grid/gridRenderer.js` iterates registered definitions. It does not
branch on bookmark, folder, recycle-bin or future widget types. The application
composition root registers bundled definitions through
`app/registerGridItemTypes.js`. The registry is static local code and does not
load remote scripts, keeping it compatible with Manifest V3 CSP.

The registration seam also removed the two static ES-module cycles that used
to pass through `ui/bookmark/renderer.js`. Bookmark visuals now live in
`features/bookmarks/bookmarkCard.js`, so previews and folder contents reuse the
card without importing the grid orchestrator.

## Recycle-bin flow

```text
recycle-bin UI / grid adapter
             ↓
features/recycle-bin/recycleBinActions.js → core/store.js
             ↓
domain/recycle-bin/recycleBinEntries.js

core/store.js / core/storage.js
             ↓
platform/storage/deviceTrashStorage.js → chrome.storage.local
```

The domain module receives plain data and returns new data. It does not read
the store, DOM, clock, random ids or Chrome APIs. Feature actions decide when a
command happens, create ids and timestamps, and commit one store transition so
undo behavior remains unchanged. The platform adapter owns the device-local
record used to recover data that was permanently removed from the application.

## Workspace as a domain entity

Persisted workspaces remain represented by `settings.bookmarkGroups` and
`activeBookmarkGroupId` for backward compatibility. The explicit `Workspace`
entity owns identity, naming, normalization, active-workspace resolution and
navigation without knowing about the store or browser APIs. Feature selectors
are the adapter between those concepts and the legacy settings keys, so UI code
does not edit the persisted collections directly. This phase deliberately does
not change `schemaVersion` or synchronized data.

## Store, persistence and synchronization

The current boundary is functional but broad:

```text
UI / feature commands
        ↓
core/store.js (live state, subscriptions, history, persistence queue)
        ↓
core/storage.js (local/sync transport, chunking, compatibility)
        ↓
Chrome Storage + device-only image records

core/store.js / core/storage.js
        ↓
platform/storage/deviceTrashStorage.js
        ↓
Chrome local device-trash record
```

Future phases should extract a platform storage adapter and schema/migration
module while preserving the store API. `store.js` should retain live state,
subscriptions and history; transport mode, quota accounting and Chrome events
belong in `platform/storage` and `platform/sync`. Visual components must call
feature actions rather than the storage facade directly.

## Adding a bundled item or widget

A new bundled type should provide its model and one grid-item definition. For a
clock, the intended shape is:

```text
widgets/builtin/clock/
├── clockModel.js
├── clockGridItem.js
├── clockSettings.js
└── clock.css
```

Then the composition root registers `clockGridItem`. The generic grid renderer,
store, modal manager and HTML shell should not change. A widget that needs
persistence first requires a versioned schema addition and a feature action;
the registry itself is deliberately not a persistence or plugin-loading API.
Remote executable plugins are out of scope.

## Incremental roadmap

1. ✅ Establish the GridItem registry and feature-owned rendering.
2. ✅ Complete the recycle-bin slice: separate pure domain
   restoration/retention rules, feature actions and modal UI; move device
   trash to platform storage.
3. ✅ Move bookmark and folder models/actions behind feature boundaries while
   retaining the tested store commands.
4. ✅ Introduce the explicit workspace domain entity without changing persisted
   `bookmarkGroups` data in the same step.
5. Split store state/history from Chrome persistence, sync transport and schema
   migration.
6. Add a minimal bundled-widget API only when the first real widget supplies
   concrete requirements beyond the GridItem definition.

Each phase must finish with lint, unit and DOM tests, relevant E2E journeys and
the unpacked-extension smoke/package checks.

## Existing implementation details

The remaining sections describe the current behavior that every migration must
preserve.

```text
Reusable UI components and renderers
        ↓
Feature actions and selectors
        ↓
Domain models + core/store.js
        ↓
Browser persistence
```

## Domain and transitional core

`src/js/domain/bookmarks/bookmarkModel.js` owns bookmark drafts, presets,
normalization and validation. `src/js/domain/folders/folderModel.js` owns the
equivalent folder rules, including its name contract. Their functions do not
read global state, making them deterministic.

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

Schema 10 adds the four configurable keyboard shortcuts under
`settings.keyboardShortcuts`. Missing, invalid or conflicting legacy values
fall back to the safe default combinations.

`features/bookmarks/bookmarkActions.js`, `features/folders/folderActions.js`,
`features/grid/gridItemActions.js` and `features/workspaces/workspaceActions.js`
implement store-backed application commands. Batch operations make one store
transition, so undo treats them as a single user action. Workspace UI reads the
legacy persisted fields only through `workspaceSelectors.js`.

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
or leaves the mode, and arrows select the nearest visible bookmark, folder or
recycle bin in the requested direction while carrying the row or column used
to enter resized cards. Horizontal arrows choose the closest candidate using
that row as the cross-axis. A diagonal candidate is ignored across zero or one
empty cell, but can fill a route after two or more empty cells; vertical arrows
stay in the remembered column and are no-ops when the column is empty. Outside
edit mode, `Enter` opens the focused item. In
edit mode, `Enter` opens its editor when there is no selection or when the
focused bookmark is the sole selected item; `S` toggles only bookmark selection
and gives folders a transient unavailable-state signal. The active item is
transient UI state rendered as a keyboard-focus affordance. Reversing the last
arrow movement returns to its origin, preserving the route used to enter a
folder or bookmark. Opening an in-app folder, editor or recycle-bin modal keeps
that state and lets the modal manager restore focus to the same card on close;
bookmark URLs are the one exception because they navigate away from the page.

`keyboardMovement.js` remains responsible for moving one visible, top-level
selected bookmark in edit mode when keyboard grid navigation is not active.
None mode scans to the next free rectangle; the smart modes exchange bookmarks
one keypress at a time and skip fixed folder rectangles. The resulting bookmark
and displacement updates use one state transition and therefore one undo entry.

## Persistence

Local mode uses `chrome.storage.local`. Sync mode serializes the complete
versioned payload and divides it into quota-safe `chrome.storage.sync` chunks.
The local storage-mode choice remains device-specific.

Custom keyboard shortcuts live inside the versioned `settings` object. They
therefore use the same migration, backup and Sync paths as visual preferences;
only the persistence-mode choice remains device-specific.

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

Modal controllers translate user actions into feature or transitional core
commands. Recycle-bin modals now call their colocated feature actions. The
modal manager owns stacking, focus trapping, background isolation and focus
restoration.

The renderer displays top-level bookmarks and folders in the active workspace.
`src/js/ui/folder/renderer.js` owns the folder card and previews, while
`src/js/ui/modals/folderModal.js` reuses the production bookmark renderer in a
compact 3 × 6 workspace. The modal starts in a link-only view with no action or
drag listeners. Its local edit mode, toggled by the header control or the
configured edit shortcut (`Ctrl + E` by default),
re-renders controls and enables a pointer controller that previews empty-cell
moves and occupied-cell displacement through the same
`calculateSmartDragLayout()` modes as the main grid. Preview positions are
rendered as smooth transforms from each item's persisted cell; on release the
transform remains visible until
`updateFolderBookmarkPositions()` atomically commits that exact layout, avoiding
a source/destination flash. `src/js/domain/folders/folderGrid.js` owns the pure
local layout contract and normalizes legacy or colliding positions
deterministically. Main-grid bookmark drag logic detects folder hit targets and
delegates membership changes to the folder feature actions.

Search indexes all workspaces and contained bookmarks, showing folder context
when present. Selection is pruned when bookmarks disappear and is cleared when
edit mode closes.

`src/js/ui/workspaceToolbar.js` owns cyclic workspace navigation. `Alt/Option`
with the up or down arrow resolves the adjacent workspace through the workspace
domain and feature selectors,
animates the current grid out and the next grid in, and skips the transition
when the operating system requests reduced motion. Shortcuts are ignored while
typing or while a modal is open.

## Verification

The project has four complementary checks:

1. ESLint for static mistakes and undefined/unused symbols.
2. Node tests for domain, schemas, storage and history.
3. Vitest/jsdom for editor and modal lifecycles.
4. Playwright journeys plus an optional unpacked-extension smoke test.
