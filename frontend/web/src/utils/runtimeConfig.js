const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim();

function normalizeApiBaseUrl(value) {
  if (!value) return '/api';
  if (value === '/api') return '/api';
  return value.replace(/\/$/, '');
}

function inferSocketUrlFromApi(apiBaseUrl) {
  if (!apiBaseUrl || apiBaseUrl === '/api') return undefined;
  return apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
}

export const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || inferSocketUrlFromApi(API_BASE_URL) || '').trim() || undefined;

export function toAbsoluteAssetUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;

  const base = SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return url;

  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
}
