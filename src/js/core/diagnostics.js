import { VERSION } from './config.js';
import { debug, formatDebugTime } from './debug.js';
import { getSyncBrowserSupport } from './browserCapabilities.js';
import { isLocalImageReference, resolveImageSource } from './localImages.js';
import { getState, getStorageMode, getStorageUsage, getSyncCompatibility, subscribe } from './store.js';

let initialized = false;
let storageTimer;
let startup = null;
let startupReady = Promise.resolve();

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
  const revision = debug.revision;
  await startupReady;
  if (revision !== debug.revision) return;
  const { data, ui } = getState();
  const support = getSyncBrowserSupport();
  const styles = [data.settings.theme, data.settings.bookmarkDefault, ...data.bookmarks,
    ...data.folders, ...data.settings.bookmarkPresets.map(preset => preset.style)];
  const localImages = new Set(styles.map(style => style?.backgroundImageLocal).filter(isLocalImageReference));
  const summary = {
    debugEnabled: debug.enabled,
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
  if (revision !== debug.revision) return;
  const outputOptions = { force: true };
  debug.table(`Información general · v${VERSION}`, {
    'Debug': summary.debugEnabled ? 'Activado' : 'Desactivado',
    'Versión': summary.version,
    'Formato de datos': summary.schemaVersion,
    'Almacenamiento': summary.storageMode === 'sync' ? 'Sync' : 'Local',
    'Sync compatible': summary.syncSupported ? 'Sí' : 'No',
    'Navegador': summary.syncBrowser,
    'Bloqueo de Sync': summary.syncBlock ?? 'Ninguno',
    'Último guardado': summary.lastSave ? formatDebugTime(summary.lastSave) : 'Sin cambios guardados',
    'Favoritos': summary.bookmarks,
    'Carpetas': summary.folders,
    'Workspaces': summary.workspaces,
    'Imágenes locales': `${summary.loadedLocalImages} cargadas / ${summary.localImages} seleccionadas`,
    'Idioma': summary.language,
    'Apariencia': summary.interfaceTheme,
    'Apariencia del navegador': summary.deviceColorScheme,
    'Plataforma': summary.platform,
    'Ventana': summary.viewport
  }, outputOptions);
  debug.table('Almacenamiento · las imágenes se guardan en local', storageRows(usage), outputOptions);
  if (startup) debug.table('Carga inicial de esta pestaña', startup, outputOptions);
  debug.table('Cómo leer los tiempos', {
    Operaciones: 'Preparación + cola + guardado.',
    Render: 'Se mide por separado.',
    Sync: 'Escritura en el navegador; la propagación entre dispositivos se realiza después.'
  }, outputOptions);
  return { summary, storage: usage, startup: startup ? structuredClone(startup) : null };
}

export function initDebugTools() {
  if (initialized) return;
  initialized = true;
  window.SpaceTabDebug = Object.freeze({
    get enabled() { return debug.enabled; },
    toggle() {
      debug.setEnabled(!debug.enabled);
      cancelStorageReport();
      if (debug.enabled) printDebugHelp();
      else debug.info('Debug desactivado', undefined, { force: true, tone: 'muted' });
      return debug.enabled;
    },
    report: () => reportDebugState(),
    history() {
      const records = debug.history();
      if (records.length) {
        debug.table(`Historial · ${records.length} de 100 operaciones`, records.map(({ id, label, status, durationMs, startedAt }) => (
          { '#': id, Hora: formatDebugTime(startedAt), 'Operación': label,
            'Duración': `${durationMs} ms`, Estado: status === 'ok' ? 'OK' : status === 'error' ? 'Error' : 'Sin cambios' }
        )), { force: true });
      } else debug.info('Historial vacío', undefined, { force: true, tone: 'muted' });
      return records;
    },
    clear() {
      cancelStorageReport();
      const result = { cleared: debug.clear(), enabled: debug.enabled };
      debug.info(`Consola e historial limpios · ${result.cleared} operaciones eliminadas`, undefined, { force: true, tone: 'success' });
      return result;
    }
  });
  if (debug.enabled) printDebugHelp();
  else debug.guide('Debug disponible', [
    { command: 'SpaceTabDebug.toggle()', description: 'Activa el modo Debug y consulta los comandos.' }
  ], { force: true, tone: 'muted' });

  subscribe((state, previous) => {
    if (!debug.enabled || !previous || state.ui.persistence.status === 'saving') return;
    if (['bookmarks', 'folders', 'settings'].every(key => state.data[key] === previous.data[key])) return;
    cancelStorageReport();
    const revision = debug.revision;
    storageTimer = setTimeout(async () => {
      storageTimer = undefined;
      const usage = await readStorageUsage();
      if (debug.enabled && revision === debug.revision) debug.table('Almacenamiento actualizado', storageRows(usage));
    }, 400);
  });
}

function printDebugHelp() {
  debug.guide('Debug activado · Comandos', [
    { command: 'SpaceTabDebug.toggle()', description: 'Activar o desactivar el registro en tiempo real.' },
    { command: 'await SpaceTabDebug.report()', description: 'Información general, almacenamiento y carga inicial.' },
    { command: 'SpaceTabDebug.history()', description: 'Últimas 100 operaciones y sus tiempos.' },
    { command: 'SpaceTabDebug.clear()', description: 'Limpiar la consola y el historial.' },
    { command: 'SpaceTabDebug.enabled', description: 'Consultar si Debug está activado.' }
  ], { tone: 'success' });
}

function storageRows(usage) {
  return usage.map(area => area.error ? { 'Almacén': area.mode, Error: area.error } : {
    'Almacén': `${area.mode === 'sync' ? 'Sync' : 'Local'}${area.active ? ' · activo' : ''}`,
    'En uso': `${area.used} / ${area.quota}`,
    Libre: area.available,
    'Ocupación': area.percent
  });
}

function cancelStorageReport() {
  clearTimeout(storageTimer);
  storageTimer = undefined;
}

export function finishDebugStartup(trace, startedAt) {
  startupReady = captureStartup(trace, startedAt);
  return startupReady;
}

// Keep just the initial load metrics even when live operation logging is off.
async function captureStartup(trace, startedAt) {
  const visible = document.visibilityState === 'visible';
  if (visible) await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  trace.mark(visible ? 'Espera al siguiente frame visible' : 'Pestaña en segundo plano');
  const navigation = performance.getEntriesByType('navigation')[0];
  const firstPaint = performance.getEntriesByName('first-contentful-paint')[0];
  const readyAt = performance.now();
  const pendingImages = [...document.images].filter(image => !image.complete).length;
  trace.end({
    sinceNavigationMs: Number(readyAt.toFixed(2)),
    navigationType: navigation?.type ?? 'unknown',
    pendingImages
  });
  startup = {
    'Inicio JS → interfaz lista (ms)': Number((readyAt - startedAt).toFixed(2)),
    'Navegación → interfaz lista (ms)': Number(readyAt.toFixed(2)),
    'Primer contenido pintado (ms)': firstPaint?.startTime ?? 'No disponible',
    'Tipo de navegación': navigation?.type ?? 'No disponible',
    'Imágenes pendientes (sin esperar imágenes remotas)': pendingImages
  };
}
