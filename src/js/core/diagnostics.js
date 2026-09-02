import { VERSION } from './config.js';
import { debug } from './debug.js';
import { getSyncBrowserSupport } from './browserCapabilities.js';
import { isLocalImageReference, resolveImageSource } from './localImages.js';
import { getState, getStorageMode, getStorageUsage, getSyncCompatibility, subscribe } from './store.js';

let initialized = false;
let storageTimer;
let startup = null;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'No disponible';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

async function readStorageUsage() {
  const modes = ['local', 'sync'];
  const results = await Promise.allSettled(modes.map(mode => getStorageUsage(mode)));
  return results.map((result, index) => {
    const mode = modes[index];
    if (result.status === 'rejected') return { mode, error: result.reason?.message || 'No disponible' };
    const { usedBytes, quotaBytes, availableBytes } = result.value;
    return {
      mode, active: mode === getStorageMode(), usedBytes, quotaBytes,
      used: formatBytes(usedBytes), available: formatBytes(availableBytes),
      quota: formatBytes(quotaBytes),
      percent: quotaBytes > 0 ? `${(usedBytes / quotaBytes * 100).toFixed(2)}%` : 'No disponible'
    };
  });
}

/** Reads a fresh snapshot on demand; it never writes user settings. */
export async function reportDebugState() {
  if (!debug.enabled) return;
  const { data, ui } = getState();
  const support = getSyncBrowserSupport();
  const styles = [data.settings.theme, data.settings.bookmarkDefault, ...data.bookmarks,
    ...data.folders, ...data.settings.bookmarkPresets.map(preset => preset.style)];
  const localImages = new Set(styles.map(style => style?.backgroundImageLocal).filter(isLocalImageReference));
  const summary = {
    version: VERSION,
    schemaVersion: data.schemaVersion,
    storageMode: getStorageMode(),
    syncEnabled: getStorageMode() === 'sync',
    syncSupported: support.canSync,
    syncBrowser: support.browser,
    syncBlock: getSyncCompatibility(),
    lastSave: ui.persistence.updatedAt ? new Date(ui.persistence.updatedAt).toISOString() : null,
    bookmarks: data.bookmarks.length,
    folders: data.folders.length,
    workspaces: data.settings.bookmarkGroups.length + 1,
    localImages: localImages.size,
    loadedLocalImages: [...localImages].filter(reference => resolveImageSource(reference)).length,
    language: `${data.settings.language} → ${document.documentElement.lang}`,
    interfaceTheme: data.settings.interfaceTheme,
    deviceColorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    platform: navigator.userAgentData?.platform || navigator.platform,
    viewport: `${innerWidth} × ${innerHeight} @${devicePixelRatio}`
  };
  const usage = await readStorageUsage();
  debug.table(`Información general · v${VERSION}`, summary);
  debug.table('Almacenamiento (local incluye las imágenes de este dispositivo)', usage);
  if (startup) debug.table('Carga inicial de esta pestaña', startup);
  debug.info('Los tiempos de operaciones incluyen preparación, cola y escritura. El render se mide aparte. Sync mide la escritura del navegador, no su propagación a otros dispositivos.');
  return { summary, storage: usage, startup: startup ? structuredClone(startup) : null };
}

export function initDebugTools() {
  if (!debug.enabled || initialized) return;
  initialized = true;
  window.SpaceTabDebug = Object.freeze({
    report: reportDebugState,
    history() {
      const records = debug.history();
      debug.table('Últimas operaciones (máximo 100)', records.map(({ id, label, status, durationMs }) => (
        { id, operation: label, status, durationMs }
      )));
      return records;
    },
    clear() { debug.clear(); }
  });
  debug.info('Activado · SpaceTabDebug.report() · SpaceTabDebug.history() · SpaceTabDebug.clear()');

  subscribe((state, previous) => {
    if (!previous || state.ui.persistence.status === 'saving') return;
    if (['bookmarks', 'folders', 'settings'].every(key => state.data[key] === previous.data[key])) return;
    if (storageTimer) clearTimeout(storageTimer);
    storageTimer = setTimeout(async () => {
      debug.table('Almacenamiento actualizado', await readStorageUsage());
    }, 400);
  });
}

export async function finishDebugStartup(trace) {
  if (!debug.enabled) return;
  const visible = document.visibilityState === 'visible';
  if (visible) await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  trace.mark(visible ? 'Espera al siguiente frame visible' : 'Pestaña en segundo plano');
  const navigation = performance.getEntriesByType('navigation')[0];
  const firstPaint = performance.getEntriesByName('first-contentful-paint')[0];
  const initial = trace.end({
    sinceNavigationMs: Number(performance.now().toFixed(2)),
    navigationType: navigation?.type ?? 'unknown',
    pendingImages: [...document.images].filter(image => !image.complete).length
  });
  startup = {
    'Inicio JS → interfaz lista (ms)': initial.durationMs,
    'Navegación → interfaz lista (ms)': initial.details.sinceNavigationMs,
    'Primer contenido pintado (ms)': firstPaint?.startTime ?? 'No disponible',
    'Tipo de navegación': navigation?.type ?? 'No disponible',
    'Imágenes pendientes (sin esperar imágenes remotas)': [...document.images].filter(image => !image.complete).length
  };
  await reportDebugState();
}
