import '../types/types.js'; // typedefs
import { debug, describeStateChange } from './debug.js';
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

/** @type {{areaName: 'local'|'sync', origin: 'same-device'|'other-device'}|null} */
let pendingStorageChange = null;

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

/** @type {Array<() => void>} */
const remoteSyncUpdateListeners = [];

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
 * @param {{recordHistory?: boolean, debugTrace?: ReturnType<typeof debug.start>}} [options]
 * @returns {Promise<void>}
 */
export async function setState(partial, { recordHistory = true, debugTrace } = {}) {
  const prevState = state;
  const trace = debugTrace ?? debug.start(debug.enabled
    ? (isHydrating ? 'Hydrate data' : describeStateChange(partial, prevState.data))
    : '');
  let persistenceError = null;
  let persisted = false;
  let persistenceMode = storage.getMode();
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

  const details = debug.enabled ? {
    bookmarksBefore: prevState.data.bookmarks.length,
    bookmarksAfter: state.data.bookmarks.length,
    foldersBefore: prevState.data.folders.length,
    foldersAfter: state.data.folders.length
  } : {};
  const shouldPersist = !isHydrating && (
    state.data.bookmarks !== prevState.data.bookmarks ||
    state.data.folders !== prevState.data.folders ||
    state.data.settings !== prevState.data.settings
  );
  if (shouldPersist) {
    const dataToPersist = structuredClone(state.data);
    state.ui.persistence = {
      status: 'saving',
      error: null,
      updatedAt: state.ui.persistence?.updatedAt ?? null
    };
    trace.mark('Data preparation');

    try {
      persistenceQueue = persistenceQueue
        .catch(() => undefined)
        .then(async () => {
          trace.mark('Queue wait');
          persistenceMode = storage.getMode();
          try {
            await storage.set(dataToPersist);
          } finally {
            trace.mark('Storage write');
          }
        });

      await persistenceQueue;
      state.ui.persistence = {
        status: 'saved',
        error: null,
        updatedAt: Date.now()
      };

      persisted = true;
    } catch (err) {
      persistenceError = err?.message || 'Storage persistence failed';
      console.error('[STORE] Storage persist failed:', err);
      state.ui.persistence = {
        status: 'error',
        error: err?.message || 'Storage persistence failed',
        updatedAt: Date.now()
      };
    }
  } else {
    trace.mark('Data preparation');
  }

  try {
    notify(state, prevState);
    trace.mark('Notify UI');
    trace.end({ ...details, storageMode: persistenceMode, persisted,
      status: persistenceError ? 'error' : 'ok', ...(persistenceError ? { error: persistenceError } : {}) });
  } catch (error) {
    trace.end({ ...details, status: 'error', error: error.message, persisted });
    throw error;
  }
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
  await setState({ data: previous }, { recordHistory: false, debugTrace: debug.start('Undo') });
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
  await setState({ data: next }, { recordHistory: false, debugTrace: debug.start('Redo') });
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

/** @returns {SyncCompatibilityBlock|null} */
export function getSyncCompatibility() {
  return storage.getSyncCompatibility();
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

  const trace = debug.start('Switch storage', { from: storage.getMode(), to: mode });
  try {
    await persistenceQueue.catch(() => undefined);
    trace.mark('Queue wait');
    const result = await storage.changeMode(mode, nextData);
    trace.mark('Storage switch');
    replacePersistedData(result.data);
    trace.end({ source: result.source, activeMode: storage.getMode() });
    return result.source;
  } catch (error) {
    trace.end({ status: 'error', error: error.message, activeMode: storage.getMode() });
    throw error;
  }
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
 * Subscribes to data updates received from another synchronized device.
 * Unlike the regular store subscription, this is not invoked immediately.
 *
 * @param {() => void} listener
 * @returns {() => void} Function to unsubscribe.
 */
export function subscribeToRemoteSyncUpdates(listener) {
  remoteSyncUpdateListeners.push(listener);

  return () => {
    const index = remoteSyncUpdateListeners.indexOf(listener);
    if (index > -1) remoteSyncUpdateListeners.splice(index, 1);
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
 * @returns {boolean} Whether the in-memory data changed.
 */
function replacePersistedData(data) {
  if (JSON.stringify(state.data) === JSON.stringify(data)) return false;

  const prevState = state;
  state = {
    ...state,
    data: structuredClone(data)
  };

  clearBookmarkHistory();

  notify(state, prevState);
  return true;
}

/**
 * Keeps open SpaceTab pages up to date when another tab or device changes the
 * active storage area. Closely grouped chunk events are collapsed into one
 * refresh.
 */
function subscribeToStorageChanges() {
  if (unsubscribeFromStorage) return;

  unsubscribeFromStorage = storage.subscribe(change => {
    if (
      change.origin === 'other-device'
      || pendingStorageChange?.origin !== 'other-device'
    ) {
      pendingStorageChange = change;
    }

    if (storageRefreshTimer) clearTimeout(storageRefreshTimer);

    storageRefreshTimer = setTimeout(async () => {
      storageRefreshTimer = null;
      const refreshChange = pendingStorageChange;
      pendingStorageChange = null;

      try {
        const persisted = await storage.get(null);
        const dataChanged = replacePersistedData(persisted);
        if (dataChanged) debug.info('Data refreshed from storage', refreshChange);

        if (
          dataChanged
          && refreshChange?.areaName === STORAGE_MODES.SYNC
          && refreshChange.origin === 'other-device'
        ) {
          for (const listener of remoteSyncUpdateListeners) listener();
        }
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
