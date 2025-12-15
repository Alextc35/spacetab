// js/ui/bookmarks.js

// ======================= Módulo de gestión de bookmarks =======================
import { createBookmark, addBookmark, getBookmarks, deleteBookmark } from '../core/bookmark.js';
import { pxToGrid, gridToPx, isAreaFree } from '../core/grid.js';
import { openModal } from './bookmarksEditModal.js';
import { addDragAndResize } from './dragResize.js';
import { GRID_SIZE } from '../core/config.js';

// ======================= Variables globales =======================
export const container = document.getElementById('bookmark-container'); // Contenedor de bookmarks
let editMode = false; // Modo edición (drag, resize, editar, borrar)

export function setEditMode(value) {
    editMode = value;
}

/**
 * Añade un nuevo bookmark al grid.
 *
 * La función solicita al usuario el nombre y la URL del bookmark,
 * calcula el tamaño del contenedor y busca la primera posición libre
 * en la cuadrícula siguiendo un orden por columnas:
 *  - rellena primero el eje Y (de arriba hacia abajo)
 *  - cuando no queda espacio, pasa a la siguiente columna en el eje X
 *
 * Una vez encontrada una posición válida, crea el bookmark con
 * tamaño 1x1 por defecto, lo guarda en el storage y vuelve a renderizar
 * todos los bookmarks para reflejar el cambio en pantalla.
 */
export async function handleAddBookmark() {
    const bookmarks = getBookmarks();

    // TODO: Mejorar UI para añadir bookmark (formulario en modal)
    const name = prompt("Nombre del favorito:");
    if (!name) return;
    const url = prompt("URL del favorito (incluye https://):");
    if (!url) return;

    const rect = container.getBoundingClientRect();
    const maxGy = pxToGrid(rect.height - GRID_SIZE);

    let gx = 0;
    let gy = 0;
    while (!isAreaFree(bookmarks, gx, gy)) {
        gy++;
        if (gy > maxGy) {
            gy = 0;
            gx++;
        }
    }

    const newBookmark = createBookmark({ name, url, x: gridToPx(gx), y: gridToPx(gy)});
    await addBookmark(newBookmark);
    
    renderBookmarks();
}

/**
 * Renderiza todos los bookmarks en el contenedor principal.
 *
 * La función:
 * - Obtiene la lista actual de bookmarks desde el storage
 * - Limpia el contenedor para evitar duplicados
 * - Recorre cada bookmark y:
 *   - asegura valores mínimos de tamaño (w, h)
 *   - crea el elemento DOM correspondiente
 *   - aplica estilos visuales (fondo, colores, inversión, etc.)
 *   - calcula y asigna su posición y tamaño en la cuadrícula
 *   - inserta el contenido interno (favicon, texto)
 *   - añade botones de edición y drag/resize si el modo edición está activo
 *   - gestiona el comportamiento de click (abrir enlace o editar)
 *
 * El resultado es una representación visual sincronizada del estado
 * actual de los bookmarks en pantalla.
 */
export function renderBookmarks() {
    const bookmarks = getBookmarks();
    container.innerHTML = '';
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    bookmarks.forEach((bookmark, index) => {
        bookmark.w ||= 1;
        bookmark.h ||= 1;

        const div = document.createElement('div');
        div.className = 'bookmark';
        div.classList.toggle('is-editing', editMode);

        applyBookmarkStyle(div, bookmark);

        const gx = pxToGrid(bookmark.x ?? 0);
        const gy = pxToGrid(bookmark.y ?? 0);
        div.style.setProperty('--x', gridToPx(gx) + 'px');
        div.style.setProperty('--y', gridToPx(gy) + 'px');
        div.style.setProperty('--w', gridToPx(bookmark.w) - 10 + 'px');
        div.style.setProperty('--h', gridToPx(bookmark.h) - 10 + 'px');

        const linkEl = createBookmarkContent(bookmark);
        div.appendChild(linkEl);

        if (editMode) {
            addEditButtons(div, bookmark, index);
            addDragAndResize(div, bookmark, index, containerWidth, containerHeight);
        }

        div.addEventListener('click', (e) => {
            if (!editMode && !e.target.classList.contains('edit') && !e.target.classList.contains('delete')) {
                if (e.ctrlKey || e.metaKey || e.button === 1) window.open(bookmark.url, '_blank');
                else window.location.href = bookmark.url;
            }
        });

        container.appendChild(div);
    });
}

// ======================= Helpers visuales =======================
function applyBookmarkStyle(div, bookmark) {
  // reset de estados
  div.classList.remove(
    'is-favicon-bg',
    'has-bg-image'
  );

  // fondo por favicon
  if (bookmark.faviconBackground) {
    div.classList.add('is-favicon-bg');
  }

  // fondo por imagen
  if (bookmark.backgroundImageUrl && !bookmark.faviconBackground) {
    div.classList.add('has-bg-image');
    div.style.setProperty('--bookmark-bg-image', `url(${bookmark.backgroundImageUrl})`);

    // Clase extra si quieres invertir solo la imagen
    if (bookmark.invertColorBg) {
      div.classList.add('invert-bg-image');
    } else {
      div.classList.remove('invert-bg-image');
    }
  } else {
    div.classList.remove('has-bg-image', 'invert-bg-image');
    div.style.removeProperty('--bookmark-bg-image');
  }

  // colores
  div.style.setProperty(
    '--bookmark-bg',
    bookmark.bookmarkColor === 'transparent'
      ? 'transparent'
      : (bookmark.bookmarkColor || '#222')
  );

  div.style.setProperty(
    '--bookmark-text',
    bookmark.textColor || '#fff'
  );

  // inversión
  div.classList.toggle('invert-bg', bookmark.invertColorBg);
}

function createBookmarkContent(bookmark) {
  const linkEl = document.createElement('a');
  linkEl.href = bookmark.url || '#';
  linkEl.className = 'bookmark-link';
  linkEl.style.color = bookmark.textColor || '#fff';

  if (editMode) linkEl.classList.add('is-editing');

  // Caso: favicon como fondo
  if (bookmark.faviconBackground) {
    appendMainIcon(linkEl, bookmark);
    if (bookmark.showText) {
      linkEl.appendChild(createTextSpan(bookmark));
    }
    return linkEl;
  }

  // Caso normal (info abajo a la derecha)
  const infoBox = document.createElement('div');
  infoBox.className = 'bookmark-info';

  if (bookmark.showFavicon ?? true) {
    infoBox.appendChild(createSmallIcon(bookmark));
  }

  if (bookmark.showText ?? true) {
    infoBox.appendChild(createTextSpan(bookmark));
  }

  linkEl.appendChild(infoBox);
  return linkEl;
}

function appendMainIcon(container, bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  container.appendChild(img);
}

function createSmallIcon(bookmark) {
  const img = createFavicon(bookmark);
  img.alt = bookmark.name || '';
  img.style.width = '16px';
  img.style.height = '16px';
  if (bookmark.invertColorIcon) img.style.filter = 'invert(1)';
  return img;
}

function createTextSpan(bookmark) {
  const span = document.createElement('span');
  span.textContent = bookmark.name || '';
  span.style.color = bookmark.textColor || '#fff';
  return span;
}

function createFavicon(bookmark) {
  const img = document.createElement('img');
  img.className = 'bookmark-favicon';

  let isInternal = false;
  try {
    const urlObj = new URL(bookmark.url);
    isInternal = urlObj.hostname.endsWith('.internal') || urlObj.hostname.endsWith('.local');
    if (!isInternal) {
      img.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(urlObj.origin)}&size=64`;
      img.onerror = () => {
        img.onerror = null;
        img.src = generateInitialsCanvas(bookmark.name);
      };
    }
  } catch {
    img.src = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
  }

  if (isInternal) {
    img.src = generateInitialsCanvas(bookmark.name);
  }

  return img;
}

// Genera un canvas con las iniciales del nombre
function generateInitialsCanvas(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = (name || '?').slice(0, 2).toUpperCase();
  ctx.fillText(initials, 32, 32);

  return canvas.toDataURL();
}

function addEditButtons(div, bookmark, index) {
    const darkBg = isDarkColor(bookmark.bookmarkColor || '#222');
    const bookmarks = getBookmarks();
    const editBtn = document.createElement('button');
    const delBtn = document.createElement('button');
    editBtn.className = 'edit';
    delBtn.className = 'delete';
    editBtn.textContent = '✎';
    delBtn.textContent = '🗑';
    editBtn.style.background = darkBg ? '#fff' : '#222';
    editBtn.style.color = darkBg ? '#000' : '#fff';
    delBtn.style.background = darkBg ? '#fff' : '#222';
    delBtn.style.color = darkBg ? '#000' : '#fff';

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(bookmarks, index);
    });

    delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar ${bookmark.name}?`)) {
            await deleteBookmark(index);
            renderBookmarks();
        }
    });

    [editBtn, delBtn].forEach(btn => {
        btn.style.position = 'absolute';
        btn.style.top = '5px';
        btn.style.width = '25px';
        btn.style.height = '25px';
        btn.style.borderRadius = '5px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
    });
    editBtn.style.right = '35px';
    delBtn.style.right = '5px';
    div.appendChild(editBtn);
    div.appendChild(delBtn);
}

function isDarkColor(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 64;
}