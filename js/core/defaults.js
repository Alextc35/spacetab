// defaults.js

/// <reference path="../types/types.js" />

/**
 * Base bookmark configuration.
 *
 * Defines the canonical default values for all Bookmark
 * properties except `id`, which must be generated at runtime.
 *
 * This object acts as the bookmark schema reference and
 * must remain side-effect free.
 *
 * @type {Omit<Bookmark, 'id'>}
 */
export const DEFAULT_BOOKMARK = {
  name: '',
  url: '',
  gx: 0,
  gy: 0,
  w: 1,
  h: 1,
  backgroundImageUrl: null,
  backgroundFavicon: true,
  invertColorBg: false,
  noBackground: false,
  backgroundColor: '#000000',
  showText: true,
  textColor: '#ffffff',
  showFavicon: true,
  invertColorIcon: false
};

/**
 * Initial bookmarks used when no persisted data exists.
 *
 * These are only applied on first application load.
 * Each bookmark:
 * - Generates a runtime `id`
 * - Extends DEFAULT_BOOKMARK
 *
 * @type {Bookmark[]}
 */
export const DEFAULT_BOOKMARKS = [
  {
    id: crypto.randomUUID(),
    ...DEFAULT_BOOKMARK,
    name: 'www.alextc.es',
    url: 'https://www.alextc.es'
  }
];

/**
 * Default application settings.
 *
 * Defines the initial Settings state used
 * when no persisted settings exist.
 *
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
 *
 * Acts as the single source of truth for
 * the full initial AppState structure.
 *
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