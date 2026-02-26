import { storage } from './storage.js';
import { getState, setState } from './store.js';

/**
 * Loads persisted settings from storage, merges them with the provided
 * default settings, updates the application state, and returns the result.
 *
 * @param {Settings} defaultSettings - Default settings used as fallback.
 * @returns {Promise<Settings>} The merged settings object.
 */
export async function loadSettings(defaultSettings) {
  const data = await storage.get('settings');

  const settings = {
    ...defaultSettings,
    ...(data?.settings ?? {})
  };

  setState({ data: { settings } });

  return settings;
}

/**
 * Updates the current settings in the application state by merging
 * a partial settings object into the existing settings.
 *
 * @param {Partial<Settings>} partial - Partial settings to update.
 * @returns {Settings} The updated settings object.
 */
export function updateSettings(partial) {
  const { data: { settings } } = getState();

  const updated = {
    ...settings,
    ...partial
  };

  setState({ data: { settings: updated } });

  return updated;
}