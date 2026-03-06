import '../types/types.js'; // typedefs

/**
 * Default visual style for a bookmark.
 * Contains only appearance-related properties.
 *
 * @type {Bookmark}
 */
export const DEFAULT_BOOKMARK_STYLE = {
  backgroundImageUrl: null,
  backgroundImageUrlLocked: false,
  backgroundFavicon: true,
  invertColorBg: false,
  noBackground: true,
  backgroundColor: '#000000',

  showText: true,
  textColor: '#ffffff',

  showFavicon: true,
  invertColorIcon: false,
};

/**
 * Default structural values for a bookmark.
 * Contains position and layout related properties.
 *
 * @type {Bookmark}
 */
export const DEFAULT_BOOKMARK_STRUCTURE = {
  name: '',
  url: '',
  urlLocked: false,

  gx: 0,
  gy: 0,
  w: 1,
  h: 1,

  createdAt: 0,
  updatedAt: 0
};

/** Defines the canonical default values for all Bookmark
 * properties except `id`, which must be generated at runtime.
 *
 * This object acts as the bookmark schema reference and
 * must remain side-effect free.
 *
 * @type {Omit<Bookmark, 'id'>}
 */
export const DEFAULT_BOOKMARK = {
  ...DEFAULT_BOOKMARK_STRUCTURE,
  ...DEFAULT_BOOKMARK_STYLE
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
    name: 'DEVELOPED BY',
    url: 'https://www.alextc.es',
    urlLocked: true,
    noBackground: false,
    backgroundColor: '#161b22',
  },
  {
    id: crypto.randomUUID(),
    ...DEFAULT_BOOKMARK,
    name: 'banana',
    backgroundImageUrl: 'https://cdn.osxdaily.com/wp-content/uploads/2013/07/dancing-banana.gif',
    backgroundImageUrlLocked: true,
    backgroundFavicon: false,
    noBackground: false,
    backgroundColor: '#eeff00',
    showText: false,
    showFavicon: false,
    gx: 1
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
    backgroundDefault: true,
    backgroundColor: '#ffffff',
    backgroundImageUrl: null,
    backgroundImageUrlLocked: false
  },

  bookmarkDefault: {
    ...DEFAULT_BOOKMARK_STYLE,
    name: 'Test',
    url: 'https://.internal'
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
    bookmarks: structuredClone(DEFAULT_BOOKMARKS),
    settings: structuredClone(DEFAULT_SETTINGS)
  },
  ui: {
    isEditing: false
  }
};