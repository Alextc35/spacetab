import { changeLanguage } from '../../../core/i18n.js';
import { getInitialSnapshot } from './settingsState.js';
import {
  getDraftLanguage,
  setDraftLanguage
} from './settingsState.js';

export function initLanguageSection({
  onRequestSaveStateUpdate
}) {
  /* ==================================================
     DOM
  ================================================== */

  const languageSelect = document.getElementById('language-select');

  /* ==================================================
     Sync
  ================================================== */

  function syncUI() {
    languageSelect.value = getDraftLanguage();
  }

  async function restoreInitialLanguage() {
    const initialLanguage = getInitialSnapshot().language;
    await changeLanguage({ language: initialLanguage });
  }

  /* ==================================================
     Events
  ================================================== */

  languageSelect.addEventListener('change', async () => {
    const value = languageSelect.value;

    setDraftLanguage(value);

    await changeLanguage({ language: value });

    onRequestSaveStateUpdate();
  });

  /* ==================================================
     API
  ================================================== */

  return {
    syncUI,
    restoreInitialLanguage
  };
}