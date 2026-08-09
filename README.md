# SpaceTab

Minimalist Chrome/Brave new-tab extension for organizing bookmarks in a visual
grid workspace.

![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)
![version](https://img.shields.io/badge/version-0.2.0_beta-blue)
![license](https://img.shields.io/badge/license-MIT-green)

![demo](assets/gifs/demo.gif)

SpaceTab replaces the browser's default new tab with a private, customizable
visual bookmark workspace. Bookmarks can be placed, resized and styled like
items on a desktop without relying on a SpaceTab account or backend.

## Features

* Free drag and resize on a collision-aware grid
* Shared panel for creating, editing and defining default bookmark styles
* Named appearance presets
* Independent bookmark workspaces
* Global search palette (`/` or `Ctrl/Cmd + K`)
* Multi-select, bulk styling, moving, duplication and deletion
* Duplicate, undo and redo actions
* Themes, favicon previews and English/Spanish UI
* Versioned bookmark import/export and complete backups
* Optional browser-profile synchronization
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
  backgroundColor: "#000000",
  backgroundImageUrl: null,
  showFavicon: true
}
```

An appearance preset never contains bookmark identity, timestamps, workspace or
grid coordinates. New bookmarks combine an empty identity with the active
preset and are placed in the first available cell of the current workspace.

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
js/core/bookmarkModel.js       drafts, presets, normalization, validation
js/core/dataSchema.js          migrations and import/export envelopes
js/core/bookmark.js            bookmark commands and batch operations
js/core/bookmarkGroups.js      workspace commands
js/core/store.js               state, persistence status and undo/redo
js/core/storage.js             local/sync storage and quota-safe chunking

js/ui/bookmark/panel.js        reusable create/edit/preset panel
js/ui/bookmark/renderer.js     production and preview rendering
js/ui/bookmark/bulkActions.js  multi-selection workflows
js/ui/modalManager.js          modal stack and focus management
```

The bookmark panel does not import the store, calculate grid placement or
perform persistence. Controllers decide what saving means. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete boundary guide.

## Local and synchronized storage

SpaceTab starts in **Local** mode. From **Settings → Sync**, users can select:

* **Only on this device** — data uses `chrome.storage.local`.
* **Synchronized** — data uses the browser-managed `chrome.storage.sync` area.

Chrome follows the Chrome profile / Google Account sync configuration. Brave
uses Brave Sync. SpaceTab does not operate an OAuth client, account system or
server and cannot access synchronized user data.

When Sync is enabled for the first time, local data is uploaded if the profile
does not already contain SpaceTab data. Existing synchronized data wins to avoid
accidental overwrites. Returning to Local mode creates a local copy and leaves
the synchronized copy untouched.

Chrome's sync quotas are handled by splitting the versioned payload into safe
chunks. SpaceTab reports quota/persistence errors and shows the current save
status in Settings.

> Cross-device sync requires the same extension ID on every installation. A
> Chrome Web Store release provides this automatically. Development installs
> need a stable manifest key or consistent packaging workflow.

## Keyboard and organization

* `Space` toggles edit mode when no modal is open.
* `Enter` opens the create-bookmark panel.
* `.` opens Settings.
* `/` or `Ctrl/Cmd + K` opens global search.
* `Ctrl/Cmd + Z` undoes the latest bookmark operation.
* `Ctrl/Cmd + Shift + Z` redoes it.

Workspaces maintain independent layouts. Search covers every workspace, and
moving selected bookmarks finds free target cells before making changes.

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

English and Spanish are currently supported through `js/lang/en.json` and
`js/lang/es.json`.

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
