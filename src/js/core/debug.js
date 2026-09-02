import { DEBUG } from './config.js';

const PREFIX = '[SpaceTab Debug]';
const NO_TRACE = Object.freeze({ id: null, mark() {}, end() {} });

/** Small, bounded console profiler. Each operation owns its clock and phases. */
export function createDebugger({
  enabled = false,
  now = () => performance.now(),
  output = console,
  limit = 100
} = {}) {
  const records = [];
  let sequence = 0;

  function start(label, details = {}) {
    if (!enabled) return NO_TRACE;
    const id = ++sequence;
    const started = now();
    const startedAt = new Date().toISOString();
    const phases = [];
    let previous = started;
    let finished = false;

    return {
      id,
      mark(phase) {
        if (finished) return;
        const current = now();
        phases.push({ phase, durationMs: round(current - previous) });
        previous = current;
      },
      end({ status = 'ok', ...extra } = {}) {
        if (finished) return;
        finished = true;
        const record = {
          id, label, status, startedAt,
          durationMs: round(now() - started),
          phases,
          details: { ...details, ...extra }
        };
        records.push(structuredClone(record));
        if (records.length > limit) records.shift();
        // Open and close groups together: concurrent async operations cannot nest them.
        output.groupCollapsed(`${PREFIX} #${id} ${label} · ${record.durationMs} ms · ${status}`);
        if (Object.keys(record.details).length) output.table(record.details);
        if (phases.length) output.table(phases);
        output.groupEnd();
        return structuredClone(record);
      }
    };
  }

  return {
    enabled,
    start,
    info(label, details = {}) {
      if (enabled) output.info(`${PREFIX} ${label}`, details);
    },
    table(label, rows) {
      if (!enabled) return;
      output.groupCollapsed(`${PREFIX} ${label}`);
      output.table(rows);
      output.groupEnd();
    },
    history() { return structuredClone(records); },
    clear() { records.length = 0; }
  };
}

function round(value) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export const debug = createDebugger({ enabled: DEBUG });

/** Describes unlabelled changes without retaining bookmark contents or images. */
export function describeStateChange(partial, previous) {
  const data = partial.data;
  if (!data) return 'Cambiar estado de la interfaz';
  const groups = data.settings?.bookmarkGroups;
  if (groups && groups.length !== previous.settings.bookmarkGroups.length) {
    return groups.length > previous.settings.bookmarkGroups.length
      ? 'Crear workspace' : 'Eliminar workspace';
  }
  if (data.folders && data.folders.length !== previous.folders.length) {
    return data.folders.length > previous.folders.length ? 'Crear carpeta' : 'Eliminar carpeta';
  }
  if (data.bookmarks && data.bookmarks.length !== previous.bookmarks.length) {
    return data.bookmarks.length > previous.bookmarks.length ? 'Añadir favoritos' : 'Eliminar favoritos';
  }
  if (data.settings) {
    return data.settings.activeBookmarkGroupId !== previous.settings.activeBookmarkGroupId
      ? 'Cambiar workspace' : 'Guardar ajustes';
  }
  return data.folders ? 'Actualizar carpetas / grid' : 'Actualizar favoritos / grid';
}
