/**
 * @typedef {Object} Bookmark
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {number} gx
 * @property {number} gy
 * @property {number} w
 * @property {number} h
 * @property {string|null} backgroundImageUrl
 * @property {boolean} backgroundFavicon
 * @property {boolean} invertColorBg
 * @property {boolean} noBackground
 * @property {string} backgroundColor
 * @property {boolean} showText
 * @property {string} textColor
 * @property {boolean} showFavicon
 * @property {boolean} invertColorIcon
 */

/**
 * @typedef {Object} Settings
 * @property {Object} theme
 * @property {string} theme.backgroundColor
 * @property {string|null} theme.backgroundImageUrl
 * @property {boolean} theme.backgroundImageUrlLocked
 */

/**
 * @typedef {Object} DataState
 * @property {Bookmark[]} bookmarks
 * @property {Settings} settings
 */

/**
 * @typedef {Object} UIState
 * @property {boolean} isEditing
 */

/**
 * @typedef {Object} AppState
 * @property {DataState} data
 * @property {UIState} ui
 */