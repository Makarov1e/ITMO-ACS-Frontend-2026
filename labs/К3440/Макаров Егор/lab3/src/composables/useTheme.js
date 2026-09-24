import { onBeforeUnmount, onMounted, ref } from 'vue';
const KEY = 'tabletime.theme'; const choices = ['system', 'light', 'dark'];
const preference = ref('system'); const media = window.matchMedia('(prefers-color-scheme: dark)');
function apply() { const theme = preference.value === 'system' ? (media.matches ? 'dark' : 'light') : preference.value; document.documentElement.dataset.theme = theme; document.documentElement.dataset.themePreference = preference.value; document.documentElement.style.colorScheme = theme; return theme; }
function setTheme(value) { preference.value = choices.includes(value) ? value : 'system'; try { localStorage.setItem(KEY, preference.value); } catch {} return apply(); }
export function useTheme() { const systemChanged = () => { if (preference.value === 'system') apply(); }; onMounted(() => { try { preference.value = choices.includes(localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'system'; } catch {} apply(); media.addEventListener('change', systemChanged); }); onBeforeUnmount(() => media.removeEventListener('change', systemChanged)); return { preference, setTheme }; }
