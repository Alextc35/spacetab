import {
  getDraftStorageMode,
  reconcileDraftStorageMode,
  setDraftStorageMode
} from './settingsState.js';
import {
  deleteSyncedData,
  getStorageMode,
  getStorageUsage,
  getSyncCompatibility,
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

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / (1024 ** unitIndex);
  const language = document.documentElement.lang || 'en';
  const formatted = new Intl.NumberFormat(language, {
    maximumFractionDigits: value >= 10 ? 0 : 1
  }).format(value);

  return `${formatted} ${units[unitIndex]}`;
}

function formatPercentage(value) {
  const language = document.documentElement.lang || 'en';
  if (value > 0 && value < 0.1) {
    return `<${new Intl.NumberFormat(language).format(0.1)}`;
  }

  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 1
  }).format(value);
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
  const settingsModal = document.getElementById('settings-modal');
  const syncHelp = document.getElementById('storage-sync-help');
  const syncNotice = document.getElementById('storage-sync-notice');
  const compatibilityNotice = document.getElementById('storage-sync-compatibility-notice');
  const browserNotice = document.getElementById('storage-sync-browser-notice');
  const existingNotice = document.getElementById('storage-sync-existing-notice');
  const persistenceStatus = document.getElementById('storage-persistence-status');
  const persistenceIndicator = document.getElementById('storage-persistence-indicator');
  const lastUpdated = document.getElementById('storage-sync-last-updated');
  const deleteSyncData = document.getElementById('storage-sync-delete');
  const usageItem = document.querySelector('[data-storage-usage-active]');
  const usageMode = document.getElementById('storage-usage-mode');
  const usageSummary = document.getElementById('storage-usage-summary');
  const usageAvailable = document.getElementById('storage-usage-available');
  const usageProgress = document.getElementById('storage-usage-progress');
  const usageSegments = {
    system: document.querySelector('[data-storage-segment="system"]'),
    bookmarks: document.querySelector('[data-storage-segment="bookmarks"]'),
    trash: document.querySelector('[data-storage-segment="trash"]')
  };
  const usageCategoryValues = {
    system: document.getElementById('storage-usage-system'),
    bookmarks: document.getElementById('storage-usage-bookmarks'),
    trash: document.getElementById('storage-usage-trash')
  };
  let syncMetadata = null;
  let metadataError = false;
  let metadataRequestId = 0;
  let storageUsage = null;
  let storageUsageError = false;
  let usageRequestId = 0;
  let isDeleting = false;
  let isTooltipPinned = false;
  let isHelpHovered = false;
  let suppressTooltip = false;

  // Keep the tooltip inside the dialog for accessibility, but outside every
  // scrolling/clipping container so it can float over the complete modal.
  if (settingsModal && syncNotice?.parentElement !== settingsModal) {
    settingsModal.append(syncNotice);
  }

  function positionSyncTooltip() {
    if (!syncHelp || !syncNotice?.classList.contains('is-open')) return;

    const viewportMargin = 12;
    const gap = 10;
    const helpRect = syncHelp.getBoundingClientRect();
    const tooltipRect = syncNotice.getBoundingClientRect();
    const spaceAbove = helpRect.top - gap - viewportMargin;
    const spaceBelow = window.innerHeight - helpRect.bottom - gap - viewportMargin;
    const placement = spaceAbove >= tooltipRect.height || spaceAbove >= spaceBelow
      ? 'above'
      : 'below';
    const requestedTop = placement === 'above'
      ? helpRect.top - tooltipRect.height - gap
      : helpRect.bottom + gap;
    const maxLeft = Math.max(viewportMargin, window.innerWidth - tooltipRect.width - viewportMargin);
    const maxTop = Math.max(viewportMargin, window.innerHeight - tooltipRect.height - viewportMargin);
    const left = Math.min(
      Math.max(viewportMargin, helpRect.right - tooltipRect.width),
      maxLeft
    );
    const top = Math.min(Math.max(viewportMargin, requestedTop), maxTop);
    const arrowLeft = Math.min(
      Math.max(12, helpRect.left + (helpRect.width / 2) - left),
      tooltipRect.width - 12
    );

    syncNotice.dataset.placement = placement;
    syncNotice.style.left = `${left}px`;
    syncNotice.style.top = `${top}px`;
    syncNotice.style.setProperty('--sync-tooltip-arrow-left', `${arrowLeft}px`);
  }

  function setSyncTooltipOpen(open) {
    if (!syncHelp || !syncNotice) return;
    syncNotice.classList.toggle('is-open', open);
    syncHelp.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(positionSyncTooltip);
  }

  function resetSyncTooltip() {
    isTooltipPinned = false;
    suppressTooltip = false;
    setSyncTooltipOpen(false);
  }

  syncHelp?.addEventListener('mouseenter', () => {
    isHelpHovered = true;
    if (!suppressTooltip) setSyncTooltipOpen(true);
  });

  syncHelp?.addEventListener('mouseleave', () => {
    isHelpHovered = false;
    suppressTooltip = false;
    if (!isTooltipPinned) setSyncTooltipOpen(false);
  });

  syncHelp?.addEventListener('focus', () => {
    if (!suppressTooltip) setSyncTooltipOpen(true);
  });

  syncHelp?.addEventListener('blur', () => {
    suppressTooltip = false;
    if (!isTooltipPinned && !isHelpHovered) setSyncTooltipOpen(false);
  });

  syncHelp?.addEventListener('click', () => {
    if (isTooltipPinned) {
      isTooltipPinned = false;
      suppressTooltip = true;
      setSyncTooltipOpen(false);
      return;
    }

    isTooltipPinned = true;
    suppressTooltip = false;
    setSyncTooltipOpen(true);
  });

  window.addEventListener('resize', positionSyncTooltip);
  document.addEventListener('scroll', positionSyncTooltip, true);

  if (settingsModal) {
    new MutationObserver(() => {
      if (settingsModal.hidden || !settingsModal.classList.contains('is-open')) {
        resetSyncTooltip();
      }
    }).observe(settingsModal, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  function getUsageDisplayMode() {
    return getDraftStorageMode() ?? getStorageMode();
  }

  function renderStorageBreakdown(breakdown, quotaBytes) {
    const categories = {
      system: breakdown?.systemBytes,
      bookmarks: breakdown?.bookmarkBytes,
      trash: breakdown?.trashBytes
    };

    for (const [category, bytes] of Object.entries(categories)) {
      const hasValue = Number.isFinite(bytes);
      const formattedBytes = hasValue ? formatBytes(bytes) : '—';
      const percentage = hasValue && quotaBytes > 0
        ? Math.min(100, (bytes / quotaBytes) * 100)
        : 0;
      const segment = usageSegments[category];

      if (segment) {
        segment.style.width = `${percentage}%`;
        segment.title = hasValue
          ? `${t(`settingsModal.sync.usage.${category}`)}: ${formattedBytes}`
          : '';
      }
      if (usageCategoryValues[category]) {
        usageCategoryValues[category].textContent = formattedBytes;
      }
    }
  }

  function setStorageProgress(percentage) {
    const value = Number.isFinite(percentage) ? percentage : 0;
    usageProgress?.setAttribute('aria-valuenow', String(value));
    usageProgress?.setAttribute('value', String(value));
  }

  function renderStorageUsage() {
    if (!usageItem) return;

    const mode = getUsageDisplayMode();
    const modeKey = mode === 'sync' ? 'sync' : 'local';
    usageItem.dataset.storageUsage = modeKey;
    usageMode.textContent = t(`settingsModal.sync.usage.${modeKey}`);
    usageProgress.setAttribute(
      'aria-label',
      t(`settingsModal.sync.usage.${modeKey}Aria`)
    );

    if (storageUsageError) {
      usageSummary.textContent = t('settingsModal.sync.usage.error');
      usageAvailable.textContent = '';
      setStorageProgress(0);
      renderStorageBreakdown(null, 0);
      return;
    }

    if (!storageUsage || storageUsage.mode !== modeKey) {
      usageSummary.textContent = t('settingsModal.sync.usage.loading');
      usageAvailable.textContent = '';
      setStorageProgress(0);
      renderStorageBreakdown(null, 0);
      return;
    }

    const percentage = storageUsage.quotaBytes > 0
      ? Math.min(100, (storageUsage.usedBytes / storageUsage.quotaBytes) * 100)
      : 0;
    const used = formatBytes(storageUsage.usedBytes);
    const total = formatBytes(storageUsage.quotaBytes);
    const free = formatBytes(storageUsage.availableBytes);
    const percent = formatPercentage(percentage);

    usageSummary.textContent = t(
      'settingsModal.sync.usage.summary',
      { used, total, percent }
    );
    usageAvailable.textContent = t('settingsModal.sync.usage.available', { free });
    setStorageProgress(percentage);
    renderStorageBreakdown(storageUsage.breakdown, storageUsage.quotaBytes);
  }

  async function refreshStorageUsage() {
    const requestId = ++usageRequestId;
    const mode = getUsageDisplayMode();
    storageUsage = null;
    storageUsageError = false;
    renderStorageUsage();

    try {
      const usage = await getStorageUsage(mode);
      if (requestId !== usageRequestId || mode !== getUsageDisplayMode()) return;
      storageUsage = usage;
    } catch (error) {
      if (requestId !== usageRequestId || mode !== getUsageDisplayMode()) return;
      console.error(`[SETTINGS] Could not read ${mode} storage usage:`, error);
      storageUsageError = true;
    }

    renderStorageUsage();
  }

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
    if (!persistence) return;
    const statusKey = `settingsModal.sync.status.${persistence.status}`;
    if (persistenceStatus) {
      persistenceStatus.dataset.status = persistence.status;
      persistenceStatus.dataset.i18n = statusKey;
      persistenceStatus.textContent = t(statusKey);
    }
    if (persistenceIndicator) {
      persistenceIndicator.dataset.status = persistence.status;
    }

    if (persistence.status === 'saved' && getStorageMode() === 'sync') {
      void refreshSyncMetadata();
    }

    if (persistence.status === 'saved') void refreshStorageUsage();
  });

  subscribeLanguageChange(() => {
    renderSyncMetadata();
    renderStorageUsage();
    if (syncNotice?.classList.contains('is-open')) {
      requestAnimationFrame(positionSyncTooltip);
    }
  });

  function syncUI() {
    const selectedMode = getDraftStorageMode();
    const browserNoticeKey = getBrowserNoticeKey(browserSupport.browser);
    const compatibility = getSyncCompatibility();
    const isVersionBlocked = compatibility?.reason === 'newer-sync-data';

    if (browserNotice) {
      browserNotice.dataset.i18n = browserNoticeKey;
      browserNotice.textContent = t(browserNoticeKey);
      browserNotice.classList.toggle('is-hidden', isVersionBlocked);
    }

    if (compatibilityNotice) {
      compatibilityNotice.classList.toggle('is-hidden', !isVersionBlocked);
      compatibilityNotice.textContent = t(
        'settingsModal.sync.compatibility.newerVersion'
      );
    }

    existingNotice?.classList.toggle(
      'is-hidden',
      !browserSupport.canSync || isVersionBlocked
    );
    syncNotice?.classList.toggle(
      'is-unsupported',
      !browserSupport.canSync && !isVersionBlocked
    );
    syncNotice?.classList.toggle('is-version-blocked', isVersionBlocked);
    if (syncNotice?.classList.contains('is-open')) {
      requestAnimationFrame(positionSyncTooltip);
    }

    for (const input of modeInputs) {
      const isUnsupportedSync = input.value === 'sync'
        && (!browserSupport.canSync || isVersionBlocked);
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
    renderStorageUsage();
    void refreshSyncMetadata();
    void refreshStorageUsage();
  }

  for (const input of modeInputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      if (input.value === 'sync' && !browserSupport.canSync) {
        syncUI();
        return;
      }

      if (input.value === 'sync' && getSyncCompatibility()) {
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
