const API_BASE = '/api';
const SESSION_KEY = 'tabletime-lab2-session';

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

export function getSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY));
    return value?.token ? value : null;
  } catch { return null; }
}
export function saveSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }

export async function api(path, options = {}) {
  const { auth = false, body, headers = {}, ...rest } = options;
  const session = getSession();
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  }).catch(() => { throw new ApiError('Не удалось связаться с учебным API. Проверьте, что выполнена команда npm run dev.', 0); });
  const raw = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && auth) clearSession();
    throw new ApiError(raw?.error || `Ошибка HTTP ${response.status}.`, response.status);
  }
  return raw;
}

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } }),
  me: () => api('/auth/me', { auth: true }),
  update: (name) => api('/auth/me', { method: 'PATCH', auth: true, body: { name } })
};

export const bookingApi = {
  list: () => api('/bookings', { auth: true }),
  create: (payload) => api('/bookings', { method: 'POST', auth: true, body: payload }),
  update: (id, payload) => api(`/bookings/${encodeURIComponent(id)}`, { method: 'PATCH', auth: true, body: payload }),
  remove: (id) => api(`/bookings/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true })
};
