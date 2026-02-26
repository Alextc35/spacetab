// store.js
import { DEBUG } from './config.js';
import { storage } from './storage.js';
import { DEFAULT_STATE } from './defaults.js';

/// <reference path="../types/types.js" />

/**
 * Global application state.
 * @type {AppState}
 */
let state = structuredClone(DEFAULT_STATE);

/**
 * List of subscribed listeners executed on every state change.
 * @type {Array<(state: AppState, prevState: AppState|null) => void>}
 */
const listeners = [];

/**
 * Indicates whether the store is still in the hydration phase.
 * While `true`, state changes will not be persisted to storage.
 * @type {boolean}
 */
let isHydrating = true;

/* ======================= GET STATE ======================= */

/**
 * Returns a deep clone of the current state.
 * @returns {AppState}
 */
export function getState() {
  return structuredClone(state);
}

/* ======================= SET STATE ======================= */

/**
 * Updates the global state with the provided partial values.
 * Persists bookmarks and settings to storage if not hydrating.
 * Notifies all subscribed listeners.
 * 
 * @param {Partial<AppState>} partial
 * @returns {Promise<void>}
 */
export async function setState(partial) {
  const prevState = state;

  state = {
    data: {
      ...state.data,
      ...(partial.data || {})
    },
    ui: {
      ...state.ui,
      ...(partial.ui || {})
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
      state.data.settings !== prevState.data.settings
    ) {
      try {
        await storage.set({
          bookmarks: state.data.bookmarks,
          settings: state.data.settings
        });

        if (DEBUG) {
          console.log('[STORE] Persisted to storage:', {
            bookmarks: state.data.bookmarks,
            settings: state.data.settings
          });
        }
      } catch (err) {
        console.error('[STORE] Storage persist failed:', err);
      }
    }
  }

  notify(state, prevState);

  if (DEBUG) console.groupEnd();
}

/* ======================= SUBSCRIBE ======================= */

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

/* ======================= TOGGLE EDIT MODE ======================= */

/**
 * Toggles the UI editing mode.
 * @returns {Promise<boolean>}
 */
export async function toggleEditing() {
  const newValue = !state.ui.isEditing;
  await setState({ ui: { isEditing: !state.ui.isEditing } });
  return newValue;
}

/* ======================= HYDRATION ======================= */

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
  const persisted = await storage.get(null);

  await setState({ data: persisted });

  finishHydration();
}

/**
 * Marks the hydration phase as completed.
 * After this, state changes affecting bookmarks or settings
 * will be persisted automatically.
 */
function finishHydration() {
  isHydrating = false;
  if (DEBUG) console.log('[STORE] Hydration finished, ready to persist state.');
}

/* ======================= NOTIFY ======================= */

/**
 * Notifies all subscribed listeners about a state change.
 * 
 * @private
 * @param {AppState} state
 * @param {AppState} prevState
 */
function notify(state, prevState) {
  for (const listener of listeners) {
    listener(state, prevState);
  }
}