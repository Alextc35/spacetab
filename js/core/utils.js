// core/utilis.js

// obtiene el favicon de una URL
export function getFavicon(url) {
    try {
        const u = new URL(url);
        return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(u.origin)}&size=64`;
    } catch {
        return 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
    }
}