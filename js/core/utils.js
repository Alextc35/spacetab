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

// determina si un color hexadecimal es oscuro
export function isDarkColor(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 64;
}