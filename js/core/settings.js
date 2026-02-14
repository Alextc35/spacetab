import { storage } from './storage.js';
import { setState, getState } from './store.js';

export async function loadSettings(defaultSettings) {
  const data = await storage.get('settings');

  const settings = {
    ...defaultSettings,
    ...(data?.settings ?? {})
  };
  setState({ settings });

  return settings;
}

export function updateSettings(partial) {
  const current = getState().settings;

  setState({
    settings: {
      ...current,
      ...partial
    }
  });
}