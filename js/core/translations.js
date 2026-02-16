// js/core/translations.js

export const version = '0.17.6';

/**
 * Translation dictionary.
 *
 * Structure:
 * translations[language][namespace][key] = string
 *
 * Example key:
 *   "flash.bookmark.deleted"
 *
 * Languages must share the same structure to avoid missing keys.
 */
export const translations = {
  es: {
    title: 'Nueva pestaña',
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
      },
      settings: {
        saved: 'Configuración guardada correctamente',
        copied: 'Valor copiado al portapapeles'
      }
    },

    alert: {
      bookmarks: {
        confirmDeleteAll: '¿Eliminar todos los favoritos?',
        no_space: 'No hay espacio disponible para más favoritos 😅',
      },
      bookmark: {
        confirmDelete: 'Eliminar {name}',
        cancel: '¿Descartar los cambios en la edición?'
      },
      settings: {
        reset: '¿Restablecer la configuración de fondo?',
        cancel: '¿Descartar los cambios en la configuración?'
      }
    },

    addModal: {
      title: 'Añadir nuevo favorito',
      name: 'Nombre:',
      url: 'URL:'
    },

    buttons: {
      save: 'Guardar',
      accept: 'Aceptar',
      cancel: 'Cancelar'
    },

    editModal: {
      title: 'Editar Favorito',
      name: 'Nombre:',
      url: 'URL:',
      backgroundImage: 'Imagen de fondo (URL):',
      backgroundFavicon: 'Favicon como background',
      invertColorBg: 'Invertir colores',
      noBackground: 'Sin fondo',
      backgroundColor: 'Color del bookmark:',
      showText: 'Mostrar texto',
      textColor: 'Color del texto:',
      showFavicon: 'Mostrar favicon',
      invertColorIcon: 'Invertir colores',
      sections: {
        general: 'General',
        style: 'Estilo',
        text: 'Texto',
        icon: 'Icon'
      },
      preview: 'Previsualizador'
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
        urlHidden: 'URL oculta',
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
    title: 'New tab',
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
      },
      settings: {
        saved: 'Settings saved successfully',
        copied: 'Value copied to clipboard'
      }
    },

    alert: {
      bookmarks: {
        confirmDeleteAll: 'Delete all bookmarks?',
        no_space: 'No space available for more bookmarks 😅'
      },
      bookmark: {
        confirmDelete: 'Delete {name}',
        cancel: 'Discard edition changes?'
      },
      settings: {
        reset: 'Reset background settings?',
        cancel: 'Discard settings changes?'
      }
    },

    addModal: {
      title: 'Add new bookmark',
      name: 'Name:',
      url: 'URL:'
    },

    buttons: {
      save: 'Save',
      accept: 'Accept',
      cancel: 'Cancel'
    },

    editModal: {
      title: 'Edit Bookmark',
      name: 'Name:',
      url: 'URL:',
      backgroundImage: 'Background image (URL):',
      backgroundFavicon: 'Use favicon as background',
      invertColorBg: 'Invert colors',
      noBackground: 'No background',
      backgroundColor: 'Bookmark color:',
      showText: 'Show text',
      textColor: 'Text color:',
      showFavicon: 'Show favicon',
      invertColorIcon: 'Invert icon colors',
      sections: {
        general: 'General',
        style: 'Style',
        text: 'Text',
        icon: 'Icon'
      },
      preview: 'Preview'
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
        urlHidden: 'URL hidden',
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