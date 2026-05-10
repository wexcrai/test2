import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getTranslations, type Lang, type TranslationKey } from '../lib/i18n';

type Theme = 'dark' | 'light';

interface AppContextValue {
  theme: Theme;
  lang: Lang;
  t: TranslationKey;
  setTheme: (theme: Theme) => void;
  setLang: (lang: Lang) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (stored as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredValue('app-theme', 'dark'));
  const [lang, setLangState] = useState<Lang>(() => getStoredValue('app-lang', 'tr'));

  const t = getTranslations(lang);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app-lang', lang);
  }, [lang]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
  }, []);

  return (
    <AppContext.Provider value={{ theme, lang, t, setTheme, setLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
