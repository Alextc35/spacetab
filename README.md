# SpaceTab

Minimalist Chrome/Brave new-tab extension for organizing bookmarks in a visual
grid workspace.

![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)
![version](https://img.shields.io/badge/version-0.9.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)

![demo](assets/gifs/demo.gif)

SpaceTab replaces the browser's default new tab with a private, customizable
visual bookmark workspace. Bookmarks can be placed, resized and styled like
items on a desktop without relying on a SpaceTab account or backend.

## Features

* Smooth eight-direction drag and resize on a collision-aware grid
* Configurable drag behavior: None (default), Relocation and experimental
  Sequence
* Direct bookmark editing plus short-click selection and a middle-click editor
* Keyboard grid navigation across bookmarks and folders with `Tab` and arrows
* Arrow-key movement for a single selected bookmark outside grid navigation
* Compact bookmark creation that expands into the shared full style editor
* Named appearance presets
* Independent bookmark workspaces with smooth `Alt/⌥ + ↑/↓` navigation
* Resizable folders with a clean link view and an editable 3 × 6 workspace
* Global search palette (`/`)
* Multi-select, bulk styling, moving, duplication and deletion
* Bookmark duplication plus atomic undo/redo for bookmark and folder changes
* Themes, favicon previews and English, Spanish and Brazilian Portuguese UI
* Versioned bookmark import/export and complete backups
* Optional Google Chrome profile synchronization with status and data
  management
* Accessible modal focus management and keyboard navigation

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Alextc35/spacetab.git
   ```

2. Open `chrome://extensions` or `brave://extensions`.
3. Enable **Developer Mode**.
4. Choose **Load unpacked** and select the `spacetab` folder.

## Bookmark and grid model

Each bookmark owns identity, grid layout and appearance:

```js
{
  id: "…",
  name: "GitHub",
  url: "https://github.com",
  gx: 0,
  gy: 0,
  w: 1,
  h: 1,
  groupId: null,
  folderId: null,
  backgroundColor: "#000000",
  backgroundImageUrl: null,
  showFavicon: true
}
```

An appearance preset never contains bookmark identity, timestamps, workspace or
grid coordinates. New bookmarks combine an empty identity with the active
preset and are placed in the first available cell of the current workspace.

Folders are first-class, resizable grid items. They start at `1 × 1`, then keep
their own position and dimensions just like bookmarks:

```js
{
  id: "…",
  name: "Reading",
  gx: 0,
  gy: 1,
  w: 1,
  h: 1,
  groupId: null
}
```

A bookmark inside a folder keeps its appearance and saved `w × h` size but no
longer reserves cells in the main workspace. Each folder exposes a compact
3-row × 6-column grid for up to 18 bookmarks. Internal cards always occupy one
compact cell. The configured None, Relocation or Sequence behavior also applies
inside the folder, with smooth reversible cell transitions. The local order
persists across reopens and reloads.

Dragging a top-level bookmark onto the folder assigns the first free local
cell. Taking it out places it in the first free main-grid area that fits its
saved dimensions. Deleting a folder asks for confirmation and deletes the
bookmarks it contains.

## Editing and grid behavior

Edit mode exposes a direct pencil button on each bookmark. A middle click opens
the same editor without opening the bookmark in a tab. A short primary click
toggles selection, while holding the primary button starts dragging instead.
Selected bookmarks can be styled, moved to another workspace, duplicated or
deleted from the bulk toolbar.

Bookmarks and folders have eight resize handles. Drag a handle for continuous
resizing, click it to grow one grid cell in that direction, or `Shift + click`
to shrink. Invalid resize attempts restore the complete rectangle that existed
before the gesture.

**Settings → Bookmarks → Drag behavior** controls occupied-cell handling:

* **None** (default) keeps other items still. It only accepts free cells;
  occupied targets return the dragged item to its source on release.
* **Relocation** moves blockers into the vacated area or nearest free
  space.
* **Sequence** shifts the bookmark chain toward an available gap. This mode is
  experimental and may contain minor edge-case bugs.

A bookmark never displaces a folder: dropping it onto a folder adds it to that
folder. Folders themselves use the same smart drag and resize system as other
grid items.

## Architecture

SpaceTab uses vanilla JavaScript modules with a small dependency direction:

```text
Core domain and versioned schema
              ↓
Store and browser persistence
              ↓
Use-case/modal controllers
              ↓
Reusable UI components and renderers
```

Important modules:

```text
src/js/core/bookmarkModel.js       drafts, presets, normalization, validation
src/js/core/bookmarkFolders.js     folder membership and placement commands
src/js/core/folderGrid.js          fixed 3 × 6 internal folder layout
src/js/core/bookmarkDragModes.js   drag-mode constants and normalization
src/js/core/browserCapabilities.js tested sync-browser detection
src/js/core/dataSchema.js          migrations and import/export envelopes
src/js/core/bookmark.js            bookmark commands and batch operations
src/js/core/bookmarkGroups.js      workspace commands
src/js/core/store.js               state, persistence status and undo/redo
src/js/core/storage.js             local/sync storage and quota-safe chunking

src/js/ui/bookmark/panel.js        reusable create/edit/preset panel
src/js/ui/bookmark/renderer.js     bookmark and folder grid rendering
src/js/ui/bookmark/dragResize.js   shared pointer drag and resize controller
src/js/ui/bookmark/smartDragLayout.js pure collision and displacement planner
src/js/ui/bookmark/gridKeyboardNavigation.js Tab-based grid focus and actions
src/js/ui/bookmark/keyboardMovement.js selected-bookmark arrow movement
src/js/ui/folder/                  folder card, actions and contents controller
src/js/ui/modals/folderModal.js    compact folder workspace and drag controller
src/js/ui/bookmark/bulkActions.js  multi-selection workflows
src/js/ui/modalManager.js          modal stack and focus management
```

The bookmark panel does not import the store, calculate grid placement or
perform persistence. Controllers decide what saving means. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete boundary guide.

## Local and synchronized storage

SpaceTab starts in **Local** mode. In Google Chrome, **Settings → Sync** offers:

* **Only on this device** — data uses `chrome.storage.local`.
* **Synchronized** — data uses the browser-managed `chrome.storage.sync` area.

Synchronization is currently enabled only in branded Google Chrome, where it
follows the Chrome profile / Google Account configuration. Brave and other
Chromium browsers remain fully usable in Local mode, but the synchronized
option is disabled because cross-device propagation has not been reliable; see
[issue #1](https://github.com/Alextc35/spacetab/issues/1). SpaceTab does not
operate an OAuth client, account system or server and cannot access synchronized
user data.

When Sync is enabled for the first time, local data is uploaded if the profile
does not already contain SpaceTab data. Existing synchronized data wins to avoid
accidental overwrites. Returning to Local mode creates a local copy and leaves
the synchronized copy untouched.

If an older SpaceTab installation encounters synchronized data written by a
newer schema or sync format, startup remains usable: that device automatically
returns to its compatible Local data, leaves the cloud payload untouched and
locks the Sync option with an update notice. The lock is device-specific and
disappears after installing a compatible version (or explicitly deleting the
synchronized SpaceTab data).

Chrome's sync quotas are handled by splitting the versioned payload into safe
chunks. SpaceTab reports quota/persistence errors and shows the current save
status in Settings. The Sync panel shows live used, total and available capacity
for the currently selected mode, reports the latest synchronized update and can
delete all synchronized SpaceTab data after confirmation. Deleting sync data first
keeps the working data locally when necessary. An open SpaceTab page also shows
a flash message when its data is updated by another synchronized device; writes
made on the current device do not trigger that message locally.

> Cross-device sync requires the same extension ID on every installation. A
> Chrome Web Store release provides this automatically. Development installs
> need a stable manifest key or consistent packaging workflow.

## Keyboard and pointer shortcuts

* `Space` toggles the main edit mode; inside an open folder it toggles that
  folder's edit controls and reordering.
* `Enter` opens the create-bookmark panel.
* `.` opens Settings.
* `/` opens global search.
* `Middle click` opens that bookmark's editor while editing the grid.
* `Alt/⌥ + ↑/↓` cycles through workspaces.
* `Ctrl/Cmd + Z` undoes the latest bookmark operation.
* `Ctrl/Cmd + Shift + Z` redoes it.

Press `Tab` while the page is focused to enter keyboard grid navigation; press
`Tab` again to leave it. The first visible top-level item receives focus and
an informational flash confirms both mode changes. `↑/↓/←/→` moves to the
nearest bookmark or folder in that direction. While
this navigation is active, `Enter` opens the focused bookmark or folder outside
edit mode. In edit mode, `Enter` opens the focused item's editor when there is
no selection or when that bookmark is the sole selected item; `S` toggles the
focused bookmark's selection.
Folders cannot be added to the bookmark selection and flash red when `S` is
pressed on one.

Outside keyboard grid navigation, `↑/↓/←/→` moves exactly one selected
top-level bookmark while editing. A bookmark that is already selected remains
stationary while `Tab` navigation is active and becomes movable again after
leaving that mode. Arrow movement follows the configured drag behavior. In None mode it skips
occupied cells until the next free rectangle. Relocation and Sequence exchange
bookmarks one step at a time and jump over the complete rectangle of a folder
without moving it. Arrow shortcuts are ignored with zero or multiple
selections, while typing, and while a modal is open.

Selection uses a short primary click. Holding the primary button starts a drag
and therefore does not alter selection.

Workspaces maintain independent layouts. Folders cannot cross or nest between
workspaces. Search covers every workspace and includes the containing folder in
each result; moving selected bookmarks finds free target cells before making
changes.

## Development and tests

Install exact development dependencies and run the standard quality gate:

```sh
npm ci
npm run check
```

Run browser journeys:

```sh
npx playwright install chromium
npm run test:e2e
```

The optional unpacked-extension smoke test needs a Chromium-family executable:

```sh
SPACETAB_BROWSER_PATH="/path/to/browser" npm run test:extension
```

Pull requests run lint, Node/Vitest tests and Playwright journeys through GitHub
Actions. Read [CONTRIBUTING.md](CONTRIBUTING.md) before structural changes.

## Languages

The interface ships with English (`en`), Spanish from Spain (`es`), Latin
American Spanish (`es_419`) and Brazilian Portuguese (`pt_BR`) in
`src/js/lang/`.

## Roadmap

* Revision and conflict recovery for simultaneous synchronized edits
* Additional theme controls and shareable preset packs
* More import sources
* Chrome Web Store packaging and release

## Privacy

* No tracking or analytics
* No SpaceTab-operated backend
* Local mode stays inside the browser profile
* Sync mode delegates storage and transport to the browser
* The developer cannot access synchronized data

## License

SpaceTab is released under the [MIT License](LICENSE).
