/**
 * Centralized API URL configuration.
 * 
 * In production, VITE_API_URL is set at build time (e.g. https://maansarathi-backend.onrender.com/api).
 * In development, dynamically resolves based on the browser's hostname so LAN
 * access from mobile devices also works.
 */

/** Returns the API base URL with /api suffix, e.g. https://maansarathi-backend.onrender.com/api */
export const getApiBaseUrl = (): string => {
    // Production: always use the env-var set at build time
    const raw = (import.meta.env.VITE_API_URL as string).trim();
    if (raw) {
        const normalized = raw.replace(/\/+$/, '');
        return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
    }
    // Production fallback: use Render backend when env-var not set
    if (import.meta.env.PROD) {
        return 'https://maansarathi-backend.onrender.com/api';
    }
    // Development: dynamic hostname detection
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    return `http://${hostname}:5000/api`;
};

/** Returns just the server origin, e.g. https://maansarathi-backend.onrender.com */
export const getServerBaseUrl = (): string => {
    // Production: derive from VITE_API_URL by stripping /api
    const raw = (import.meta.env.VITE_API_URL as string).trim();
    if (raw) {
        return raw.replace(/\/api\/?$/, '');
    }
    // Production fallback: use Render backend when env-var not set
    if (import.meta.env.PROD) {
        return 'https://maansarathi-backend.onrender.com';
    }
    // Development: dynamic hostname detection
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    return `http://${hostname}:5000`;
};

/** Returns the WebSocket base URL, e.g. wss://maansarathi-backend.onrender.com */
export const getWsBaseUrl = (): string => {
    const raw = (import.meta.env.VITE_API_URL as string).trim();
    if (raw) {
        return raw.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
    }
    // Production fallback: use Render backend when env-var not set
    if (import.meta.env.PROD) {
        return 'wss://maansarathi-backend.onrender.com';
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:5000';
    }
    return `ws://${hostname}:5000`;
};
