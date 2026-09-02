import { applyInterfaceTheme } from '../../../core/interfacePreferences.js';
import { getDraftInterfaceTheme, setDraftInterfaceTheme, getInitialSnapshot } from './settingsState.js';
import { t } from '../../../core/i18n.js';
import { exportBackup, importBackup } from '../../backup.js';
import { showAlert } from '../alert.js';

/** Connects complete backup/restore and the all-settings draft reset. */
export function initGeneralSection({ onResetSettings, onBackupImported, onRequestSaveStateUpdate }) {
  const themeInputs = document.querySelectorAll('input[name="interface-theme"]');
  const systemNote = document.getElementById('interface-theme-system-note');

  function syncUI() {
    const preference = getDraftInterfaceTheme();
    for (const input of themeInputs) input.checked = input.value === preference;
    systemNote.classList.toggle('is-hidden', preference !== 'system');
    applyInterfaceTheme(preference);
  }

  for (const input of themeInputs) {
    input.addEventListener('change', () => {
      setDraftInterfaceTheme(input.value);
      syncUI();
      onRequestSaveStateUpdate();
    });
  }

  function restoreInitialTheme() {
    applyInterfaceTheme(getInitialSnapshot().interfaceTheme);
  }

  const exportButton = document.getElementById('export-btn-general');
  const importButton = document.getElementById('import-btn-general');
  const importInput = document.getElementById('import-input-general');
  const resetButton = document.getElementById('reset-settings-btn-general');

  exportButton.addEventListener('click', exportBackup);
  importButton.addEventListener('click', () => importInput.click());

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;

    const confirmed = await showAlert(t('alert.backup.import'), { type: 'confirm' });
    if (!confirmed) return;

    if (await importBackup(file)) onBackupImported?.();
  });

  resetButton.addEventListener('click', async () => {
    const confirmed = await showAlert(t('alert.settings.reset'), { type: 'confirm' });
    if (confirmed) await onResetSettings?.();
  });

  return { syncUI, restoreInitialTheme };
}
