# SpaceTab

Minimalist Chrome new tab extension to organize bookmarks in a visual grid workspace.

![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)
![version](https://img.shields.io/badge/version-0.21.8-blue)
![license](https://img.shields.io/badge/license-MIT-green)

![demo](assets/gif/demo.gif)

SpaceTab replaces Chrome's default new tab page with a **clean and customizable visual bookmark workspace**, allowing you to move, resize, and organize your bookmarks visually — like a desktop for your favorite websites.

---

## 💡 Why another Chrome New Tab extension?

Many bookmark tools become cluttered and slow over time.

SpaceTab focuses on:

* Visual organization
* Fast interaction
* Minimal interface
* Complete privacy

Instead of a long bookmark list, your favorite websites become a **visual workspace**.

---

## ✨ Features

* Drag and resize bookmarks freely
* Grid-based bookmark layout
* Custom themes
* Bookmark preview and editor
* Import / Export bookmarks
* Keyboard shortcuts
* Favicon preview
* Multi-language support (English / Spanish)
* Local storage only (no external services)

### Built-in UI systems

SpaceTab includes several internal UI systems designed to keep the interface modular:

* **Flash notification system** for quick feedback messages
* **Alert modal system** for confirmations and alerts
* **Modal Manager** to control modal lifecycle
* **Tabs system** for modal navigation
* **Bookmark renderer and preview system**
* **Global application state store**

---

## 📦 Installation

### Manual installation

1. Clone the repository

```
git clone https://github.com/Alextc35/spacetab.git
```

2. Open Chrome extensions page

```
chrome://extensions
```

3. Enable **Developer Mode**

4. Click **Load unpacked**

5. Select the `spacetab` folder

---

## 🧩 How it works

SpaceTab works like a **web desktop for bookmarks**.

Instead of a traditional bookmark list, you can:

* Place bookmarks anywhere on a grid
* Resize bookmarks to emphasize important sites
* Customize appearance (background, favicon, text)
* Organize your browsing environment visually

Each bookmark acts like a **visual shortcut to a website**.

---

## 📐 Grid System

Bookmarks are placed on a grid layout.

Each bookmark has grid coordinates:

```
gx → column
gy → row
w → width
h → height
```

The grid system ensures:

* bookmarks cannot overlap
* resizing respects available space
* new bookmarks are placed in the first available position

Grid calculations are handled in:

```
core/grid.js
ui/gridLayout.js
```

---

## 🔖 Bookmark System

Each bookmark contains:

* position in the grid
* size within the grid
* visual configuration
* metadata

Example structure:

```
{
  name: "GitHub",
  url: "https://github.com",
  gx: 0,
  gy: 0,
  w: 1,
  h: 1,
  backgroundColor: "#000",
  backgroundImageUrl: null,
  showFavicon: true
}
```

Bookmark logic is split into:

```
core/bookmark.js      → bookmark data logic
ui/bookmark/renderer  → rendering bookmarks
ui/bookmark/dragResize → moving and resizing
ui/bookmark/editor    → editing bookmarks
```

---

## 🏗 Architecture

SpaceTab follows a **modular architecture written in Vanilla JavaScript**.

The codebase is separated into three main layers.

### Core

Application logic and state management.

```
core
 ├─ bookmark.js
 ├─ config.js
 ├─ defaults.js
 ├─ grid.js
 ├─ settings.js
 ├─ storage.js
 ├─ store.js
 └─ theme.js
```

Responsibilities:

* bookmark data logic
* grid calculations
* global state management
* storage persistence
* configuration and settings

---

### UI

Responsible for rendering and user interaction.

```
ui
 ├─ uiController.js
 ├─ gridLayout.js
 ├─ flash.js
 ├─ modalManager.js
 ├─ tabs.js
 │
 ├─ bookmark
 │   ├─ renderer.js
 │   ├─ dragResize.js
 │   ├─ preview.js
 │   ├─ editor.js
 │   ├─ favicon.js
 │   └─ importExport.js
 │
 └─ modals
     ├─ addBookmark.js
     ├─ editBookmark.js
     ├─ alert.js
     └─ settings
```

Responsibilities:

* rendering bookmarks
* managing modals
* handling drag and resize interactions
* coordinating UI updates

---

### Internationalization

```
lang
 ├─ en.json
 └─ es.json
```

SpaceTab includes a simple i18n system that allows the interface to be translated easily.

---

## 🔄 Application Flow

The general application flow is:

```
User interaction
      ↓
UI controllers
      ↓
Store (global state)
      ↓
Core logic
      ↓
Storage persistence
      ↓
UI re-render
```

This separation keeps the interface logic independent from the application state.

---

## 🛠 Tech Stack

* Vanilla JavaScript
* Chrome Extension APIs
* Chrome Storage API
* Modular CSS architecture
* Internationalization system (i18n)
* Google Favicon API
* Git

---

## 🌍 Languages

Currently supported languages:

* English
* Spanish

---

## 🚀 Roadmap

### Planned Features

* Bookmark folders
* Sync support
* Multi-select drag
* More theme customization
* Chrome Web Store release

---

## 🤝 Contributing

Contributions are welcome.

If you want to improve SpaceTab:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 🔒 Privacy

SpaceTab is built with privacy in mind.

* No tracking
* No analytics
* No external services
* All data is stored locally using Chrome Storage

---

## 📜 License

This project is licensed under the MIT License.
