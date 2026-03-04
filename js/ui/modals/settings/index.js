import { initBookmarkSection } from './bookmarkSection.js';
import { initLanguageSection } from './languageSection.js';
import { initTabs } from './tabs.js';
import { initThemeSection } from './themeSection.js';
import { registerModal, openModal, closeModal } from '../../modalManager.js';
import { showAlert } from '../alertModal.js';
import { flashSuccess } from '../../flash.js';
import { getState } from '../../../core/store.js';
import { updateSettings } from '../../../core/settings.js';
import {
  initDraft,
  resetState,
  hasChanges,
  buildNewSettings
} from './settingsState.js';
import { t } from '../../../core/i18n.js';

export function initSettingsModal() {
  const settingsBtn = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsSave = document.getElementById('settings-modal-save');
  const settingsCancel = document.getElementById('settings-modal-cancel');

  /* ==================================================
     Helpers
  ================================================== */

  function updateSaveButtonState() {
    const changed = hasChanges();
    settingsSave.disabled = !changed;
    settingsSave.classList.toggle('is-hidden', !changed);
  }

  const themeSection = initThemeSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const bookmarkSection = initBookmarkSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const languageSection = initLanguageSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const tabs = initTabs({
    rootSelector: '#settings-modal',
    tabButtonSelector: '.settings-modal-tab-btn',
    tabContentSelector: '.settings-modal-tab-content'
  });

  /* ==================================================
     Modal registration
  ================================================== */

  registerModal({
    id: 'settings',
    element: settingsModal,
    acceptOnEnter: false,
    closeOnEsc: false,
    closeOnOverlay: false,
    initialFocus: null
  });

  /* ==================================================
     OPEN
  ================================================== */

  settingsBtn.addEventListener('click', () => {
    const { data: { settings } } = getState();

    initDraft(settings);

    themeSection.syncUI();
    bookmarkSection.syncUI();
    languageSection.syncUI();

    updateSaveButtonState();

    tabs.activate('settings-modal-tab-general');
    openModal('settings');
  });

  /* ==================================================
     CANCEL / SAVE
  ================================================== */

  settingsCancel.addEventListener('click', async () => {
    if (!hasChanges()) {
      closeModal();
      return;
    }

    const ok = await showAlert(
      t('alert.settings.cancel'),
      { type: 'confirm' }
    );

    if (ok) {
      await languageSection.restoreInitialLanguage();
      resetState();
      closeModal();
    }
  });

  settingsSave.addEventListener('click', () => {
    const newSettings = buildNewSettings();

    updateSettings(newSettings);
    flashSuccess('flash.settings.saved');
    resetState();
    closeModal();
  });
}