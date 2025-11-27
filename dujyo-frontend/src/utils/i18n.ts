/**
 * Simple i18n (Internationalization) System for Dujyo
 * Supports English (default) and Spanish
 */

import React from 'react';

export type Language = 'en' | 'es';

interface Translations {
  [key: string]: {
    en: string;
    es: string;
  };
}

// Translation keys
const translations: Translations = {
  // Help Center
  'helpCenter.title': {
    en: 'Help Center',
    es: 'Centro de Ayuda',
  },
  'helpCenter.subtitle': {
    en: 'Find answers and learn how to use Dujyo',
    es: 'Encuentra respuestas y aprende a usar Dujyo',
  },
  'helpCenter.search': {
    en: 'Search help...',
    es: 'Buscar ayuda...',
  },
  'helpCenter.all': {
    en: 'All',
    es: 'Todos',
  },
  'helpCenter.back': {
    en: 'Back',
    es: 'Volver',
  },
  'helpCenter.noArticles': {
    en: 'No articles found',
    es: 'No se encontraron artículos',
  },
  'helpCenter.readMore': {
    en: 'Read more',
    es: 'Leer más',
  },
  'helpCenter.hideVideo': {
    en: 'Hide',
    es: 'Ocultar',
  },
  'helpCenter.showVideo': {
    en: 'Show',
    es: 'Ver',
  },
  'helpCenter.videoTutorial': {
    en: 'Video Tutorial',
    es: 'Video Tutorial',
  },
  
  // Categories
  'category.gettingStarted': {
    en: 'Getting Started',
    es: 'Primeros Pasos',
  },
  'category.features': {
    en: 'Features',
    es: 'Características',
  },
  'category.faq': {
    en: 'FAQ',
    es: 'Preguntas Frecuentes',
  },
  
  // Common
  'common.loading': {
    en: 'Loading...',
    es: 'Cargando...',
  },
  'common.error': {
    en: 'Error',
    es: 'Error',
  },
  'common.close': {
    en: 'Close',
    es: 'Cerrar',
  },
  'common.save': {
    en: 'Save',
    es: 'Guardar',
  },
  'common.cancel': {
    en: 'Cancel',
    es: 'Cancelar',
  },
};

/**
 * Get current language from localStorage or default to 'en'
 */
export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('dujyo_language') as Language;
  return stored && (stored === 'en' || stored === 'es') ? stored : 'en';
}

/**
 * Set language preference
 */
export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dujyo_language', lang);
  // Trigger custom event for components to update
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

/**
 * Translate a key to current language
 */
export function t(key: string, lang?: Language): string {
  const currentLang = lang || getLanguage();
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  return translation[currentLang] || translation.en || key;
}

/**
 * React hook for translations
 */
export function useTranslation() {
  const [language, setLanguageState] = React.useState<Language>(getLanguage);

  React.useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguageState(e.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  return {
    language,
    setLanguage: (lang: Language) => {
      setLanguage(lang);
      setLanguageState(lang);
    },
    t: (key: string) => t(key, language),
  };
}

