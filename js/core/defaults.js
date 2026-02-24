// defaults.js

/// <reference path="../types/types.js" />

/**
 * Default bookmarks.
 * You can add some initial bookmarks here if you want,
 * or leave the array empty.
 * @type {Bookmark[]}
 */
export const DEFAULT_BOOKMARKS = [
  {
    id: crypto.randomUUID(),
    name: 'www.alextc.es',
    url: 'https://www.alextc.es',
    gx: 0,
    gy: 0,
    w: 1,
    h: 1,
    backgroundImageUrl: null,
    backgroundFavicon: true,
    invertColorBg: false,
    noBackground: true,
    backgroundColor: '#000000',
    showText: true,
    textColor: '#ffffff',
    showFavicon: true,
    invertColorIcon: false
  }
];

/**
 * Default settings for the application.
 * @type {Settings}
 */
export const DEFAULT_SETTINGS = {
  language: 'en',

  theme: {
    backgroundColor: '#333333',
    backgroundImageUrl: 'https://wallpapercave.com/wp/wp2730867.gif',
    backgroundImageUrlLocked: false
  }
};

/**
 * Default application state.
 * Single source of truth for the full initial state.
 * @type {AppState}
 */
export const DEFAULT_STATE = {
  data: {
    bookmarks: DEFAULT_BOOKMARKS,
    settings: DEFAULT_SETTINGS
  },
  ui: {
    isEditing: false
  }
};