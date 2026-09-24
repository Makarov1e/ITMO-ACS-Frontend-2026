import { computed, reactive } from 'vue';
import { authApi, forgetSession, loadStoredSession, persistSession } from './useApi';
const saved = loadStoredSession();
const state = reactive({ session: saved, loading: false, initialized: false });
const user = computed(() => state.session?.user || null);
const isAuthenticated = computed(() => Boolean(state.session?.token));
async function establish(session) { persistSession(session); state.session = session; return session.user; }
async function restore() { if (state.initialized) return state.session; state.initialized = true; if (!state.session) return null; state.loading = true; try { const result = await authApi.me(); state.session = { ...state.session, user: result.user }; persistSession(state.session); return state.session; } catch { forgetSession(); state.session = null; return null; } finally { state.loading = false; } }
async function login(email, password) { return establish(await authApi.login(email, password)); }
async function register(name, email, password) { return establish(await authApi.register(name, email, password)); }
async function updateProfile(name) { const result = await authApi.update(name); state.session = { ...state.session, user: result.user }; persistSession(state.session); return result.user; }
function logout() { forgetSession(); state.session = null; }
export function useSession() { return { state, user, isAuthenticated, restore, login, register, updateProfile, logout }; }
