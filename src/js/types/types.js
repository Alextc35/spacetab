/**
 * @typedef {Object} Bookmark
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {boolean} urlLocked
 * @property {number} gx
 * @property {number} gy
 * @property {number} w
 * @property {number} h
 * @property {string|null} groupId
 * @property {string|null} folderId
 * @property {string|null} backgroundImageUrl
 * @property {string|null} backgroundImageLocal
 * @property {boolean} backgroundImageUrlLocked
 * @property {boolean} backgroundFavicon
 * @property {boolean} invertColorBg
 * @property {boolean} noBackground
 * @property {string} backgroundColor
 * @property {boolean} showText
 * @property {string} textColor
 * @property {boolean} showFavicon
 * @property {boolean} invertColorIcon
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} BookmarkFolder
 * @property {string} id
 * @property {string} name
 * @property {number} gx
 * @property {number} gy
 * @property {number} w
 * @property {number} h
 * @property {string|null} groupId
 * @property {boolean} noBackground
 * @property {string} backgroundColor
 * @property {string|null} outerBackgroundColor Null keeps the automatic tile gradient.
 * @property {string|null} backgroundImageUrl
 * @property {string|null} backgroundImageLocal
 * @property {boolean} backgroundImageUrlLocked
 * @property {string} textColor
 * @property {boolean} showFolder
 * @property {boolean} showPreviews Always false when showFolder is false.
 * @property {boolean} showName
 * @property {boolean} showCount
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Omit<Bookmark, 'id'> & {id?: string}} BookmarkDraft
 */

/**
 * @typedef {Object} BookmarkPreset
 * @property {string|null} backgroundImageUrl
 * @property {string|null} backgroundImageLocal
 * @property {boolean} backgroundImageUrlLocked
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
 * @property {'system'|'en'|'es'|'es_419'|'pt_BR'} language
 * @property {'system'|'light'|'dark'} interfaceTheme
 * @property {'none'|'cascade'|'relocate'} bookmarkDragMode
 * @property {'smooth'|'none'} bookmarkResizeMode
 * @property {Object} theme
 * @property {boolean} theme.backgroundDefault
 * @property {boolean} theme.backgroundSolid
 * @property {string} theme.backgroundColor
 * @property {string|null} theme.backgroundImageUrl
 * @property {string|null} theme.backgroundImageLocal
 * @property {boolean} theme.backgroundImageUrlLocked
 * @property {BookmarkPreset} bookmarkDefault
 * @property {Array<{id: string, name: string, style: BookmarkPreset}>} bookmarkPresets
 * @property {Array<{id: string, name: string}>} bookmarkGroups
 * @property {string|null} activeBookmarkGroupId
 */

/**
 * @typedef {Object} DataState
 * @property {number} schemaVersion
 * @property {Bookmark[]} bookmarks
 * @property {BookmarkFolder[]} folders
 * @property {Settings} settings
 */

/**
 * @typedef {Object} UIState
 * @property {boolean} isEditing
 * @property {{status: 'idle'|'saving'|'saved'|'error', error: string|null, updatedAt: number|null}} persistence
 * @property {{canUndo: boolean, canRedo: boolean}} history
 */

/**
 * @typedef {Object} AppState
 * @property {DataState} data
 * @property {UIState} ui
 */

/**
 * @typedef {Object<string, string | TranslationTree>} TranslationTree
 */

/**
 * @typedef {Pick<AppState['data'], 'schemaVersion' | 'bookmarks' | 'folders' | 'settings'>} PersistedData
 */

/**
 * @typedef {Object} SyncCompatibilityBlock
 * @property {'newer-sync-data'} reason
 * @property {number|null} requiredSchemaVersion
 * @property {number} supportedSchemaVersion
 * @property {number|null} requiredSyncFormatVersion
 * @property {number} supportedSyncFormatVersion
 * @property {number} detectedAt
 */
