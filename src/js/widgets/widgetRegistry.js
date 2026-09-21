import { gridItemRegistry } from '../shared/grid/gridItemRegistry.js';
import { isWidgetType } from './widgetModel.js';

const RESERVED_GRID_ITEM_TYPES = new Set(['bookmark', 'folder', 'recycle-bin']);

/**
 * Adapts bundled widgets to the generic grid-item protocol. The registry owns
 * common selection and DOM identity so an individual widget only supplies its
 * renderer and optional editing behavior.
 */
export function createWidgetRegistry(itemRegistry = gridItemRegistry) {
  const definitions = new Map();

  return Object.freeze({
    register(definition) {
      const widget = validateDefinition(definition);
      if (definitions.has(widget.type)) {
        throw new Error(`Widget type is already registered: ${widget.type}`);
      }

      itemRegistry.register(createGridItemAdapter(widget));
      definitions.set(widget.type, widget);
      return widget;
    },

    has(type) {
      return definitions.has(type);
    },

    get(type) {
      return definitions.get(type) ?? null;
    },

    types() {
      return [...definitions.keys()];
    }
  });
}

export const widgetRegistry = createWidgetRegistry();

/** Registers one statically bundled widget with the application registry. */
export function registerWidget(definition) {
  return widgetRegistry.register(definition);
}

function validateDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('Widget definition must be an object.');
  }
  if (!isWidgetType(definition.type)) {
    throw new TypeError('Widget type must be a lowercase kebab-case identifier.');
  }
  if (RESERVED_GRID_ITEM_TYPES.has(definition.type)) {
    throw new TypeError(`Widget type is reserved by SpaceTab: ${definition.type}`);
  }
  if (typeof definition.render !== 'function') {
    throw new TypeError('Widget definition requires render().');
  }
  if (definition.enableEditing !== undefined && typeof definition.enableEditing !== 'function') {
    throw new TypeError('Widget enableEditing must be a function.');
  }

  return Object.freeze({
    ...definition,
    order: Object.freeze({
      grid: Number.isFinite(definition.order?.grid) ? definition.order.grid : 40,
      list: Number.isFinite(definition.order?.list) ? definition.order.list : 40
    })
  });
}

function createGridItemAdapter(widget) {
  const adapter = {
    type: widget.type,
    order: widget.order,
    selector: `[data-widget-type="${widget.type}"][data-widget-id]`,
    getElementId: element => element.dataset.widgetId,
    select(state) {
      const activeWorkspaceId = state.data.settings?.activeBookmarkGroupId ?? null;
      return (state.data.widgets ?? []).filter(instance => (
        instance.type === widget.type
        && (instance.groupId ?? null) === activeWorkspaceId
      ));
    },
    render(context) {
      const element = widget.render({
        ...context,
        widget: context.item,
        config: context.item.config
      });
      if (!element?.dataset) {
        throw new TypeError(`Widget renderer must return a DOM element: ${widget.type}`);
      }
      element.dataset.widgetId = context.item.id;
      element.dataset.widgetType = widget.type;
      return element;
    }
  };

  if (widget.enableEditing) {
    adapter.enableEditing = (container, element, item, entry) => (
      widget.enableEditing(container, element, item, {
        ...entry,
        widget: item,
        config: item.config
      })
    );
  }

  return adapter;
}
