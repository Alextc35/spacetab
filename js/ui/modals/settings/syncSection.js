import {
  getDraftStorageMode,
  setDraftStorageMode
} from './settingsState.js';
import { subscribe } from '../../../core/store.js';
import { t } from '../../../core/i18n.js';

/**
 * Initializes the Local/Sync persistence selector.
 *
 * The selection is kept as modal draft state and is only applied when the
 * user saves the settings modal.
 *
 * @param {Object} params
 * @param {Function} params.onRequestSaveStateUpdate
 * @returns {{syncUI: Function}}
 */
export function initSyncSection({ onRequestSaveStateUpdate }) {
  const modeInputs = Array.from(
    document.querySelectorAll('input[name="storage-mode"]')
  );
  const persistenceStatus = document.getElementById('storage-persistence-status');

  subscribe(state => {
    const persistence = state.ui.persistence;
    if (!persistenceStatus || !persistence) return;
    persistenceStatus.dataset.status = persistence.status;
    persistenceStatus.textContent = t(`settingsModal.sync.status.${persistence.status}`);
  });

  function syncUI() {
    const selectedMode = getDraftStorageMode();

    for (const input of modeInputs) {
      input.checked = input.value === selectedMode;
      input.closest('.storage-mode-option')?.classList.toggle(
        'is-selected',
        input.checked
      );
    }
  }

  for (const input of modeInputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;

      setDraftStorageMode(input.value);
      syncUI();
      onRequestSaveStateUpdate();
    });
  }

  return { syncUI };
}
