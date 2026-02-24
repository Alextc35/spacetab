import { storage } from './storage.js';
import { setState, getState } from './store.js';

export async function loadSettings(defaultSettings) {
  const data = await storage.get('settings');

  const settings = {
    ...defaultSettings,
    ...(data?.settings ?? {})
  };

  setState({
    data: { settings }
  });

  return settings;
}

export function updateSettings(partial) {
  const { data } = getState();
  const current = data.settings;

  const updated = {
    ...current,
    ...partial
  };

  setState({
    data: { settings: updated }
  });

  return updated;
}