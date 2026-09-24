import axios from 'axios';
const SESSION_KEY = 'tabletime-lab3-session';
export class ApiError extends Error { constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; } }
export const loadStoredSession = () => { try { const value = JSON.parse(localStorage.getItem(SESSION_KEY)); return value?.token && value?.user ? value : null; } catch { return null; } };
export const persistSession = (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
export const forgetSession = () => localStorage.removeItem(SESSION_KEY);
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api', headers: { Accept: 'application/json' }, timeout: 9000 });
client.interceptors.request.use((config) => { const session = loadStoredSession(); if (config.auth && session?.token) config.headers.Authorization = `Bearer ${session.token}`; delete config.auth; return config; });
client.interceptors.response.use((response) => response.data, (error) => { const status = error.response?.status || 0; if (status === 401) forgetSession(); const message = error.response?.data?.error || (status ? `Ошибка HTTP ${status}.` : 'Не удалось связаться с учебным API. Проверьте npm run dev.'); return Promise.reject(new ApiError(message, status)); });
export const authApi = { login: (email, password) => client.post('/auth/login', { email, password }), register: (name, email, password) => client.post('/auth/register', { name, email, password }), me: () => client.get('/auth/me', { auth: true }), update: (name) => client.patch('/auth/me', { name }, { auth: true }) };
export const restaurantApi = { list: () => client.get('/restaurants'), one: (id) => client.get(`/restaurants/${encodeURIComponent(id)}`), menu: (id) => client.get('/menus', { params: { restaurantId: id } }), reviews: (id) => client.get('/reviews', { params: { restaurantId: id } }) };
export const bookingApi = { list: () => client.get('/bookings', { auth: true }), create: (data) => client.post('/bookings', data, { auth: true }), update: (id, data) => client.patch(`/bookings/${encodeURIComponent(id)}`, data, { auth: true }), remove: (id) => client.delete(`/bookings/${encodeURIComponent(id)}`, { auth: true }) };
