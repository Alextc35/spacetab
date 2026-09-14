import { t } from '../../core/i18n.js';
import { createItemActionButton } from '../bookmark/actions.js';
import { openFolderEditor } from '../modals/folderEditorModal.js';

export function addFolderActions(container, folder) {
  const actions = document.createElement('div');
  actions.className = 'item-actions folder-item-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('folder.actions.ariaLabel'));

  const editButton = createItemActionButton(
    '✎',
    'edit',
    'is-dark',
    () => openFolderEditor(folder.id)
  );
  editButton.setAttribute('aria-label', t('folder.actions.customize'));

  actions.append(editButton);
  container.append(actions);
}
