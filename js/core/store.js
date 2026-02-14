import { storage } from './storage.js';
 
let state = {
  bookmarks: [],
  isEditing: false,
  settings: {}
};

const listeners = [];
let isHydrating = true;

export function getState() {
  return state;
}

export function setState(partial) {
  const prevState = state;
  state = { ...state, ...partial };

  if (!isHydrating) {
    if (
      state.bookmarks !== prevState.bookmarks ||
      state.settings !== prevState.settings
    ) {
      storage.set({
        bookmarks: state.bookmarks,
        settings: state.settings
      });
    }
  }

  notify(state, prevState);
}

export function subscribe(listener) {
  listeners.push(listener);

  // Ejecutar inmediatamente con estado actual
  listener(state, state);

  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

export function finishHydration() {
  isHydrating = false;
}

function notify(state, prevState) {
  for (const listener of listeners) {
    listener(state, prevState);
  }
}