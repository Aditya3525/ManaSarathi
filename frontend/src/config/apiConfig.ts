/**
 * Centralized API URL configuration.
 * Dynamically resolves to the correct backend URL based on the browser's hostname.
 * When accessed via localhost, uses localhost for API calls.
 * When accessed via a LAN IP (e.g. from a mobile device), uses that same IP.
 */

/** Returns the API base URL with /api suffix, e.g. http://192.168.1.5:5000/api */
export const getApiBaseUrl = (): string => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    return `http://${hostname}:5000/api`;
};

/** Returns just the server origin, e.g. http://192.168.1.5:5000 */
export const getServerBaseUrl = (): string => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    return `http://${hostname}:5000`;
};

/** Returns the WebSocket base URL, e.g. ws://192.168.1.5:5000 */
export const getWsBaseUrl = (): string => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:5000';
    }
    return `ws://${hostname}:5000`;
};
