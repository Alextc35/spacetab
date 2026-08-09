import {
  createBackupEnvelope,
  parseBackupPayload
} from '../core/dataSchema.js';
import { getState, setState } from '../core/store.js';
import { flashError, flashSuccess } from './flash.js';

export function exportBackup() {
  try {
    downloadJson(
      createBackupEnvelope(getState().data),
      `spacetab-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    flashSuccess('flash.backup.exported');
  } catch (error) {
    console.error('[BACKUP] Export failed:', error);
    flashError('flash.backup.exportError');
  }
}

/** @param {File} file */
export async function importBackup(file) {
  if (!file) {
    flashError('flash.backup.importError');
    return false;
  }

  try {
    const payload = JSON.parse(await file.text());
    const data = parseBackupPayload(payload, getState().data);
    await setState({ data });
    flashSuccess('flash.backup.imported');
    return true;
  } catch (error) {
    console.error('[BACKUP] Import failed:', error);
    flashError('flash.backup.importError');
    return false;
  }
}

export function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
