import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Language State: 'en' or 'hi'
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('jh_lang') || 'en';
  });

  // Theme State: 'dark' or 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('jh_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('jh_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('jh_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'hi' : 'en');
  };

  const t = (key) => {
    if (!translations[lang]) return key;
    return translations[lang][key] !== undefined ? translations[lang][key] : (translations['en'][key] || key);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, toggleLang, theme, setTheme, toggleTheme, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
