import { t } from '../../core/i18n.js';
import { createItemActionButton } from '../bookmark/actions.js';
import { isVisuallyDark } from '../bookmark/utils.js';
import { openFolderEditor } from '../modals/folderEditorModal.js';

export function addFolderActions(container, folder) {
  const themeClass = isFolderActionSurfaceDark(folder) ? 'is-dark' : 'is-light';
  const actions = document.createElement('div');
  actions.className = 'item-actions folder-item-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('folder.actions.ariaLabel'));

  const editButton = createItemActionButton(
    '✎',
    'edit',
    themeClass,
    () => openFolderEditor(folder.id)
  );
  editButton.setAttribute('aria-label', t('folder.actions.customize'));

  actions.append(editButton);
  container.append(actions);
}

function isFolderActionSurfaceDark(folder) {
  if (folder.outerBackgroundColor) {
    return isVisuallyDark({ backgroundColor: folder.outerBackgroundColor });
  }

  const interfaceTheme = document.documentElement.dataset.interfaceTheme;
  if (interfaceTheme === 'light') return false;
  if (interfaceTheme === 'dark') return true;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true;
}
