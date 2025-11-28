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
  
  // Settings Page
  'settings.title': {
    en: 'Settings',
    es: 'Configuración',
  },
  'settings.subtitle': {
    en: 'Manage your account and preferences',
    es: 'Administra tu cuenta y preferencias',
  },
  'settings.profile': {
    en: 'Profile',
    es: 'Perfil',
  },
  'settings.notifications': {
    en: 'Notifications',
    es: 'Notificaciones',
  },
  'settings.privacy': {
    en: 'Privacy',
    es: 'Privacidad',
  },
  'settings.appearance': {
    en: 'Appearance',
    es: 'Apariencia',
  },
  'settings.audio': {
    en: 'Audio',
    es: 'Audio',
  },
  'settings.language': {
    en: 'Language',
    es: 'Idioma',
  },
  'settings.data': {
    en: 'Data',
    es: 'Datos',
  },
  'settings.profileSettings': {
    en: 'Profile Settings',
    es: 'Configuración de Perfil',
  },
  'settings.profilePicture': {
    en: 'Profile Picture',
    es: 'Foto de Perfil',
  },
  'settings.displayName': {
    en: 'Display Name',
    es: 'Nombre para Mostrar',
  },
  'settings.bio': {
    en: 'Bio',
    es: 'Biografía',
  },
  'settings.uploadPhoto': {
    en: 'Upload Photo',
    es: 'Subir Foto',
  },
  'settings.saveChanges': {
    en: 'Save Changes',
    es: 'Guardar Cambios',
  },
  'settings.saving': {
    en: 'Saving...',
    es: 'Guardando...',
  },
  'settings.saved': {
    en: 'Settings saved successfully!',
    es: '¡Configuración guardada exitosamente!',
  },
  'settings.error': {
    en: 'Failed to save settings. Please try again.',
    es: 'Error al guardar configuración. Por favor intenta de nuevo.',
  },
  'settings.notificationSettings': {
    en: 'Notification Settings',
    es: 'Configuración de Notificaciones',
  },
  'settings.pushNotifications': {
    en: 'Push Notifications',
    es: 'Notificaciones Push',
  },
  'settings.pushNotificationsDesc': {
    en: 'Receive notifications on your device',
    es: 'Recibir notificaciones en tu dispositivo',
  },
  'settings.emailNotifications': {
    en: 'Email Notifications',
    es: 'Notificaciones por Email',
  },
  'settings.emailNotificationsDesc': {
    en: 'Receive updates via email',
    es: 'Recibir actualizaciones por correo electrónico',
  },
  'settings.newMusicAlerts': {
    en: 'New Music Alerts',
    es: 'Alertas de Música Nueva',
  },
  'settings.newMusicAlertsDesc': {
    en: 'Get notified about new releases',
    es: 'Recibir notificaciones sobre nuevos lanzamientos',
  },
  'settings.privacySettings': {
    en: 'Privacy Settings',
    es: 'Configuración de Privacidad',
  },
  'settings.publicProfile': {
    en: 'Public Profile',
    es: 'Perfil Público',
  },
  'settings.publicProfileDesc': {
    en: 'Make your profile visible to others',
    es: 'Hacer tu perfil visible para otros',
  },
  'settings.showListeningActivity': {
    en: 'Show Listening Activity',
    es: 'Mostrar Actividad de Escucha',
  },
  'settings.showListeningActivityDesc': {
    en: "Let others see what you're listening to",
    es: 'Permitir que otros vean lo que estás escuchando',
  },
  'settings.dataCollection': {
    en: 'Data Collection',
    es: 'Recopilación de Datos',
  },
  'settings.dataCollectionDesc': {
    en: 'Allow data collection for improvements',
    es: 'Permitir recopilación de datos para mejoras',
  },
  'settings.appearanceSettings': {
    en: 'Appearance Settings',
    es: 'Configuración de Apariencia',
  },
  'settings.theme': {
    en: 'Theme',
    es: 'Tema',
  },
  'settings.dark': {
    en: 'Dark',
    es: 'Oscuro',
  },
  'settings.light': {
    en: 'Light',
    es: 'Claro',
  },
  'settings.auto': {
    en: 'Auto',
    es: 'Automático',
  },
  'settings.accentColor': {
    en: 'Accent Color',
    es: 'Color de Acento',
  },
  'settings.accentColorDesc': {
    en: 'Accent color changes will be applied after page refresh',
    es: 'Los cambios de color de acento se aplicarán después de refrescar la página',
  },
  'settings.audioSettings': {
    en: 'Audio Settings',
    es: 'Configuración de Audio',
  },
  'settings.volume': {
    en: 'Volume',
    es: 'Volumen',
  },
  'settings.audioQuality': {
    en: 'Audio Quality',
    es: 'Calidad de Audio',
  },
  'settings.languageSettings': {
    en: 'Language Settings',
    es: 'Configuración de Idioma',
  },
  'settings.languageDesc': {
    en: 'Language changes are saved automatically',
    es: 'Los cambios de idioma se guardan automáticamente',
  },
  'settings.dataManagement': {
    en: 'Data Management',
    es: 'Gestión de Datos',
  },
  'settings.downloadData': {
    en: 'Download Your Data',
    es: 'Descargar Tus Datos',
  },
  'settings.downloadDataDesc': {
    en: 'Get a copy of your data',
    es: 'Obtener una copia de tus datos',
  },
  'settings.deleteAccount': {
    en: 'Delete Account',
    es: 'Eliminar Cuenta',
  },
  'settings.deleteAccountDesc': {
    en: 'Permanently delete your account',
    es: 'Eliminar permanentemente tu cuenta',
  },
  'settings.download': {
    en: 'Download',
    es: 'Descargar',
  },
  'settings.delete': {
    en: 'Delete',
    es: 'Eliminar',
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

