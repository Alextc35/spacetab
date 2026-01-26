import { SETTINGS } from './config.js';

const version = '0.13.6';

const translations = {
  es: {
    flash: {
      editMode: {
        enabled: 'Modo edición activado',
        disabled: 'Modo edición desactivado'
      },
      bookmark: {
        added: 'Favorito añadido correctamente',
        deleted: 'Favorito eliminado correctamente',
        deleteError: 'Error al eliminar el favorito',
        notFound: 'Favorito no encontrado',
        updated: 'Favorito actualizado correctamente'
      },
      bookmarks: {
        deletedAll: 'Todos los favoritos eliminados correctamente',
        deleteAllError: 'Error al eliminar los bookmarks',
        exported: 'Favoritos exportados correctamente',
        exportError: 'Error al exportar los favoritos',
        imported: 'Favoritos importados correctamente',
        importError: 'Error al importar los favoritos'
      }
    },

    buttons: {
      save: 'Guardar',
      cancel: 'Cancelar',
      add: '➕',
      edit: '✎',
      settings: '⚙️'
    },

    editModal: {
      title: 'Editar Favorito',
      name: 'Nombre:',
      url: 'URL:',
      backgroundImage: 'Imagen de fondo (URL):',
      faviconBackground: 'Favicon como background',
      invertColorBg: 'Invertir colores',
      noBackground: 'Sin fondo',
      bookmarkColor: 'Color del bookmark:',
      showText: 'Mostrar texto',
      textColor: 'Color del texto:',
      showFavicon: 'Mostrar favicon',
      invertColorIcon: 'Invertir colores',
      sections: {
        general: 'General',
        background: 'Fondo',
        text: 'Texto'
      }
    },

    settingsModal: {
      sections: {
        general: '⚙️ General',
        language: '🌐 Idiomas',
        information: 'ℹ️ Información'
      },
      general: {
        title: 'General',
        subtitle: 'Fondo de la página',
        backgroundColor: 'Color:',
        backgroundImage: 'Imagen URL:',
        resetBackground: 'Restablecer',
        export: 'Exportar',
        import: 'Importar',
        deleteAll: 'Borrar todos los Bookmarks'
      },
      languages: {
        title: 'Idiomas',
        text: 'Selecciona el idioma de la interfaz:'
      },
      information: {
        title: 'Información',
        version: 'Versión: ' + version + ' - alfa',
        author: 'Autor: @alextc35'
      }
    }
  },

  en: {
    flash: {
      editMode: {
        enabled: 'Edit mode enabled',
        disabled: 'Edit mode disabled'
      },
      bookmark: {
        added: 'Bookmark added successfully',
        deleted: 'Bookmark deleted successfully',
        deleteError: 'Failed to delete bookmark',
        notFound: 'Bookmark not found',
        updated: 'Bookmark updated successfully'
      },
      bookmarks: {
        deletedAll: 'All bookmarks deleted successfully',
        deleteAllError: 'Failed to delete all bookmarks',
        exported: 'Bookmarks exported successfully',
        exportError: 'Failed to export bookmarks',
        imported: 'Bookmarks imported successfully',
        importError: 'Failed to import bookmarks'
      }
    },

    buttons: {
      save: 'Save',
      cancel: 'Cancel',
      add: '➕',
      edit: '✎',
      settings: '⚙️'
    },

    editModal: {
      title: 'Edit Bookmark',
      name: 'Name:',
      url: 'URL:',
      backgroundImage: 'Background image (URL):',
      faviconBackground: 'Use favicon as background',
      invertColorBg: 'Invert colors',
      noBackground: 'No background',
      bookmarkColor: 'Bookmark color:',
      showText: 'Show text',
      textColor: 'Text color:',
      showFavicon: 'Show favicon',
      invertColorIcon: 'Invert icon colors',
      sections: {
        general: 'General',
        background: 'Background',
        text: 'Text'
      }
    },

    settingsModal: {
      sections: {
        general: '⚙️ General',
        language: '🌐 Languages',
        information: 'ℹ️ Information'
      },
      general: {
        title: 'General',
        subtitle: 'Page background',
        backgroundColor: 'Color:',
        backgroundImage: 'Image URL:',
        resetBackground: 'Reset',
        export: 'Export',
        import: 'Import',
        deleteAll: 'Delete all bookmarks'
      },
      languages: {
        title: 'Languages',
        text: 'Select interface language:'
      },
      information: {
        title: 'Information',
        version: 'Version: ' + version + ' - alpha',
        author: 'Author: @alextc35'
      }
    }
  }
};

/* ========================================================= */

export function applyI18n(root = document) {
  const elements = root.querySelectorAll('[data-i18n]');

  elements.forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key);

    // Inputs y placeholders
    if (el.placeholder !== undefined && el.tagName === 'INPUT') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
}

export function t(key) {
  const lang = SETTINGS.language || 'es';
  const parts = key.split('.');
  let value = translations[lang];

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return key; // fallback visible
  }

  return value;
}