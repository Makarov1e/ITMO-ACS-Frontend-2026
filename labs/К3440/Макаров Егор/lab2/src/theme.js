export const THEME_STORAGE_KEY = 'tabletime.theme';
export const THEME_OPTIONS = ['system', 'light', 'dark'];

const labels = {
  system: 'Системная тема',
  light: 'Светлая тема',
  dark: 'Тёмная тема'
};

function safeRead(storage) {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function safeWrite(storage, value) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Настройка остаётся активной до конца текущей вкладки, если хранилище запрещено.
  }
}

function effectiveTheme(preference, mediaQuery) {
  return preference === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : preference;
}

export function createThemeController({
  root = document.documentElement,
  storage = window.localStorage,
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
} = {}) {
  let preference = safeRead(storage);
  const apply = () => {
    const resolved = effectiveTheme(preference, mediaQuery);
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
    return resolved;
  };

  const setPreference = (nextPreference) => {
    preference = THEME_OPTIONS.includes(nextPreference) ? nextPreference : 'system';
    safeWrite(storage, preference);
    return apply();
  };

  const renderControl = (container) => {
    if (!container) return;
    container.innerHTML = `<fieldset class="theme-switcher" aria-describedby="themeStatus"><legend class="visually-hidden">Оформление</legend>${THEME_OPTIONS.map((option) => `<input class="theme-switcher__input" type="radio" name="theme" value="${option}" id="theme-${option}"${option === preference ? ' checked' : ''}><label class="theme-switcher__label" for="theme-${option}">${option === 'system' ? 'Система' : option === 'light' ? 'Светлая' : 'Тёмная'}</label>`).join('')}</fieldset><span class="visually-hidden" id="themeStatus" aria-live="polite"></span>`;
    const status = container.querySelector('#themeStatus');
    const announce = (resolved) => { status.textContent = `${labels[preference]}. Активна ${resolved === 'dark' ? 'тёмная' : 'светлая'} палитра.`; };
    container.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        announce(setPreference(input.value));
      });
    });
    announce(apply());
  };

  const handleSystemChange = () => {
    if (preference !== 'system') return;
    const resolved = apply();
    document.querySelectorAll('[data-theme-controls]').forEach((container) => {
      const status = container.querySelector('#themeStatus');
      if (status) status.textContent = `Системная тема. Активна ${resolved === 'dark' ? 'тёмная' : 'светлая'} палитра.`;
    });
  };

  mediaQuery.addEventListener?.('change', handleSystemChange);
  apply();

  return {
    apply,
    getPreference: () => preference,
    mount: renderControl,
    setPreference
  };
}
