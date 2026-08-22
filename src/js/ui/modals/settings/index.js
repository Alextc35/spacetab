// ui/modals/settings/index.js
import { registerModal, openModal, closeModal } from '../../modalManager.js';
import { flashSuccess, flashError } from '../../flash.js';
import { initTabs } from '../../tabs.js';

import { changeLanguage, t } from '../../../core/i18n.js';
import { DEFAULT_SETTINGS } from '../../../core/defaults.js';
import {
  changeStorageMode,
  getState,
  getStorageMode
} from '../../../core/store.js';
import { updateSettings } from '../../../core/settings.js';

import { showAlert } from '../alert.js';

import { initGeneralSection } from './generalSection.js'; // TODO: implement general section
import { initThemeSection } from './themeSection.js';
import { initBookmarkSection } from './bookmarkSection.js';
import { initLanguageSection } from './languageSection.js';
import { initSyncSection } from './syncSection.js';
import {
  initDraft,
  resetState,
  hasChanges,
  buildNewSettings,
  getDraftStorageMode,
  replaceDraftSettings
} from './settingsState.js';

/**
 * Initializes the settings modal.
 *
 * This module is responsible for:
 * - registering the settings modal
 * - initializing section controllers
 * - managing modal open/cancel/save flows
 * - syncing draft state with the UI
 */
export function initSettingsModal() {
  /**
   * Main settings modal controls.
   */
  const settingsBtn = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsSave = document.getElementById('settings-modal-save');
  const settingsCancel = document.getElementById('settings-modal-cancel');

  /* ==================================================
     Helpers
  ================================================== */

  /**
   * Updates the save button visibility and disabled state
   * depending on whether the draft settings have changed.
   */
  function updateSaveButtonState() {
    const changed = hasChanges();
    settingsSave.disabled = !changed;
    settingsSave.classList.toggle('is-hidden', !changed);
  }

  /**
   * Initializes the top-level settings tabs.
   */
  const tabs = initTabs({
    root: '#settings-modal',
    tabButtonSelector: '.settings-modal-tab-btn',
    tabContentSelector: '.settings-modal-tab-content'
  });

  /**
   * Initializes section controllers.
   *
   * Each section notifies this module whenever its draft state changes
   * so the save button can be updated accordingly.
   */
  const themeSection = initThemeSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const bookmarkSection = initBookmarkSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const languageSection = initLanguageSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  const syncSection = initSyncSection({
    onRequestSaveStateUpdate: updateSaveButtonState
  });

  initGeneralSection({
    onResetSettings: async () => {
      replaceDraftSettings(DEFAULT_SETTINGS);
      themeSection.syncUI();
      bookmarkSection.syncUI();
      languageSection.syncUI();
      await changeLanguage(DEFAULT_SETTINGS);
      updateSaveButtonState();
    },
    onBackupImported: () => {
      resetState();
      closeModal();
    }
  });

  /* ==================================================
     Modal registration
  ================================================== */

  /**
   * Registers the settings modal with the modal manager.
   *
   * Shortcut behavior:
   * - "." toggles the settings modal
   * - the shortcut delegates to the settings button click handler
   */
  registerModal({
    id: 'settings',
    element: settingsModal,
    closeOnEsc: true,
    closeOnOverlay: false,
    acceptOnEnter: false,
    initialFocus: null,
    shortcut: '.',
    toggleWithShortcut: true,
    onShortcut: () => settingsBtn.click()
  });

  /**
   * Handles modal cancellation.
   *
   * Behavior:
   * - closes immediately if nothing changed
   * - otherwise asks for confirmation
   * - restores section state if the user confirms cancellation
   *
   * @returns {Promise<boolean>} Whether the cancel flow completed.
   */
  async function handleCancel() {
    if (!hasChanges()) {
      closeModal();
      return true;
    }

    const ok = await showAlert(
      t('alert.settings.cancel'),
      { type: 'confirm' }
    );

    if (!ok) return false;

    await languageSection.restoreInitialLanguage();
    resetState();
    closeModal();
    return true;
  }

  /* ==================================================
     OPEN
  ================================================== */

  /**
   * Opens the settings modal.
   *
   * On open:
   * - current persisted settings are loaded into draft state
   * - each section syncs its UI from the draft
   * - default tabs are activated
   * - modal cancel behavior is attached
   */
  settingsBtn.addEventListener('click', () => {
    const { data: { settings } } = getState();

    initDraft(settings, getStorageMode());

    themeSection.syncUI();
    bookmarkSection.syncUI();
    languageSection.syncUI();
    syncSection.syncUI();

    updateSaveButtonState();

    tabs.activate('settings-modal-tab-general');

    openModal('settings', {
      onCancel: handleCancel
    });
  });

  /* ==================================================
     CANCEL / SAVE
  ================================================== */

  /**
   * Binds the explicit cancel button to the cancel flow.
   */
  settingsCancel.addEventListener('click', handleCancel);

  /**
   * Saves the current draft settings.
   *
   * Flow:
   * - build the next settings object from draft state
   * - persist the settings
   * - show success feedback
   * - reset draft tracking
   * - close the modal
   */
  settingsSave.addEventListener('click', async () => {
    const newSettings = buildNewSettings();
    const currentStorageMode = getStorageMode();
    const nextStorageMode = getDraftStorageMode();

    settingsSave.disabled = true;

    try {
      if (nextStorageMode !== currentStorageMode) {
        const currentData = getState().data;
        const source = await changeStorageMode(nextStorageMode, {
          ...currentData,
          settings: newSettings
        });

        if (nextStorageMode === 'sync' && source === 'existing') {
          flashSuccess('flash.sync.remoteLoaded');
        } else if (nextStorageMode === 'sync') {
          flashSuccess('flash.sync.enabled');
        } else {
          flashSuccess('flash.sync.localEnabled');
        }
      } else {
        await updateSettings(newSettings);
        flashSuccess('flash.settings.saved');
      }

      resetState();
      closeModal();
    } catch (err) {
      console.error('[SETTINGS] Storage mode change failed:', err);
      flashError(
        err?.code === 'SYNC_QUOTA_EXCEEDED'
          ? 'flash.sync.quotaError'
          : 'flash.sync.error'
      );
      updateSaveButtonState();
    }
  });
}
