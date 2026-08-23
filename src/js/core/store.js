import '../types/types.js'; // typedefs
import { DEBUG } from './config.js';
import { DEFAULT_STATE } from './defaults.js';
import { storage, STORAGE_MODES } from './storage.js';

/**
 * Global application state.
 * @type {AppState}
 */
let state = structuredClone(DEFAULT_STATE);

/**
 * Indicates whether the store is still in the hydration phase.
 * While `true`, state changes will not be persisted to storage.
 * @type {boolean}
 */
let isHydrating = true;

/** @type {ReturnType<typeof setTimeout>|null} */
let storageRefreshTimer = null;

/** @type {(() => void)|null} */
let unsubscribeFromStorage = null;

/** @type {Promise<void>} */
let persistenceQueue = Promise.resolve();

const HISTORY_LIMIT = 50;
/** @type {Array<Pick<DataState, 'bookmarks'|'folders'>>} */
const undoStack = [];
/** @type {Array<Pick<DataState, 'bookmarks'|'folders'>>} */
const redoStack = [];

/**
 * List of subscribed listeners executed on every state change.
 * @type {Array<(state: AppState, prevState: AppState|null) => void>}
 */
const listeners = [];

/**
 * Returns a deep clone of the current state.
 * @returns {AppState}
 */
export function getState() {
  return structuredClone(state);
}

/**
 * Updates the global state with the provided partial values.
 * Persists bookmarks, folders and settings to storage if not hydrating.
 * Notifies all subscribed listeners.
 * 
 * @param {Partial<AppState>} partial
 * @returns {Promise<void>}
 */
export async function setState(partial, { recordHistory = true } = {}) {
  const prevState = state;
  const gridDataWillChange = (
    partial.data?.bookmarks !== undefined
    && partial.data.bookmarks !== state.data.bookmarks
  ) || (
    partial.data?.folders !== undefined
    && partial.data.folders !== state.data.folders
  );

  if (!isHydrating && recordHistory && gridDataWillChange) {
    undoStack.push(structuredClone({
      bookmarks: state.data.bookmarks,
      folders: state.data.folders
    }));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack.length = 0;
  }

  state = {
    data: {
      ...state.data,
      ...(partial.data || {})
    },
    ui: {
      ...state.ui,
      ...(partial.ui || {}),
      history: {
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0
      }
    }
  };

  if (DEBUG) {
    console.groupCollapsed('[STORE] setState called');
    console.log('Partial update:', partial);
    console.log('Prev state:', prevState);
    console.log('New state:', state);

    const changedDataKeys = Object.keys(state.data).filter(
      key => state.data[key] !== prevState.data[key]
    );
    const changedUIKeys = Object.keys(state.ui).filter(
      key => state.ui[key] !== prevState.ui[key]
    );

    if (changedDataKeys.length) console.log('[STORE] Data changed keys:', changedDataKeys);
    if (changedUIKeys.length) console.log('[STORE] UI changed keys:', changedUIKeys);
  }

  if (!isHydrating) {
    if (
      state.data.bookmarks !== prevState.data.bookmarks ||
      state.data.folders !== prevState.data.folders ||
      state.data.settings !== prevState.data.settings
    ) {
      const dataToPersist = structuredClone(state.data);
      state.ui.persistence = {
        status: 'saving',
        error: null,
        updatedAt: state.ui.persistence?.updatedAt ?? null
      };

      try {
        persistenceQueue = persistenceQueue
          .catch(() => undefined)
          .then(() => storage.set(dataToPersist));

        await persistenceQueue;
        state.ui.persistence = {
          status: 'saved',
          error: null,
          updatedAt: Date.now()
        };

        if (DEBUG) {
          console.log('[STORE] Persisted to storage:', {
            bookmarks: dataToPersist.bookmarks,
            folders: dataToPersist.folders,
            settings: dataToPersist.settings
          });
        }
      } catch (err) {
        console.error('[STORE] Storage persist failed:', err);
        state.ui.persistence = {
          status: 'error',
          error: err?.message || 'Storage persistence failed',
          updatedAt: Date.now()
        };
      }
    }
  }

  notify(state, prevState);

  if (DEBUG) console.groupEnd();
}

/**
 * Restores the previous bookmark/folder collection. Settings and UI state are not
 * included so an accidental shortcut cannot revert synchronization choices.
 *
 * @returns {Promise<boolean>}
 */
export async function undoBookmarks() {
  const previous = undoStack.pop();
  if (!previous) return false;

  redoStack.push(structuredClone({
    bookmarks: state.data.bookmarks,
    folders: state.data.folders
  }));
  await setState({ data: previous }, { recordHistory: false });
  return true;
}

/** @returns {Promise<boolean>} */
export async function redoBookmarks() {
  const next = redoStack.pop();
  if (!next) return false;

  undoStack.push(structuredClone({
    bookmarks: state.data.bookmarks,
    folders: state.data.folders
  }));
  await setState({ data: next }, { recordHistory: false });
  return true;
}

/** Clears transient undo history after hydration or a full data replacement. */
export function clearBookmarkHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  state.ui.history = { canUndo: false, canRedo: false };
}

/**
 * Returns the persistence mode selected on this device.
 *
 * @returns {'local'|'sync'}
 */
export function getStorageMode() {
  return storage.getMode();
}

/** @returns {Promise<{hasData: boolean, updatedAt: number|null}>} */
export function getSyncedDataMetadata() {
  return storage.getSyncMetadata();
}

/**
 * Returns quota usage for a browser storage area.
 *
 * @param {'local'|'sync'} mode
 * @returns {ReturnType<typeof storage.getUsage>}
 */
export function getStorageUsage(mode) {
  return storage.getUsage(mode);
}

/**
 * Permanently removes the remote SpaceTab payload. If synchronized storage is
 * active, the current state is copied locally before the remote data is
 * removed so the device never loses its working data.
 *
 * @returns {Promise<{deleted: boolean, switchedToLocal: boolean}>}
 */
export async function deleteSyncedData() {
  await persistenceQueue.catch(() => undefined);
  const switchedToLocal = storage.getMode() === STORAGE_MODES.SYNC;

  if (switchedToLocal) {
    await changeStorageMode(STORAGE_MODES.LOCAL, state.data);
  }

  const deleted = await storage.clearSyncData();
  return { deleted, switchedToLocal };
}

/**
 * Switches between device-only and browser-synchronized persistence.
 *
 * When synchronized data already exists, it becomes the active state. When it
 * does not exist, the current state is migrated to sync storage. Switching
 * back to local keeps a local copy and leaves remote data untouched.
 *
 * @param {'local'|'sync'} mode
 * @param {PersistedData} [nextData=state.data]
 * @returns {Promise<'unchanged'|'existing'|'migrated'>}
 */
export async function changeStorageMode(mode, nextData = state.data) {
  if (!Object.values(STORAGE_MODES).includes(mode)) {
    throw new TypeError(`Unsupported storage mode: ${mode}`);
  }

  await persistenceQueue.catch(() => undefined);
  const result = await storage.changeMode(mode, nextData);
  replacePersistedData(result.data);
  return result.source;
}

/**
 * Subscribes a listener that will run on every state change.
 * The listener is immediately invoked with the current state.
 *
 * @param {(state: AppState, prevState: AppState|null) => void} listener
 * @returns {() => void} Function to unsubscribe.
 */
export function subscribe(listener) {
  listeners.push(listener);
  listener(state, null);

  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Toggles the UI editing mode.
 * @returns {Promise<boolean>}
 */
export async function toggleEditing() {
  const newValue = !state.ui.isEditing;
  await setState({ ui: { isEditing: newValue } });
  return newValue;
}

/**
 * Hydrates the store from persisted storage.
 *
 * Retrieves all persisted data (bookmarks and settings),
 * initializes the in-memory state in a single update,
 * and then marks the hydration phase as completed.
 *
 * During hydration, persistence is temporarily disabled
 * to prevent writing back the same data to storage.
 *
 * @returns {Promise<void>}
 */
export async function hydrateStore() {
  await storage.initialize();
  const persisted = await storage.get(null);

  await setState({ data: persisted });

  finishHydration();
  clearBookmarkHistory();
  subscribeToStorageChanges();
}

/**
 * Marks the hydration phase as completed.
 * After this, state changes affecting bookmarks or settings
 * will be persisted automatically.
 */
function finishHydration() { isHydrating = false; }

/**
 * Replaces persisted state without writing it back to storage.
 * Used for changes received from another tab or synchronized device.
 *
 * @param {PersistedData} data
 */
function replacePersistedData(data) {
  if (JSON.stringify(state.data) === JSON.stringify(data)) return;

  const prevState = state;
  state = {
    ...state,
    data: structuredClone(data)
  };

  clearBookmarkHistory();

  notify(state, prevState);
}

/**
 * Keeps open SpaceTab pages up to date when another tab or device changes the
 * active storage area. Closely grouped chunk events are collapsed into one
 * refresh.
 */
function subscribeToStorageChanges() {
  if (unsubscribeFromStorage) return;

  unsubscribeFromStorage = storage.subscribe(() => {
    if (storageRefreshTimer) clearTimeout(storageRefreshTimer);

    storageRefreshTimer = setTimeout(async () => {
      storageRefreshTimer = null;

      try {
        const persisted = await storage.get(null);
        replacePersistedData(persisted);
      } catch (err) {
        console.error('[STORE] Storage refresh failed:', err);
      }
    }, 50);
  });
}

/**
 * Notifies all subscribed listeners about a state change.
 * 
 * @param {AppState} state
 * @param {AppState} prevState
 */
function notify(state, prevState) {
  for (const listener of listeners) {
    listener(state, prevState);
  }
}
