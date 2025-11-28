// src/contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getLanguage, setLanguage as setLanguageUtil } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getLanguage);

  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguageState(e.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageUtil(lang);
    setLanguageState(lang);
    // Trigger re-render of all components using this context
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  };

  // Import t function dynamically to avoid circular dependencies
  const t = (key: string) => {
    const { t: translate } = require('../utils/i18n');
    return translate(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

