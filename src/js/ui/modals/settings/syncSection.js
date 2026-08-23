import {
  getDraftStorageMode,
  reconcileDraftStorageMode,
  setDraftStorageMode
} from './settingsState.js';
import {
  deleteSyncedData,
  getStorageMode,
  getSyncedDataMetadata,
  subscribe
} from '../../../core/store.js';
import { subscribeLanguageChange, t } from '../../../core/i18n.js';
import {
  getSyncBrowserSupport,
  SYNC_BROWSERS
} from '../../../core/browserCapabilities.js';
import { showAlert } from '../alert.js';
import { flashError, flashSuccess } from '../../flash.js';

function getBrowserNoticeKey(browser) {
  if (browser === SYNC_BROWSERS.CHROME) {
    return 'settingsModal.sync.browserSupport.chrome';
  }

  if (browser === SYNC_BROWSERS.BRAVE) {
    return 'settingsModal.sync.browserSupport.brave';
  }

  return 'settingsModal.sync.browserSupport.unsupported';
}

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
  const browserSupport = getSyncBrowserSupport();
  const syncNotice = document.getElementById('storage-sync-notice');
  const browserNotice = document.getElementById('storage-sync-browser-notice');
  const existingNotice = document.getElementById('storage-sync-existing-notice');
  const persistenceStatus = document.getElementById('storage-persistence-status');
  const lastUpdated = document.getElementById('storage-sync-last-updated');
  const deleteSyncData = document.getElementById('storage-sync-delete');
  let syncMetadata = null;
  let metadataError = false;
  let metadataRequestId = 0;
  let isDeleting = false;

  function renderSyncMetadata() {
    if (!lastUpdated) return;

    let key = 'settingsModal.sync.metadata.loading';
    let params = {};

    if (metadataError) {
      key = 'settingsModal.sync.metadata.error';
    } else if (syncMetadata && !syncMetadata.hasData) {
      key = 'settingsModal.sync.metadata.empty';
    } else if (syncMetadata?.hasData && syncMetadata.updatedAt === null) {
      key = 'settingsModal.sync.metadata.unknown';
    } else if (syncMetadata?.updatedAt) {
      const language = document.documentElement.lang || 'en';
      const formattedDate = new Intl.DateTimeFormat(language, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(syncMetadata.updatedAt));
      key = 'settingsModal.sync.metadata.updatedAt';
      params = { date: formattedDate };
    }

    lastUpdated.textContent = t(key, params);
    if (deleteSyncData) {
      deleteSyncData.disabled = isDeleting || metadataError || !syncMetadata?.hasData;
    }
  }

  async function refreshSyncMetadata() {
    const requestId = ++metadataRequestId;

    try {
      const metadata = await getSyncedDataMetadata();
      if (requestId !== metadataRequestId) return;
      syncMetadata = metadata;
      metadataError = false;
    } catch (error) {
      if (requestId !== metadataRequestId) return;
      console.error('[SETTINGS] Could not read synchronized metadata:', error);
      syncMetadata = null;
      metadataError = true;
    }

    renderSyncMetadata();
  }

  subscribe(state => {
    const persistence = state.ui.persistence;
    if (!persistenceStatus || !persistence) return;
    const statusKey = `settingsModal.sync.status.${persistence.status}`;
    persistenceStatus.dataset.status = persistence.status;
    persistenceStatus.dataset.i18n = statusKey;
    persistenceStatus.textContent = t(statusKey);

    if (persistence.status === 'saved' && getStorageMode() === 'sync') {
      void refreshSyncMetadata();
    }
  });

  subscribeLanguageChange(renderSyncMetadata);

  function syncUI() {
    const selectedMode = getDraftStorageMode();
    const browserNoticeKey = getBrowserNoticeKey(browserSupport.browser);

    if (browserNotice) {
      browserNotice.dataset.i18n = browserNoticeKey;
      browserNotice.textContent = t(browserNoticeKey);
    }

    existingNotice?.classList.toggle('is-hidden', !browserSupport.canSync);
    syncNotice?.classList.toggle('is-unsupported', !browserSupport.canSync);

    for (const input of modeInputs) {
      const isUnsupportedSync = input.value === 'sync' && !browserSupport.canSync;
      const option = input.closest('.storage-mode-option');

      input.disabled = isUnsupportedSync;
      input.checked = input.value === selectedMode;
      option?.classList.toggle('is-selected', input.checked);
      option?.classList.toggle('is-disabled', isUnsupportedSync);

      if (isUnsupportedSync) {
        option?.setAttribute('aria-disabled', 'true');
      } else {
        option?.removeAttribute('aria-disabled');
      }
    }

    renderSyncMetadata();
    void refreshSyncMetadata();
  }

  for (const input of modeInputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      if (input.value === 'sync' && !browserSupport.canSync) {
        syncUI();
        return;
      }

      setDraftStorageMode(input.value);
      syncUI();
      onRequestSaveStateUpdate();
    });
  }

  deleteSyncData?.addEventListener('click', async () => {
    const confirmed = await showAlert(
      t('alert.settings.sync.delete'),
      { type: 'confirm' }
    );

    if (!confirmed) return;

    isDeleting = true;
    renderSyncMetadata();

    try {
      await deleteSyncedData();
      reconcileDraftStorageMode(getStorageMode());
      syncMetadata = { hasData: false, updatedAt: null };
      metadataError = false;
      flashSuccess('flash.sync.deleted');
    } catch (error) {
      console.error('[SETTINGS] Could not delete synchronized data:', error);
      flashError('flash.sync.deleteError');
      metadataError = true;
    } finally {
      isDeleting = false;
      syncUI();
      onRequestSaveStateUpdate();
    }
  });

  return { syncUI };
}
