/**
 * Centralized API URL configuration.
 * 
 * In production, VITE_API_URL is set at build time (e.g. https://maansarathi-backend.onrender.com/api).
 * In development, dynamically resolves based on the browser's hostname so LAN
 * access from mobile devices also works.
 */

const PROD_BACKEND_ORIGIN = 'https://maansarathi-backend.onrender.com';

const toApiBase = (origin: string): string => `${origin.replace(/\/+$/, '')}/api`;

const resolveConfiguredOrigin = (): string | null => {
    const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (!configured) {
        return null;
    }

    // Accept env values with or without /api and normalize to an origin.
    const withScheme = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;

    try {
        const parsed = new URL(withScheme.replace(/\/api\/?$/i, ''));

        if (import.meta.env.PROD) {
            if (parsed.protocol !== 'https:') {
                console.warn('[apiConfig] VITE_API_URL used non-https protocol in production; forcing https.');
                parsed.protocol = 'https:';
            }

            // A frontend-hosted API URL is almost always a deployment misconfiguration.
            if (typeof window !== 'undefined' && parsed.hostname === window.location.hostname) {
                console.warn('[apiConfig] VITE_API_URL points to current frontend host in production; using backend fallback.');
                return null;
            }
        }

        return parsed.origin;
    } catch {
        console.warn('[apiConfig] Invalid VITE_API_URL; using fallback.');
        return null;
    }
};

const resolveServerOrigin = (): string => {
    const configuredOrigin = resolveConfiguredOrigin();
    if (configuredOrigin) {
        return configuredOrigin;
    }

    if (import.meta.env.PROD) {
        return PROD_BACKEND_ORIGIN;
    }

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    return `http://${hostname}:5000`;
};

/** Returns the API base URL with /api suffix, e.g. https://maansarathi-backend.onrender.com/api */
export const getApiBaseUrl = (): string => {
    return toApiBase(resolveServerOrigin());
};

/** Returns just the server origin, e.g. https://maansarathi-backend.onrender.com */
export const getServerBaseUrl = (): string => {
    return resolveServerOrigin();
};

/** Returns the WebSocket base URL, e.g. wss://maansarathi-backend.onrender.com */
export const getWsBaseUrl = (): string => {
    return resolveServerOrigin().replace(/^http/, 'ws');
};
