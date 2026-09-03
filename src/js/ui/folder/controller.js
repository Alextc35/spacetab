import { createBookmarkFolder } from '../../core/bookmarkFolders.js';
import { t } from '../../core/i18n.js';
import { flashSuccess } from '../flash.js';
import { getMaxVisibleCols, getMaxVisibleRows } from '../gridLayout.js';
import { showAlert, showPrompt } from '../modals/alert.js';
import { ensurePanelFits } from '../viewportMode.js';

let initialized = false;

export function initFolderController() {
  if (initialized) return;
  initialized = true;

  document.getElementById('add-folder')?.addEventListener('click', async () => {
    if (!ensurePanelFits()) return;
    const name = await showPrompt(t('folder.createPrompt'), {
      placeholder: t('folder.namePlaceholder'),
      requiresWideViewport: true
    });
    if (!name) return;

    const folder = createBookmarkFolder(name, {
      columns: getMaxVisibleCols(),
      rows: getMaxVisibleRows()
    });
    if (!folder) {
      await showAlert(t('folder.noSpace'), { type: 'info' });
      return;
    }
    flashSuccess('flash.folder.created');
  });
}
