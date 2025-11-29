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
  'common.viewMore': {
    en: 'View {{count}} more...',
    es: 'Ver {{count}} más...',
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
  
  // Common UI Elements
  'common.welcome': {
    en: 'Welcome',
    es: 'Bienvenido',
  },
  'common.continue': {
    en: 'Continue',
    es: 'Continuar',
  },
  'common.back': {
    en: 'Back',
    es: 'Volver',
  },
  'common.next': {
    en: 'Next',
    es: 'Siguiente',
  },
  'common.previous': {
    en: 'Previous',
    es: 'Anterior',
  },
  'common.submit': {
    en: 'Submit',
    es: 'Enviar',
  },
  'common.confirm': {
    en: 'Confirm',
    es: 'Confirmar',
  },
  'common.delete': {
    en: 'Delete',
    es: 'Eliminar',
  },
  'common.edit': {
    en: 'Edit',
    es: 'Editar',
  },
  'common.search': {
    en: 'Search',
    es: 'Buscar',
  },
  'common.filter': {
    en: 'Filter',
    es: 'Filtrar',
  },
  'common.sort': {
    en: 'Sort',
    es: 'Ordenar',
  },
  'common.play': {
    en: 'Play',
    es: 'Reproducir',
  },
  'common.playNow': {
    en: 'Play Now',
    es: 'Reproducir Ahora',
  },
  'common.watchNow': {
    en: 'Watch Now',
    es: 'Ver Ahora',
  },
  'common.explore': {
    en: 'Explore',
    es: 'Explorar',
  },
  'common.pause': {
    en: 'Pause',
    es: 'Pausar',
  },
  'common.stop': {
    en: 'Stop',
    es: 'Detener',
  },
  'common.shuffle': {
    en: 'Shuffle',
    es: 'Aleatorio',
  },
  'common.repeat': {
    en: 'Repeat',
    es: 'Repetir',
  },
  'common.like': {
    en: 'Like',
    es: 'Me gusta',
  },
  'common.share': {
    en: 'Share',
    es: 'Compartir',
  },
  'common.follow': {
    en: 'Follow',
    es: 'Seguir',
  },
  'common.unfollow': {
    en: 'Unfollow',
    es: 'Dejar de seguir',
  },
  'common.upload': {
    en: 'Upload',
    es: 'Subir',
  },
  'common.download': {
    en: 'Download',
    es: 'Descargar',
  },
  'common.view': {
    en: 'View',
    es: 'Ver',
  },
  'common.more': {
    en: 'More',
    es: 'Más',
  },
  'common.less': {
    en: 'Less',
    es: 'Menos',
  },
  'common.showMore': {
    en: 'Show More',
    es: 'Mostrar más',
  },
  'common.showLess': {
    en: 'Show Less',
    es: 'Mostrar menos',
  },
  'common.seeAll': {
    en: 'See All',
    es: 'Ver todo',
  },
  'common.noResults': {
    en: 'No results found',
    es: 'No se encontraron resultados',
  },
  'common.tryAgain': {
    en: 'Try Again',
    es: 'Intentar de nuevo',
  },
  'common.refresh': {
    en: 'Refresh',
    es: 'Actualizar',
  },
  'common.retry': {
    en: 'Retry',
    es: 'Reintentar',
  },
  'common.success': {
    en: 'Success',
    es: 'Éxito',
  },
  'common.failed': {
    en: 'Failed',
    es: 'Fallido',
  },
  'common.connecting': {
    en: 'Connecting...',
    es: 'Conectando...',
  },
  'common.connected': {
    en: 'Connected',
    es: 'Conectado',
  },
  'common.disconnected': {
    en: 'Disconnected',
    es: 'Desconectado',
  },
  
  // Authentication
  'auth.login': {
    en: 'Login',
    es: 'Iniciar Sesión',
  },
  'auth.signIn': {
    en: 'Sign In',
    es: 'Iniciar Sesión',
  },
  'auth.signUp': {
    en: 'Sign Up',
    es: 'Registrarse',
  },
  'auth.register': {
    en: 'Register',
    es: 'Registrarse',
  },
  'auth.logout': {
    en: 'Logout',
    es: 'Cerrar Sesión',
  },
  'auth.email': {
    en: 'Email',
    es: 'Correo Electrónico',
  },
  'auth.password': {
    en: 'Password',
    es: 'Contraseña',
  },
  'auth.confirmPassword': {
    en: 'Confirm Password',
    es: 'Confirmar Contraseña',
  },
  'auth.username': {
    en: 'Username',
    es: 'Nombre de Usuario',
  },
  'auth.displayName': {
    en: 'Display Name',
    es: 'Nombre para Mostrar',
  },
  'auth.forgotPassword': {
    en: 'Forgot Password?',
    es: '¿Olvidaste tu Contraseña?',
  },
  'auth.rememberMe': {
    en: 'Remember Me',
    es: 'Recordarme',
  },
  'auth.createAccount': {
    en: 'Create Account',
    es: 'Crear Cuenta',
  },
  'auth.alreadyHaveAccount': {
    en: 'Already have an account?',
    es: '¿Ya tienes una cuenta?',
  },
  'auth.dontHaveAccount': {
    en: "Don't have an account?",
    es: '¿No tienes una cuenta?',
  },
  'auth.continueWithWallet': {
    en: 'Continue with Wallet',
    es: 'Continuar con Billetera',
  },
  'auth.continueWithEmail': {
    en: 'Continue with Email',
    es: 'Continuar con Email',
  },
  'auth.newToDujyo': {
    en: 'New to DUJYO?',
    es: '¿Nuevo en DUJYO?',
  },
  'auth.joinDescription': {
    en: 'Join the first multistream platform where music, video, and gaming merge with blockchain. Create, stream, and earn $DYO tokens for every engagement.',
    es: 'Únete a la primera plataforma de multidifusión donde música, video y gaming se fusionan con blockchain. Crea, transmite y gana tokens $DYO por cada interacción.',
  },
  'auth.continueJourney': {
    en: 'Continue Your Journey',
    es: 'Continúa tu Viaje',
  },
  'auth.accessDashboard': {
    en: 'Access your Stream-to-Earn Dashboard',
    es: 'Accede a tu Panel de Stream-to-Earn',
  },
  'auth.startEarning': {
    en: 'Start earning $DYO tokens from your content',
    es: 'Comienza a ganar tokens $DYO con tu contenido',
  },
  'auth.invalidCredentials': {
    en: 'Invalid email or password',
    es: 'Correo o contraseña inválidos',
  },
  'auth.loginFailed': {
    en: 'Login failed. Please try again.',
    es: 'Error al iniciar sesión. Por favor intenta de nuevo.',
  },
  'auth.registrationFailed': {
    en: 'Registration failed. Please try again.',
    es: 'Error al registrarse. Por favor intenta de nuevo.',
  },
  'auth.emailRequired': {
    en: 'Email is required',
    es: 'El correo electrónico es requerido',
  },
  'auth.passwordRequired': {
    en: 'Password is required',
    es: 'La contraseña es requerida',
  },
  'auth.passwordsDoNotMatch': {
    en: 'Passwords do not match',
    es: 'Las contraseñas no coinciden',
  },
  'auth.passwordTooShort': {
    en: 'Password must be at least 8 characters',
    es: 'La contraseña debe tener al menos 8 caracteres',
  },
  'auth.usernameRequired': {
    en: 'Username is required',
    es: 'El nombre de usuario es requerido',
  },
  'auth.signingIn': {
    en: 'Signing In...',
    es: 'Iniciando Sesión...',
  },
  'auth.resetPasswordDescription': {
    en: 'Enter your email address and we\'ll send you a link to reset your password.',
    es: 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.',
  },
  'auth.checkEmail': {
    en: 'Check your email for instructions to reset your password.',
    es: 'Revisa tu correo electrónico para las instrucciones de restablecimiento de contraseña.',
  },
  
  // Common UI - Additional
  'common.useBiometric': {
    en: 'Use Biometric',
    es: 'Usar Biométrico',
  },
  'common.chooseLoginMethod': {
    en: 'Choose Login Method',
    es: 'Elegir Método de Inicio de Sesión',
  },
  'common.openFilters': {
    en: 'Open Filters',
    es: 'Abrir Filtros',
  },
  'common.days': {
    en: 'days',
    es: 'días',
  },
  'common.month': {
    en: 'month',
    es: 'mes',
  },
  'common.today': {
    en: 'today',
    es: 'hoy',
  },
  'common.progress': {
    en: 'Progress',
    es: 'Progreso',
  },
  'common.total': {
    en: 'Total',
    es: 'Total',
  },
  
  // Navigation
  'nav.discover': {
    en: 'Discover',
    es: 'Descubrir',
  },
  'nav.music': {
    en: 'Music',
    es: 'Música',
  },
  'nav.videos': {
    en: 'Videos',
    es: 'Videos',
  },
  'nav.games': {
    en: 'Games',
    es: 'Juegos',
  },
  'nav.gaming': {
    en: 'Gaming',
    es: 'Gaming',
  },
  'nav.shop': {
    en: 'Shop',
    es: 'Tienda',
  },
  'nav.marketplace': {
    en: 'Marketplace',
    es: 'Mercado',
  },
  'nav.dex': {
    en: 'DEX',
    es: 'DEX',
  },
  'nav.myProfile': {
    en: 'My Profile',
    es: 'Mi Perfil',
  },
  'nav.artistProfile': {
    en: 'Artist Profile',
    es: 'Perfil de Artista',
  },
  'nav.validatorProfile': {
    en: 'Validator Profile',
    es: 'Perfil de Validador',
  },
  'nav.adminProfile': {
    en: 'Admin Profile',
    es: 'Perfil de Admin',
  },
  'nav.profile': {
    en: 'Profile',
    es: 'Perfil',
  },
  'nav.settings': {
    en: 'Settings',
    es: 'Configuración',
  },
  'nav.home': {
    en: 'Home',
    es: 'Inicio',
  },
  'nav.multistreamingDashboard': {
    en: 'Multistreaming Dashboard',
    es: 'Panel de Multidifusión',
  },
  'nav.validatorHub': {
    en: 'Validator Hub',
    es: 'Centro de Validadores',
  },
  'nav.validationPanel': {
    en: 'Validation Panel',
    es: 'Panel de Validación',
  },
  'nav.cpvConsensus': {
    en: 'CPV Consensus',
    es: 'Consenso CPV',
  },
  'nav.rewards': {
    en: 'Rewards',
    es: 'Recompensas',
  },
  'nav.networkStats': {
    en: 'Network Stats',
    es: 'Estadísticas de Red',
  },
  'nav.adminPanel': {
    en: 'Admin Panel',
    es: 'Panel de Admin',
  },
  'nav.userManagement': {
    en: 'User Management',
    es: 'Gestión de Usuarios',
  },
  'nav.contentModeration': {
    en: 'Content Moderation',
    es: 'Moderación de Contenido',
  },
  'nav.blockchain': {
    en: 'Blockchain',
    es: 'Blockchain',
  },
  'nav.systemAnalytics': {
    en: 'System Analytics',
    es: 'Analíticas del Sistema',
  },
  
  // Pages - Common
  'page.explore': {
    en: 'Explore',
    es: 'Explorar',
  },
  'page.search': {
    en: 'Search',
    es: 'Buscar',
  },
  'page.searchPlaceholder': {
    en: 'What are you in the mood for?',
    es: '¿Qué te apetece?',
  },
  'page.trending': {
    en: 'Trending',
    es: 'Tendencias',
  },
  'page.new': {
    en: 'New',
    es: 'Nuevo',
  },
  'page.popular': {
    en: 'Popular',
    es: 'Popular',
  },
  'page.recommended': {
    en: 'Recommended',
    es: 'Recomendado',
  },
  'page.recent': {
    en: 'Recent',
    es: 'Reciente',
  },
  'page.favorites': {
    en: 'Favorites',
    es: 'Favoritos',
  },
  'page.playlists': {
    en: 'Playlists',
    es: 'Listas de Reproducción',
  },
  'page.artists': {
    en: 'Artists',
    es: 'Artistas',
  },
  'page.albums': {
    en: 'Albums',
    es: 'Álbumes',
  },
  'page.songs': {
    en: 'Songs',
    es: 'Canciones',
  },
  
  // Music Page
  'music.title': {
    en: 'Music Universe',
    es: 'Universo Musical',
  },
  'music.subtitle': {
    en: 'Immerse yourself in the sounds of the future. Discover electronic beats, cyberpunk anthems, and digital symphonies.',
    es: 'Sumérgete en los sonidos del futuro. Descubre ritmos electrónicos, himnos cyberpunk y sinfonías digitales.',
  },
  'music.poweredBy': {
    en: 'Powered by DUJYO • Stream-to-Earn',
    es: 'Impulsado por DUJYO • Transmite para Ganar',
  },
  'music.dyoPerStream': {
    en: '$DYO per Stream',
    es: '$DYO por Transmisión',
  },
  'music.earnWhileListen': {
    en: 'Earn while you listen',
    es: 'Gana mientras escuchas',
  },
  'music.totalStreams': {
    en: 'Total Streams',
    es: 'Transmisiones Totales',
  },
  'music.andCounting': {
    en: 'And counting...',
    es: 'Y contando...',
  },
  'music.activeListeners': {
    en: 'Active Listeners',
    es: 'Oyentes Activos',
  },
  'music.earningTogether': {
    en: 'Earning together',
    es: 'Ganando juntos',
  },
  'music.viewMyEarnings': {
    en: 'View My Earnings',
    es: 'Ver Mis Ganancias',
  },
  'music.listenToEarn': {
    en: 'Listen to earn $DYO tokens',
    es: 'Escucha para ganar tokens $DYO',
  },
  'music.everyStreamCounts': {
    en: 'Every stream counts towards your earnings',
    es: 'Cada transmisión cuenta para tus ganancias',
  },
  'music.streak': {
    en: 'Streak',
    es: 'Racha',
  },
  'music.progressToNextMilestone': {
    en: 'Progress to next milestone',
    es: 'Progreso al siguiente hito',
  },
  'music.topEarners': {
    en: 'Top Earners',
    es: 'Top Ganadores',
  },
  'music.topEarnersDescription': {
    en: 'Top artists ranked by total $DYO earnings. Rankings update in real-time based on stream counts and listener engagement.',
    es: 'Artistas principales clasificados por ganancias totales en $DYO. Las clasificaciones se actualizan en tiempo real según el número de transmisiones y el compromiso de los oyentes.',
  },
  'music.streams': {
    en: 'streams',
    es: 'transmisiones',
  },
  'music.topPicks': {
    en: "DUJYO's Top Picks",
    es: 'Top Selecciones de DUJYO',
  },
  'music.featuredTracks': {
    en: 'Featured Tracks',
    es: 'Canciones Destacadas',
  },
  'music.earnAmount': {
    en: 'Earn {{amount}} $DYO',
    es: 'Gana {{amount}} $DYO',
  },
  'music.artist': {
    en: 'Artist',
    es: 'Artista',
  },
  'music.earned': {
    en: 'earned',
    es: 'ganado',
  },
  'music.howStreamToEarnWorks': {
    en: 'How Stream-to-Earn Works',
    es: 'Cómo Funciona Transmitir para Ganar',
  },
  'music.forListeners': {
    en: 'For Listeners',
    es: 'Para Oyentes',
  },
  'music.earnPerStream': {
    en: 'Earn {{amount}} $DYO per stream',
    es: 'Gana {{amount}} $DYO por transmisión',
  },
  'music.longerListeningMoreEarnings': {
    en: 'Longer listening = more earnings',
    es: 'Más tiempo escuchando = más ganancias',
  },
  'music.dailyStreaksUnlock': {
    en: 'Daily streaks unlock bonus rewards',
    es: 'Las rachas diarias desbloquean recompensas adicionales',
  },
  'music.supportArtistsWhileEarning': {
    en: 'Support artists while earning',
    es: 'Apoya a los artistas mientras ganas',
  },
  'music.forArtists': {
    en: 'For Artists',
    es: 'Para Artistas',
  },
  'music.earnFromEveryStream': {
    en: 'Earn from every stream of your content',
    es: 'Gana de cada transmisión de tu contenido',
  },
  'music.higherEngagementHigherEarnings': {
    en: 'Higher engagement = higher earnings',
    es: 'Mayor compromiso = mayores ganancias',
  },
  'music.realTimeEarningsTracking': {
    en: 'Real-time earnings tracking',
    es: 'Seguimiento de ganancias en tiempo real',
  },
  'music.buildFanbaseAndIncome': {
    en: 'Build your fanbase and income',
    es: 'Construye tu base de fans e ingresos',
  },
  'music.maximizeEarnings': {
    en: 'Maximize your earnings',
    es: 'Maximiza tus ganancias',
  },
  'music.maximizeEarningsDescription': {
    en: 'Listen to full tracks, maintain daily streaks, discover new artists, and engage with the community to unlock bonus rewards.',
    es: 'Escucha canciones completas, mantén rachas diarias, descubre nuevos artistas e interactúa con la comunidad para desbloquear recompensas adicionales.',
  },
  'music.myEarnings': {
    en: 'My Earnings',
    es: 'Mis Ganancias',
  },
  'music.totalEarnings': {
    en: 'Total Earnings',
    es: 'Ganancias Totales',
  },
  'music.listeningStreak': {
    en: 'Listening Streak',
    es: 'Racha de Escucha',
  },
  'music.genre': {
    en: 'Genre',
    es: 'Género',
  },
  'music.reggaeton': {
    en: 'Reggaeton',
    es: 'Reggaeton',
  },
  'music.drumBass': {
    en: 'Drum & Bass',
    es: 'Drum & Bass',
  },
  'music.electronic': {
    en: 'Electronic',
    es: 'Electrónica',
  },
  'music.hipHop': {
    en: 'Hip Hop',
    es: 'Hip Hop',
  },
  'music.minimumRating': {
    en: 'Minimum Rating',
    es: 'Calificación Mínima',
  },
  'music.nowPlaying': {
    en: 'Now Playing',
    es: 'Reproduciendo',
  },
  'music.queue': {
    en: 'Queue',
    es: 'Cola',
  },
  'music.genres': {
    en: 'Genres',
    es: 'Géneros',
  },
  'music.moods': {
    en: 'Moods',
    es: 'Estados de Ánimo',
  },
  
  // Video Page
  'video.title': {
    en: 'Videos',
    es: 'Videos',
  },
  'video.subtitle': {
    en: 'Watch and discover amazing video content',
    es: 'Mira y descubre increíble contenido de video',
  },
  'video.trending': {
    en: 'Trending Videos',
    es: 'Videos en Tendencia',
  },
  'video.watch': {
    en: 'Watch',
    es: 'Ver',
  },
  'video.watchNow': {
    en: 'Watch Now',
    es: 'Ver Ahora',
  },
  'video.views': {
    en: 'views',
    es: 'visualizaciones',
  },
  'video.likes': {
    en: 'likes',
    es: 'me gusta',
  },
  'video.earnings': {
    en: 'Earnings',
    es: 'Ganancias',
  },
  
  // Gaming Page
  'gaming.title': {
    en: 'Gaming Matrix',
    es: 'Matriz de Gaming',
  },
  'gaming.subtitle': {
    en: 'Enter the digital realm where reality meets imagination. Compete, explore, and conquer in our immersive gaming ecosystem.',
    es: 'Entra al reino digital donde la realidad se encuentra con la imaginación. Compite, explora y conquista en nuestro ecosistema de gaming inmersivo.',
  },
  'gaming.poweredBy': {
    en: 'Powered by DUJYO • Play-to-Earn',
    es: 'Impulsado por DUJYO • Juega para Ganar',
  },
  'gaming.avgEarnPerGame': {
    en: 'Avg Earn per Game',
    es: 'Ganancia Promedio por Juego',
  },
  'gaming.activeEarners': {
    en: 'Active Earners',
    es: 'Ganadores Activos',
  },
  'gaming.totalEarned': {
    en: 'Total Earned',
    es: 'Total Ganado',
  },
  'gaming.playAndEarn': {
    en: 'Play and earn',
    es: 'Juega y gana',
  },
  'gaming.leaderboard': {
    en: 'Leaderboard',
    es: 'Clasificación',
  },
  'gaming.achievements': {
    en: 'Achievements',
    es: 'Logros',
  },
  'gaming.play': {
    en: 'Play',
    es: 'Jugar',
  },
  
  // Upload Page
  'upload.title': {
    en: 'Upload Content',
    es: 'Subir Contenido',
  },
  'upload.subtitle': {
    en: 'Share your creativity with the world. Upload music, videos, or gaming content and earn rewards.',
    es: 'Comparte tu creatividad con el mundo. Sube música, videos o contenido de gaming y gana recompensas.',
  },
  'upload.selectType': {
    en: 'Select Content Type',
    es: 'Selecciona el Tipo de Contenido',
  },
  'upload.music': {
    en: 'Music',
    es: 'Música',
  },
  'upload.video': {
    en: 'Video',
    es: 'Video',
  },
  'upload.gaming': {
    en: 'Gaming',
    es: 'Gaming',
  },
  'upload.selectFile': {
    en: 'Select File',
    es: 'Seleccionar Archivo',
  },
  'upload.dragAndDrop': {
    en: 'Drag and drop your file here, or click to browse',
    es: 'Arrastra y suelta tu archivo aquí, o haz clic para explorar',
  },
  'upload.uploading': {
    en: 'Uploading...',
    es: 'Subiendo...',
  },
  'upload.success': {
    en: 'Upload successful!',
    es: '¡Subida exitosa!',
  },
  'upload.failed': {
    en: 'Upload failed. Please try again.',
    es: 'Error al subir. Por favor intenta de nuevo.',
  },
  
  // Wallet
  'wallet.title': {
    en: 'Wallet',
    es: 'Billetera',
  },
  'wallet.balance': {
    en: 'Balance',
    es: 'Balance',
  },
  'wallet.totalBalance': {
    en: 'Total Balance',
    es: 'Balance Total',
  },
  'wallet.available': {
    en: 'Available',
    es: 'Disponible',
  },
  'wallet.staked': {
    en: 'Staked',
    es: 'Apostado',
  },
  'wallet.send': {
    en: 'Send',
    es: 'Enviar',
  },
  'wallet.receive': {
    en: 'Receive',
    es: 'Recibir',
  },
  'wallet.transactions': {
    en: 'Transactions',
    es: 'Transacciones',
  },
  'wallet.history': {
    en: 'Transaction History',
    es: 'Historial de Transacciones',
  },
  'wallet.noTransactions': {
    en: 'No transactions yet',
    es: 'Aún no hay transacciones',
  },
  'wallet.walletDashboard': {
    en: 'Wallet Dashboard',
    es: 'Panel de Billetera',
  },
  'wallet.manageDigitalAssets': {
    en: 'Manage your digital assets and track your Stream-to-Earn activity',
    es: 'Administra tus activos digitales y rastrea tu actividad de Transmitir para Ganar',
  },
  'wallet.loadingWalletData': {
    en: 'Loading wallet data...',
    es: 'Cargando datos de billetera...',
  },
  'wallet.music': {
    en: 'Music',
    es: 'Música',
  },
  'wallet.video': {
    en: 'Video',
    es: 'Video',
  },
  'wallet.gaming': {
    en: 'Gaming',
    es: 'Gaming',
  },
  'wallet.currentActivityTrends': {
    en: 'Current activity trends',
    es: 'Tendencias de actividad actual',
  },
  'wallet.historicalPatterns': {
    en: 'Historical patterns',
    es: 'Patrones históricos',
  },
  'wallet.top10PercentEarner': {
    en: 'Top 10% Earner',
    es: 'Top 10% de Ganadores',
  },
  'wallet.beTop10PercentEarners': {
    en: 'Be in the top 10% of earners',
    es: 'Estar en el top 10% de ganadores',
  },
  'wallet.consistentCreator': {
    en: 'Consistent Creator',
    es: 'Creador Consistente',
  },
  'wallet.uploadContent30Days': {
    en: 'Upload content for 30 days',
    es: 'Sube contenido durante 30 días',
  },
  'wallet.firstEarnings': {
    en: 'First Earnings',
    es: 'Primeras Ganancias',
  },
  'wallet.earnYourFirstDyo': {
    en: 'Earn your first $DYO',
    es: 'Gana tu primer $DYO',
  },
  'wallet.nftTransferredSuccessfully': {
    en: 'NFT transferred successfully',
    es: 'NFT transferido correctamente',
  },
  'wallet.nftTransferError': {
    en: 'Error transferring NFT',
    es: 'Error al transferir el NFT',
  },
  'wallet.uploadContent': {
    en: 'Upload Content',
    es: 'Subir Contenido',
  },
  'wallet.startEarningFromCreations': {
    en: 'Start earning from your creations',
    es: 'Comienza a ganar con tus creaciones',
  },
  'wallet.engageCommunity': {
    en: 'Engage Community',
    es: 'Interactuar con la Comunidad',
  },
  'wallet.interactWithCreatorsAndFans': {
    en: 'Interact with creators and fans',
    es: 'Interactúa con creadores y fans',
  },
  'wallet.completeQuests': {
    en: 'Complete Quests',
    es: 'Completar Misiones',
  },
  'wallet.finishDailyChallenges': {
    en: 'Finish daily challenges',
    es: 'Completa desafíos diarios',
  },
  'wallet.stakeEarn': {
    en: 'Stake & Earn',
    es: 'Apostar y Ganar',
  },
  'wallet.stakeDyoTokens': {
    en: 'Stake $DYO tokens to earn passive rewards',
    es: 'Aposta tokens $DYO para ganar recompensas pasivas',
  },
  'wallet.tradeOnDex': {
    en: 'Trade on DEX',
    es: 'Comerciar en DEX',
  },
  'wallet.swapDyoForTokens': {
    en: 'Swap $DYO for other tokens',
    es: 'Intercambia $DYO por otros tokens',
  },
  'wallet.buyNfts': {
    en: 'Buy NFTs',
    es: 'Comprar NFTs',
  },
  'wallet.purchaseExclusiveNfts': {
    en: 'Purchase exclusive content NFTs',
    es: 'Compra NFTs de contenido exclusivo',
  },
  'wallet.premiumFeatures': {
    en: 'Premium Features',
    es: 'Características Premium',
  },
  'wallet.unlockAdvancedFeatures': {
    en: 'Unlock advanced platform features',
    es: 'Desbloquea características avanzadas de la plataforma',
  },
  'wallet.streamingEarnings': {
    en: 'Streaming Earnings',
    es: 'Ganancias por Transmisión',
  },
  'wallet.nftsOwned': {
    en: 'NFTs Owned',
    es: 'NFTs en Propiedad',
  },
  'wallet.currentSessionEarnings': {
    en: 'Current Session Earnings',
    es: 'Ganancias de Sesión Actual',
  },
  'wallet.liveUpdates': {
    en: 'Live updates',
    es: 'Actualizaciones en vivo',
  },
  'wallet.streamingEarningsBreakdown': {
    en: 'Streaming Earnings Breakdown',
    es: 'Desglose de Ganancias por Transmisión',
  },
  'wallet.streamsViewsPlays': {
    en: 'Streams/Views/Plays',
    es: 'Transmisiones/Visualizaciones/Reproducciones',
  },
  'wallet.earningPredictions': {
    en: 'Earning Predictions',
    es: 'Predicciones de Ganancias',
  },
  
  // Artist Dashboard
  'artist.artistDashboard': {
    en: 'Artist Dashboard',
    es: 'Panel de Artista',
  },
  'artist.welcomeBack': {
    en: 'Welcome back, {{name}}',
    es: 'Bienvenido de nuevo, {{name}}',
  },
  'artist.last7Days': {
    en: 'Last 7 days',
    es: 'Últimos 7 días',
  },
  'artist.last30Days': {
    en: 'Last 30 days',
    es: 'Últimos 30 días',
  },
  'artist.last90Days': {
    en: 'Last 90 days',
    es: 'Últimos 90 días',
  },
  'artist.lastYear': {
    en: 'Last year',
    es: 'Último año',
  },
  'artist.dyoTokenEconomy': {
    en: 'DYO Token Economy',
    es: 'Economía de Tokens DYO',
  },
  'artist.streamToEarnActive': {
    en: 'Stream-to-Earn Active',
    es: 'Transmitir para Ganar Activo',
  },
  'artist.availableBalance': {
    en: 'Available Balance',
    es: 'Balance Disponible',
  },
  'artist.staked': {
    en: 'Staked',
    es: 'Apostado',
  },
  'artist.earningRate': {
    en: 'Earning Rate',
    es: 'Tasa de Ganancia',
  },
  'artist.totalEarnings': {
    en: 'Total Earnings',
    es: 'Ganancias Totales',
  },
  'artist.earningPredictions': {
    en: 'Earning Predictions',
    es: 'Predicciones de Ganancias',
  },
  'artist.confidence': {
    en: 'confidence',
    es: 'confianza',
  },
  'artist.weeklyProjection': {
    en: 'Weekly Projection',
    es: 'Proyección Semanal',
  },
  'artist.monthlyProjection': {
    en: 'Monthly Projection',
    es: 'Proyección Mensual',
  },
  'artist.quarterlyProjection': {
    en: 'Quarterly Projection',
    es: 'Proyección Trimestral',
  },
  'artist.earningGoals': {
    en: 'Earning Goals',
    es: 'Objetivos de Ganancia',
  },
  'artist.addGoal': {
    en: 'Add Goal',
    es: 'Agregar Objetivo',
  },
  'artist.complete': {
    en: 'complete',
    es: 'completo',
  },
  'artist.left': {
    en: 'left',
    es: 'restantes',
  },
  'artist.monthlyGoal': {
    en: 'Monthly Goal',
    es: 'Objetivo Mensual',
  },
  'artist.quarterlyGoal': {
    en: 'Quarterly Goal',
    es: 'Objetivo Trimestral',
  },
  'artist.aiOptimizationTips': {
    en: 'AI-Powered Optimization Tips',
    es: 'Consejos de Optimización con IA',
  },
  'artist.uploadMoreVideoContent': {
    en: 'Upload More Video Content',
    es: 'Sube Más Contenido de Video',
  },
  'artist.videoContentHigherMonetization': {
    en: 'Video content has 2x higher monetization rate than music',
    es: 'El contenido de video tiene una tasa de monetización 2x mayor que la música',
  },
  'artist.impact40PercentEarnings': {
    en: '+40% potential earnings',
    es: '+40% ganancias potenciales',
  },
  'artist.engageTopFans': {
    en: 'Engage Top Fans',
    es: 'Interactúa con los Mejores Fans',
  },
  'artist.topFansGenerateMoreStreams': {
    en: 'Top fans generate 5x more streams than average listeners',
    es: 'Los mejores fans generan 5x más transmisiones que los oyentes promedio',
  },
  'artist.impact25PercentEngagement': {
    en: '+25% engagement boost',
    es: '+25% impulso de compromiso',
  },
  'artist.releaseConsistently': {
    en: 'Release Consistently',
    es: 'Lanza Consistentemente',
  },
  'artist.weeklyReleaseHigherRetention': {
    en: 'Artists who release weekly have 40% higher retention',
    es: 'Los artistas que lanzan semanalmente tienen 40% más retención',
  },
  'artist.impact30PercentAudience': {
    en: '+30% audience growth',
    es: '+30% crecimiento de audiencia',
  },
  'artist.noDataAvailable': {
    en: 'No Data Available',
    es: 'No Hay Datos Disponibles',
  },
  'artist.unableToLoadMetrics': {
    en: 'Unable to load artist metrics',
    es: 'No se pudieron cargar las métricas del artista',
  },
  'artist.stakingBenefits': {
    en: 'Staking Benefits',
    es: 'Beneficios de Apuesta',
  },
  'artist.tier': {
    en: 'Tier',
    es: 'Nivel',
  },
  'artist.totalStaked': {
    en: 'Total Staked',
    es: 'Total Apostado',
  },
  'artist.currentApy': {
    en: 'Current APY',
    es: 'APY Actual',
  },
  'artist.stakingRewards': {
    en: 'Staking Rewards',
    es: 'Recompensas de Apuesta',
  },
  'artist.stakeMoreDyo': {
    en: 'Stake More DYO',
    es: 'Apostar Más DYO',
  },
  'artist.platformBenefits': {
    en: 'Platform benefits: Higher visibility, Reduced fees, Priority support',
    es: 'Beneficios de la plataforma: Mayor visibilidad, Tarifas reducidas, Soporte prioritario',
  },
  'artist.realTimeEarningStreams': {
    en: 'Real-Time Earning Streams',
    es: 'Flujos de Ganancia en Tiempo Real',
  },
  'artist.live': {
    en: 'Live',
    es: 'En Vivo',
  },
  'artist.noRecentEarnings': {
    en: 'No recent earnings',
    es: 'No hay ganancias recientes',
  },
  'artist.earningsWillAppearRealTime': {
    en: 'Earnings will appear here in real-time',
    es: 'Las ganancias aparecerán aquí en tiempo real',
  },
  'artist.multistreamingOverview': {
    en: 'Multistreaming Overview',
    es: 'Resumen de Multitransmisión',
  },
  'artist.allContentTypes': {
    en: 'All Content Types',
    es: 'Todos los Tipos de Contenido',
  },
  'artist.totalEngagement': {
    en: 'Total Engagement',
    es: 'Compromiso Total',
  },
  'artist.streamsViewsHours': {
    en: 'Streams + Views + Hours',
    es: 'Transmisiones + Visualizaciones + Horas',
  },
  'artist.uniqueUsersAcrossPlatforms': {
    en: 'Unique Users Across Platforms',
    es: 'Usuarios Únicos en Todas las Plataformas',
  },
  'artist.contentTypePerformanceRoi': {
    en: 'Content Type Performance & ROI',
    es: 'Rendimiento y ROI por Tipo de Contenido',
  },
  'artist.music': {
    en: 'Music',
    es: 'Música',
  },
  'artist.streamsListeners': {
    en: 'Streams & Listeners',
    es: 'Transmisiones y Oyentes',
  },
  'artist.earnings': {
    en: 'Earnings',
    es: 'Ganancias',
  },
  'artist.streams': {
    en: 'Streams',
    es: 'Transmisiones',
  },
  'artist.stream': {
    en: 'stream',
    es: 'transmisión',
  },
  'artist.roi': {
    en: 'ROI',
    es: 'ROI',
  },
  'common.week': {
    en: 'week',
    es: 'semana',
  },
  'common.day': {
    en: 'day',
    es: 'día',
  },
  
  // DEX
  'dex.title': {
    en: 'Decentralized Exchange',
    es: 'Intercambio Descentralizado',
  },
  'dex.swap': {
    en: 'Swap',
    es: 'Intercambiar',
  },
  'dex.liquidity': {
    en: 'Liquidity',
    es: 'Liquidez',
  },
  'dex.pools': {
    en: 'Pools',
    es: 'Pools',
  },
  'dex.addLiquidity': {
    en: 'Add Liquidity',
    es: 'Agregar Liquidez',
  },
  'dex.removeLiquidity': {
    en: 'Remove Liquidity',
    es: 'Remover Liquidez',
  },
  'dex.from': {
    en: 'From',
    es: 'Desde',
  },
  'dex.to': {
    en: 'To',
    es: 'Hasta',
  },
  'dex.amount': {
    en: 'Amount',
    es: 'Cantidad',
  },
  'dex.price': {
    en: 'Price',
    es: 'Precio',
  },
  'dex.youReceive': {
    en: 'You Receive',
    es: 'Recibirás',
  },
  'dex.swapNow': {
    en: 'Swap Now',
    es: 'Intercambiar Ahora',
  },
  'dex.dashboard': {
    en: 'Dashboard',
    es: 'Panel',
  },
  'dex.analyticsMetrics': {
    en: 'Analytics & Metrics',
    es: 'Analíticas y Métricas',
  },
  'dex.tradeTokens': {
    en: 'Trade Tokens',
    es: 'Intercambiar Tokens',
  },
  'dex.provideLiquidity': {
    en: 'Provide Liquidity',
    es: 'Proporcionar Liquidez',
  },
  'dex.stakeEarn': {
    en: 'Stake & Earn',
    es: 'Apostar y Ganar',
  },
  'dex.earnApy': {
    en: 'Earn {{apy}}% APY on your $DYO',
    es: 'Gana {{apy}}% APY en tu $DYO',
  },
  'dex.highApy': {
    en: 'High APY',
    es: 'Alto APY',
  },
  'dex.earnFeesFromTrading': {
    en: 'Earn fees from trading pairs',
    es: 'Gana comisiones de pares de trading',
  },
  'dex.feeEarnings': {
    en: 'Fee Earnings',
    es: 'Ganancias por Comisiones',
  },
  'dex.tradeSwap': {
    en: 'Trade & Swap',
    es: 'Comerciar e Intercambiar',
  },
  'dex.swapDyoForTokens': {
    en: 'Swap DYO for other tokens',
    es: 'Intercambia DYO por otros tokens',
  },
  'dex.activeTrading': {
    en: 'Active Trading',
    es: 'Trading Activo',
  },
  'dex.earnedFromStreaming': {
    en: 'Earned from Streaming',
    es: 'Ganado por Transmisión',
  },
  'dex.totalEarnings': {
    en: 'Total Earnings',
    es: 'Ganancias Totales',
  },
  'dex.streamsViewsPlays': {
    en: 'Streams/Views/Plays',
    es: 'Transmisiones/Visualizaciones/Reproducciones',
  },
  'dex.perStream': {
    en: 'Per Stream',
    es: 'Por Transmisión',
  },
  'dex.transferToDex': {
    en: 'Transfer to DEX',
    es: 'Transferir a DEX',
  },
  'dex.subtitle': {
    en: 'Trade, Swap & Provide Liquidity on the DUJYO Decentralized Exchange',
    es: 'Comercia, Intercambia y Proporciona Liquidez en el Intercambio Descentralizado DUJYO',
  },
  'dex.volume24h': {
    en: '24h Volume',
    es: 'Volumen 24h',
  },
  'dex.activePairs': {
    en: 'Active Pairs',
    es: 'Pares Activos',
  },
  'dex.tokenEcosystemLive': {
    en: '$DYO Token Ecosystem Live',
    es: 'Ecosistema de Tokens $DYO Activo',
  },
  'dex.whatYouCanDoWithDyo': {
    en: 'What You Can Do With $DYO Tokens',
    es: 'Qué Puedes Hacer con los Tokens $DYO',
  },
  'dex.recommendedPairsForStreamers': {
    en: 'Recommended Pairs for Streamers',
    es: 'Pares Recomendados para Streamers',
  },
  'dex.volume': {
    en: 'Volume',
    es: 'Volumen',
  },
  'dex.liquidityPool': {
    en: 'Liquidity Pool',
    es: 'Pool de Liquidez',
  },
  'dex.transferEarningsDescription': {
    en: 'Transfer your streaming earnings to your DEX wallet for trading, staking, or providing liquidity.',
    es: 'Transfiere tus ganancias de transmisión a tu billetera DEX para trading, staking o proporcionar liquidez.',
  },
  'dex.stakeYourDyoTokens': {
    en: 'Stake Your $DYO Tokens',
    es: 'Aposta tus Tokens $DYO',
  },
  'dex.earnPassiveRewards': {
    en: 'Earn passive rewards while supporting the network',
    es: 'Gana recompensas pasivas mientras apoyas la red',
  },
  'dex.annualPercentageYield': {
    en: 'Annual Percentage Yield',
    es: 'Rendimiento Porcentual Anual',
  },
  'dex.startStaking': {
    en: 'Start Staking',
    es: 'Comenzar a Apostar',
  },
  'dex.dyoTokenEconomy': {
    en: '$DYO Token Economy',
    es: 'Economía del Token $DYO',
  },
  'dex.dyoTokenEconomyDescription': {
    en: 'The $DYO token powers the DUJYO Stream-to-Earn ecosystem. Every stream, view, and play generates $DYO tokens, creating a sustainable economy where creators and listeners earn together.',
    es: 'El token $DYO impulsa el ecosistema DUJYO Stream-to-Earn. Cada transmisión, visualización y reproducción genera tokens $DYO, creando una economía sostenible donde creadores y oyentes ganan juntos.',
  },
  'dex.totalSupply': {
    en: 'Total Supply',
    es: 'Suministro Total',
  },
  'dex.streamingRewards': {
    en: 'Streaming Rewards',
    es: 'Recompensas por Transmisión',
  },
  'dex.distributedToCreatorsListeners': {
    en: 'Distributed to creators & listeners',
    es: 'Distribuido a creadores y oyentes',
  },
  'dex.forDexTradingPairs': {
    en: 'For DEX trading pairs',
    es: 'Para pares de trading en DEX',
  },
  'dex.howStreamingRewardsFuel': {
    en: 'How Streaming Rewards Fuel the Ecosystem:',
    es: 'Cómo las Recompensas por Transmisión Alimentan el Ecosistema:',
  },
  'dex.howStreamingRewardsFuelDescription': {
    en: 'When users stream content, they earn $DYO tokens. These tokens can be staked for passive income, traded on the DEX, or used to purchase NFTs. This creates a circular economy that rewards participation and engagement.',
    es: 'Cuando los usuarios transmiten contenido, ganan tokens $DYO. Estos tokens pueden ser apostados para ingresos pasivos, intercambiados en el DEX o usados para comprar NFTs. Esto crea una economía circular que recompensa la participación y el compromiso.',
  },
  'dex.decentralizedExchangeForEcosystem': {
    en: 'Decentralized Exchange for the DUJYO Ecosystem',
    es: 'Intercambio Descentralizado para el Ecosistema DUJYO',
  },
  'dex.builtOnDyoBlockchain': {
    en: 'Built on DYO Blockchain • Powered by Automated Market Making • Stream-to-Earn Integrated',
    es: 'Construido en Blockchain DYO • Impulsado por Creación Automática de Mercado • Stream-to-Earn Integrado',
  },
  'dex.transferStreamingEarnings': {
    en: 'Transfer Streaming Earnings',
    es: 'Transferir Ganancias por Transmisión',
  },
  'dex.availableToTransfer': {
    en: 'Available to Transfer',
    es: 'Disponible para Transferir',
  },
  'dex.transferNow': {
    en: 'Transfer Now',
    es: 'Transferir Ahora',
  },
  'dex.last24Hours': {
    en: 'Last 24 Hours',
    es: 'Últimas 24 Horas',
  },
  'dex.dyoTradingActivity': {
    en: 'DYO Trading Activity',
    es: 'Actividad de Trading DYO',
  },
  'dex.blockchainConnected': {
    en: 'Blockchain Connected',
    es: 'Blockchain Conectada',
  },
  'dex.liveTrading': {
    en: 'Live Trading',
    es: 'Trading en Vivo',
  },
  'dex.active': {
    en: 'Active',
    es: 'Activo',
  },
  'dex.topTraders': {
    en: 'Top Traders',
    es: 'Top Traders',
  },
  'dex.noTradersDataAvailable': {
    en: 'No traders data available',
    es: 'No hay datos de traders disponibles',
  },
  'dex.dexOverview': {
    en: 'DEX Overview',
    es: 'Resumen DEX',
  },
  'dex.totalValueLocked': {
    en: 'Total Value Locked',
    es: 'Valor Total Bloqueado',
  },
  'dex.activeUsers': {
    en: 'Active Users',
    es: 'Usuarios Activos',
  },
  'dex.transactions': {
    en: 'Transactions',
    es: 'Transacciones',
  },
  'dex.recentActivity': {
    en: 'Recent Activity',
    es: 'Actividad Reciente',
  },
  'dex.swapped': {
    en: 'Swapped',
    es: 'Intercambiado',
  },
  'dex.added': {
    en: 'Added',
    es: 'Agregado',
  },
  'dex.removed': {
    en: 'Removed',
    es: 'Removido',
  },
  
  // Profile Page
  'profile.title': {
    en: 'Profile',
    es: 'Perfil',
  },
  'profile.edit': {
    en: 'Edit Profile',
    es: 'Editar Perfil',
  },
  'profile.followers': {
    en: 'Followers',
    es: 'Seguidores',
  },
  'profile.following': {
    en: 'Following',
    es: 'Siguiendo',
  },
  'profile.tracks': {
    en: 'Tracks',
    es: 'Canciones',
  },
  'profile.albums': {
    en: 'Albums',
    es: 'Álbumes',
  },
  'profile.playlists': {
    en: 'Playlists',
    es: 'Listas',
  },
  
  // Errors
  'error.generic': {
    en: 'Something went wrong',
    es: 'Algo salió mal',
  },
  'error.network': {
    en: 'Network error. Please check your connection.',
    es: 'Error de red. Por favor verifica tu conexión.',
  },
  'error.notFound': {
    en: 'Page not found',
    es: 'Página no encontrada',
  },
  'error.unauthorized': {
    en: 'Unauthorized access',
    es: 'Acceso no autorizado',
  },
  'error.serverError': {
    en: 'Server error. Please try again later.',
    es: 'Error del servidor. Por favor intenta más tarde.',
  },
  
  // Success Messages
  'success.saved': {
    en: 'Saved successfully',
    es: 'Guardado exitosamente',
  },
  'success.uploaded': {
    en: 'Uploaded successfully',
    es: 'Subido exitosamente',
  },
  'success.deleted': {
    en: 'Deleted successfully',
    es: 'Eliminado exitosamente',
  },
  'success.updated': {
    en: 'Updated successfully',
    es: 'Actualizado exitosamente',
  },
  
  // Video Page - Additional
  'video.galaxy': {
    en: 'Video Galaxy',
    es: 'Galaxia de Videos',
  },
  'video.subtitleFull': {
    en: 'Immerse yourself in visual storytelling. Watch documentaries, tutorials, and experiences from the digital frontier.',
    es: 'Sumérgete en la narrativa visual. Mira documentales, tutoriales y experiencias de la frontera digital.',
  },
  'video.poweredBy': {
    en: 'Powered by DUJYO • Stream-to-Earn',
    es: 'Impulsado por DUJYO • Transmite para Ganar',
  },
  'video.dyoPerView': {
    en: '$DYO per View',
    es: '$DYO por Visualización',
  },
  'video.earnWhileWatch': {
    en: 'Earn while you watch',
    es: 'Gana mientras miras',
  },
  'video.totalViews': {
    en: 'Total Views',
    es: 'Visualizaciones Totales',
  },
  'video.avgWatchCompletion': {
    en: 'Avg Watch Completion',
    es: 'Finalización Promedio',
  },
  'video.viewCreatorEarnings': {
    en: 'View Creator Earnings',
    es: 'Ver Ganancias del Creador',
  },
  'video.creatorEarnings': {
    en: 'Creator Earnings',
    es: 'Ganancias del Creador',
  },
  'video.creatorMonetizationTiers': {
    en: 'Creator Monetization Tiers',
    es: 'Niveles de Monetización del Creador',
  },
  'video.watchTimeMilestones': {
    en: 'Watch Time Milestones',
    es: 'Hitos de Tiempo de Visualización',
  },
  'video.playersEarningNow': {
    en: 'Players earning now',
    es: 'Jugadores ganando ahora',
  },
  'video.earnedToday': {
    en: 'Earned Today',
    es: 'Ganado Hoy',
  },
  'video.watchTimeRewards': {
    en: 'Watch-Time Rewards',
    es: 'Recompensas por Tiempo de Visualización',
  },
  'video.currentSession': {
    en: 'Current session',
    es: 'Sesión actual',
  },
  'video.topEarningVideos': {
    en: 'Top Earning Videos',
    es: 'Videos con Más Ganancias',
  },
  'video.topVideosRanked': {
    en: 'Top videos ranked by total $DYO earnings. Rankings update based on views, watch time, and engagement.',
    es: 'Videos principales clasificados por ganancias totales en $DYO. Las clasificaciones se actualizan según visualizaciones, tiempo de visualización y compromiso.',
  },
  'video.payout': {
    en: 'Payout',
    es: 'Pago',
  },
  'video.trendingNow': {
    en: 'Trending Now',
    es: 'Tendencias Ahora',
  },
  'video.featuredVideos': {
    en: 'Featured Videos',
    es: 'Videos Destacados',
  },
  'video.engagementRewardsSystem': {
    en: 'Engagement Rewards System',
    es: 'Sistema de Recompensas por Compromiso',
  },
  'video.likesDescription': {
    en: 'Earn bonus $DYO for every like you give. Support creators and earn rewards!',
    es: '¡Gana $DYO extra por cada me gusta que des. Apoya a los creadores y gana recompensas!',
  },
  'video.comments': {
    en: 'Comments',
    es: 'Comentarios',
  },
  'video.commentsDescription': {
    en: 'Engage with creators through comments and earn additional $DYO tokens.',
    es: 'Interactúa con los creadores a través de comentarios y gana tokens $DYO adicionales.',
  },
  'video.shares': {
    en: 'Shares',
    es: 'Compartidos',
  },
  'video.sharesDescription': {
    en: 'Share videos with your network and unlock community engagement multipliers.',
    es: 'Comparte videos con tu red y desbloquea multiplicadores de compromiso comunitario.',
  },
  'video.communityEngagementMultiplier': {
    en: 'Community Engagement Multiplier:',
    es: 'Multiplicador de Compromiso Comunitario:',
  },
  'video.communityEngagementDescription': {
    en: 'The more you engage, the higher your earnings multiplier. Active community members can earn up to 2x more $DYO tokens!',
    es: 'Cuanto más te comprometas, mayor será tu multiplicador de ganancias. ¡Los miembros activos de la comunidad pueden ganar hasta 2x más tokens $DYO!',
  },
  'video.minViews': {
    en: 'Min Views',
    es: 'Mín. Visualizaciones',
  },
  'video.progressToNextTier': {
    en: 'Progress to next tier',
    es: 'Progreso al siguiente nivel',
  },
  'video.xEarnings': {
    en: 'x earnings',
    es: 'x ganancias',
  },
  'video.currentTier': {
    en: 'Current Tier',
    es: 'Nivel Actual',
  },
  'video.engagementPoints': {
    en: 'Engagement Points',
    es: 'Puntos de Compromiso',
  },
  'video.earningsHistory': {
    en: 'Earnings History',
    es: 'Historial de Ganancias',
  },
  'video.andGrowing': {
    en: 'And growing...',
    es: 'Y creciendo...',
  },
  'video.watchRate': {
    en: 'Watch rate',
    es: 'Tasa de visualización',
  },
  'video.avgCompletion': {
    en: 'Avg Completion',
    es: 'Finalización Promedio',
  },
  'video.creator': {
    en: 'Creator',
    es: 'Creador',
  },
  'video.completion': {
    en: 'completion',
    es: 'finalización',
  },
  'video.payoutHistory': {
    en: 'Payout History',
    es: 'Historial de Pagos',
  },
  'video.lastPayout': {
    en: 'Last payout',
    es: 'Último pago',
  },
  'video.nextPayout': {
    en: 'Next payout',
    es: 'Próximo pago',
  },
  'video.daysAgo': {
    en: 'days ago',
    es: 'días atrás',
  },
  'video.estimatedIn': {
    en: 'Estimated in',
    es: 'Estimado en',
  },
  'video.days': {
    en: 'days',
    es: 'días',
  },
  'video.startEarningAsCreator': {
    en: 'Start Earning as Creator',
    es: 'Comienza a Ganar como Creador',
  },
  'video.uploadFirstVideoDesc': {
    en: 'Upload your first video and earn bonus $DYO tokens. New creators get special promotion rewards!',
    es: '¡Sube tu primer video y gana tokens $DYO de bonificación. Los nuevos creadores obtienen recompensas de promoción especiales!',
  },
  'video.firstVideoBonus': {
    en: 'First video bonus: 50 $DYO',
    es: 'Bono del primer video: 50 $DYO',
  },
  'video.promotionBoost': {
    en: 'Promotion boost for new creators',
    es: 'Impulso de promoción para nuevos creadores',
  },
  'video.uploadFirstVideo': {
    en: 'Upload Your First Video',
    es: 'Sube Tu Primer Video',
  },
  'video.earn': {
    en: 'Earn',
    es: 'Gana',
  },
  'video.engagementMultiplier': {
    en: 'Engagement Multiplier',
    es: 'Multiplicador de Compromiso',
  },
  'video.totalEarnings': {
    en: 'Total Earnings',
    es: 'Ganancias Totales',
  },
  
  // Gaming Page - Additional
  'gaming.earnedToday': {
    en: 'Earned Today',
    es: 'Ganado Hoy',
  },
  'gaming.dailyQuests': {
    en: 'Daily Quests',
    es: 'Misiones Diarias',
  },
  'gaming.playNow': {
    en: 'Play Now',
    es: 'Jugar Ahora',
  },
  'gaming.topEarners': {
    en: 'Top Earners',
    es: 'Top Ganadores',
  },
  'gaming.all': {
    en: 'All',
    es: 'Todos',
  },
  'gaming.earnings': {
    en: 'Earnings',
    es: 'Ganancias',
  },
  'gaming.weeklyEarnings': {
    en: 'Weekly Earnings',
    es: 'Ganancias Semanales',
  },
  'gaming.complete': {
    en: 'Complete',
    es: 'Completar',
  },
  'gaming.completed': {
    en: 'Completed',
    es: 'Completado',
  },
  'gaming.progress': {
    en: 'Progress',
    es: 'Progreso',
  },
  'gaming.reward': {
    en: 'Reward',
    es: 'Recompensa',
  },
  'gaming.points': {
    en: 'Points',
    es: 'Puntos',
  },
  
  // Profile Page
  'profile.editProfile': {
    en: 'Edit Profile',
    es: 'Editar Perfil',
  },
  'profile.follow': {
    en: 'Follow',
    es: 'Seguir',
  },
  'profile.unfollow': {
    en: 'Unfollow',
    es: 'Dejar de Seguir',
  },
  'profile.message': {
    en: 'Message',
    es: 'Mensaje',
  },
  'profile.share': {
    en: 'Share',
    es: 'Compartir',
  },
  'profile.about': {
    en: 'About',
    es: 'Acerca de',
  },
  'profile.recentActivity': {
    en: 'Recent Activity',
    es: 'Actividad Reciente',
  },
  'profile.content': {
    en: 'Content',
    es: 'Contenido',
  },
  'profile.liked': {
    en: 'Liked',
    es: 'Me Gusta',
  },
  'profile.commented': {
    en: 'Commented',
    es: 'Comentó',
  },
  'profile.shared': {
    en: 'Shared',
    es: 'Compartió',
  },
  'profile.uploaded': {
    en: 'Uploaded',
    es: 'Subió',
  },
  'profile.noActivity': {
    en: 'No recent activity',
    es: 'Sin actividad reciente',
  },
  'profile.bio': {
    en: 'Bio',
    es: 'Biografía',
  },
  'profile.location': {
    en: 'Location',
    es: 'Ubicación',
  },
  'profile.joined': {
    en: 'Joined',
    es: 'Se unió',
  },
  'profile.verified': {
    en: 'Verified',
    es: 'Verificado',
  },
  
  // Music Page
  'music.galaxy': {
    en: 'Music Galaxy',
    es: 'Galaxia Musical',
  },
  'music.subtitleFull': {
    en: 'Discover and stream your favorite tracks. Listen to the latest releases and explore new artists.',
    es: 'Descubre y transmite tus canciones favoritas. Escucha los últimos lanzamientos y explora nuevos artistas.',
  },
  'music.poweredBy': {
    en: 'Powered by DUJYO • Stream-to-Earn',
    es: 'Impulsado por DUJYO • Transmite para Ganar',
  },
  'music.dyoPerStream': {
    en: '$DYO per Stream',
    es: '$DYO por Transmisión',
  },
  'music.earnWhileListen': {
    en: 'Earn while you listen',
    es: 'Gana mientras escuchas',
  },
  'music.totalStreams': {
    en: 'Total Streams',
    es: 'Transmisiones Totales',
  },
  'music.avgListenTime': {
    en: 'Avg Listen Time',
    es: 'Tiempo Promedio de Escucha',
  },
  'music.play': {
    en: 'Play',
    es: 'Reproducir',
  },
  'music.addToQueue': {
    en: 'Add to Queue',
    es: 'Agregar a Cola',
  },
  'music.addToPlaylist': {
    en: 'Add to Playlist',
    es: 'Agregar a Lista',
  },
  'music.share': {
    en: 'Share',
    es: 'Compartir',
  },
  'music.download': {
    en: 'Download',
    es: 'Descargar',
  },
  'music.artist': {
    en: 'Artist',
    es: 'Artista',
  },
  'music.album': {
    en: 'Album',
    es: 'Álbum',
  },
  'music.duration': {
    en: 'Duration',
    es: 'Duración',
  },
  'music.released': {
    en: 'Released',
    es: 'Lanzado',
  },
  
  // DEX - Additional
  'dex.dashboard': {
    en: 'DEX Dashboard',
    es: 'Panel DEX',
  },
  'dex.totalLiquidity': {
    en: 'Total Liquidity',
    es: 'Liquidez Total',
  },
  'dex.volume24h': {
    en: '24h Volume',
    es: 'Volumen 24h',
  },
  'dex.change24h': {
    en: '24h Change',
    es: 'Cambio 24h',
  },
  'dex.last24Hours': {
    en: 'Last 24 Hours',
    es: 'Últimas 24 Horas',
  },
  'dex.priceChart': {
    en: 'Price Chart',
    es: 'Gráfico de Precio',
  },
  'dex.liquidityPools': {
    en: 'Liquidity Pools',
    es: 'Pools de Liquidez',
  },
  'dex.yourLiquidity': {
    en: 'Your Liquidity',
    es: 'Tu Liquidez',
  },
  'dex.add': {
    en: 'Add',
    es: 'Agregar',
  },
  'dex.remove': {
    en: 'Remove',
    es: 'Remover',
  },
  'dex.max': {
    en: 'Max',
    es: 'Máx',
  },
  'dex.slippage': {
    en: 'Slippage',
    es: 'Deslizamiento',
  },
  'dex.minimumReceived': {
    en: 'Minimum Received',
    es: 'Mínimo Recibido',
  },
  'dex.priceImpact': {
    en: 'Price Impact',
    es: 'Impacto en Precio',
  },
  'dex.route': {
    en: 'Route',
    es: 'Ruta',
  },
  'dex.approve': {
    en: 'Approve',
    es: 'Aprobar',
  },
  'dex.approving': {
    en: 'Approving...',
    es: 'Aprobando...',
  },
  'dex.swapping': {
    en: 'Swapping...',
    es: 'Intercambiando...',
  },
  'dex.transactionPending': {
    en: 'Transaction Pending',
    es: 'Transacción Pendiente',
  },
  'dex.transactionSuccess': {
    en: 'Transaction Success',
    es: 'Transacción Exitosa',
  },
  'dex.transactionFailed': {
    en: 'Transaction Failed',
    es: 'Transacción Fallida',
  },
  
  // Wallet - Additional
  'wallet.dashboard': {
    en: 'Wallet Dashboard',
    es: 'Panel de Billetera',
  },
  'wallet.totalEarnings': {
    en: 'Total Earnings',
    es: 'Ganancias Totales',
  },
  'wallet.platformEarnings': {
    en: 'Platform Earnings',
    es: 'Ganancias por Plataforma',
  },
  'wallet.music': {
    en: 'Music',
    es: 'Música',
  },
  'wallet.video': {
    en: 'Video',
    es: 'Video',
  },
  'wallet.gaming': {
    en: 'Gaming',
    es: 'Gaming',
  },
  'wallet.streams': {
    en: 'Streams',
    es: 'Transmisiones',
  },
  'wallet.plays': {
    en: 'Plays',
    es: 'Reproducciones',
  },
  'wallet.earningPrediction': {
    en: 'Earning Prediction',
    es: 'Predicción de Ganancias',
  },
  'wallet.weekly': {
    en: 'Weekly',
    es: 'Semanal',
  },
  'wallet.monthly': {
    en: 'Monthly',
    es: 'Mensual',
  },
  'wallet.predicted': {
    en: 'Predicted',
    es: 'Predicho',
  },
  'wallet.confidence': {
    en: 'Confidence',
    es: 'Confianza',
  },
  'wallet.basedOn': {
    en: 'Based on',
    es: 'Basado en',
  },
  'wallet.quickActions': {
    en: 'Quick Actions',
    es: 'Acciones Rápidas',
  },
  'wallet.uploadContent': {
    en: 'Upload Content',
    es: 'Subir Contenido',
  },
  'wallet.goToDEX': {
    en: 'Go to DEX',
    es: 'Ir a DEX',
  },
  'wallet.viewAnalytics': {
    en: 'View Analytics',
    es: 'Ver Analíticas',
  },
  'wallet.potentialEarnings': {
    en: 'Potential Earnings',
    es: 'Ganancias Potenciales',
  },
  'wallet.achievements': {
    en: 'Achievements',
    es: 'Logros',
  },
  'wallet.earnMore': {
    en: 'Earn More',
    es: 'Gana Más',
  },
  'wallet.recentTransactions': {
    en: 'Recent Transactions',
    es: 'Transacciones Recientes',
  },
  'wallet.all': {
    en: 'All',
    es: 'Todas',
  },
  'wallet.sent': {
    en: 'Sent',
    es: 'Enviado',
  },
  'wallet.received': {
    en: 'Received',
    es: 'Recibido',
  },
  'wallet.swapped': {
    en: 'Swapped',
    es: 'Intercambiado',
  },
  'wallet.unstaked': {
    en: 'Unstaked',
    es: 'Desbloquear',
  },
  'wallet.noTransactionsFound': {
    en: 'No transactions found',
    es: 'No se encontraron transacciones',
  },
  'wallet.transactionHistoryWillAppear': {
    en: 'Your transaction history will appear here',
    es: 'Tu historial de transacciones aparecerá aquí',
  },
  'wallet.earningAchievements': {
    en: 'Earning Achievements',
    es: 'Logros de Ganancias',
  },
  'wallet.progress': {
    en: 'Progress',
    es: 'Progreso',
  },
  'wallet.reward': {
    en: 'Reward',
    es: 'Recompensa',
  },
  'wallet.whatYouCanDoWithDyo': {
    en: 'What You Can Do With $DYO Tokens',
    es: 'Qué Puedes Hacer con los Tokens $DYO',
  },
  'wallet.dyoTokensUnlockFeatures': {
    en: 'Your $DYO tokens unlock powerful features and opportunities across the DUJYO ecosystem.',
    es: 'Tus tokens $DYO desbloquean características poderosas y oportunidades en todo el ecosistema DUJYO.',
  },
  'wallet.transactionFilters': {
    en: 'Transaction Filters',
    es: 'Filtros de Transacciones',
  },
  'wallet.transactionHistory': {
    en: 'Transaction History',
    es: 'Historial de Transacciones',
  },
  'wallet.filterBy': {
    en: 'Filter by',
    es: 'Filtrar por',
  },
  'wallet.dateRange': {
    en: 'Date Range',
    es: 'Rango de Fechas',
  },
  'wallet.thisWeek': {
    en: 'This Week',
    es: 'Esta Semana',
  },
  'wallet.thisMonth': {
    en: 'This Month',
    es: 'Este Mes',
  },
  'wallet.allTime': {
    en: 'All Time',
    es: 'Todo el Tiempo',
  },
  
  // Upload Page - Additional
  'upload.selectContentType': {
    en: 'Select Content Type',
    es: 'Selecciona el Tipo de Contenido',
  },
  'upload.description': {
    en: 'Description',
    es: 'Descripción',
  },
  'upload.genre': {
    en: 'Genre',
    es: 'Género',
  },
  'upload.tags': {
    en: 'Tags',
    es: 'Etiquetas',
  },
  'upload.price': {
    en: 'Price (Optional)',
    es: 'Precio (Opcional)',
  },
  'upload.thumbnail': {
    en: 'Thumbnail',
    es: 'Miniatura',
  },
  'upload.browse': {
    en: 'Browse',
    es: 'Explorar',
  },
  'upload.maxFileSize': {
    en: 'Max file size:',
    es: 'Tamaño máximo:',
  },
  'upload.supportedFormats': {
    en: 'Supported formats:',
    es: 'Formatos soportados:',
  },
  'upload.publish': {
    en: 'Publish',
    es: 'Publicar',
  },
  'upload.publishing': {
    en: 'Publishing...',
    es: 'Publicando...',
  },
  'upload.saveDraft': {
    en: 'Save Draft',
    es: 'Guardar Borrador',
  },
  'upload.preview': {
    en: 'Preview',
    es: 'Vista Previa',
  },
  
  // Profile Page - Additional
  'profile.userProfile': {
    en: 'User Profile',
    es: 'Perfil de Usuario',
  },
  'profile.blockchainEnthusiast': {
    en: 'Blockchain Enthusiast',
    es: 'Entusiasta de Blockchain',
  },
  'profile.becomeArtist': {
    en: 'Become an Artist',
    es: 'Conviértete en Artista',
  },
  'profile.overview': {
    en: 'Overview',
    es: 'Resumen',
  },
  'profile.wallet': {
    en: 'Wallet',
    es: 'Billetera',
  },
  'profile.staking': {
    en: 'Staking',
    es: 'Bloquear',
  },
  'profile.achievements': {
    en: 'Achievements',
    es: 'Logros',
  },
  'profile.artistDashboard': {
    en: 'Artist Dashboard',
    es: 'Panel de Artista',
  },
  'profile.dyoBalance': {
    en: 'DYO Balance',
    es: 'Balance DYO',
  },
  'profile.dysBalance': {
    en: 'DYS Balance',
    es: 'Balance DYS',
  },
  'profile.staked': {
    en: 'Staked',
    es: 'Apostado',
  },
  'profile.nativeAddress': {
    en: 'Native Address',
    es: 'Dirección Nativa',
  },
  'profile.notConnected': {
    en: 'Not Connected',
    es: 'No Conectado',
  },
  'profile.walletDashboard': {
    en: 'Wallet Dashboard',
    es: 'Panel de Billetera',
  },
  'profile.yourLibrary': {
    en: 'Your Library',
    es: 'Tu Biblioteca',
  },
  'profile.likedContent': {
    en: 'Liked Content',
    es: 'Contenido que te Gusta',
  },
  'profile.recommendations': {
    en: 'Recommendations',
    es: 'Recomendaciones',
  },
  'profile.recentlyPlayed': {
    en: 'Recently Played',
    es: 'Reproducido Recientemente',
  },
  'profile.yourWalletAddress': {
    en: 'Your Wallet Address',
    es: 'Tu Dirección de Billetera',
  },
  'profile.walletAddressDesc': {
    en: 'Use this address to receive DYO tokens. Share it with others to receive payments.',
    es: 'Usa esta dirección para recibir tokens DYO. Compártela con otros para recibir pagos.',
  },
  'profile.walletManagement': {
    en: 'Wallet Management',
    es: 'Gestión de Billetera',
  },
  'profile.nativeBlockchainConnected': {
    en: 'Native Blockchain Connected',
    es: 'Blockchain Nativa Conectada',
  },
  'profile.nativeNetwork': {
    en: 'DUJYO Native Network • Real-time sync active',
    es: 'Red Nativa DUJYO • Sincronización en tiempo real activa',
  },
  'profile.live': {
    en: 'Live',
    es: 'En Vivo',
  },
  'profile.totalStaked': {
    en: 'Total Staked',
    es: 'Total Apostado',
  },
  'profile.availableRewards': {
    en: 'Available Rewards',
    es: 'Recompensas Disponibles',
  },
  'profile.nativeApy': {
    en: 'Native APY',
    es: 'APY Nativo',
  },
  'profile.stakeDyoTokens': {
    en: 'Stake DYO Tokens',
    es: 'Apostar Tokens DYO',
  },
  'profile.amountToStake': {
    en: 'Amount to Stake',
    es: 'Cantidad a Apostar',
  },
  'profile.stakingPeriod': {
    en: 'Staking Period',
    es: 'Período de Apuesta',
  },
  'profile.available': {
    en: 'Available',
    es: 'Disponible',
  },
  'profile.stakingInProgress': {
    en: 'Staking...',
    es: 'Apostando...',
  },
  'profile.stakeDyo': {
    en: 'Stake DYO',
    es: 'Apostar DYO',
  },
  'profile.activePositions': {
    en: 'Active Positions',
    es: 'Posiciones Activas',
  },
  'profile.lock': {
    en: 'Lock',
    es: 'Bloqueado',
  },
  'profile.rewards': {
    en: 'Rewards',
    es: 'Recompensas',
  },
  'profile.ends': {
    en: 'Ends',
    es: 'Termina',
  },
  'profile.unstaking': {
    en: 'Unstaking...',
    es: 'Desapostando...',
  },
  'profile.locked': {
    en: 'Locked',
    es: 'Bloqueado',
  },
  'profile.unstake': {
    en: 'Unstake',
    es: 'Desapostar',
  },
  'profile.claimRewards': {
    en: 'Claim Rewards',
    es: 'Reclamar Recompensas',
  },
  'profile.claiming': {
    en: 'Claiming...',
    es: 'Reclamando...',
  },
  'profile.stakingHistory': {
    en: 'Staking History',
    es: 'Historial de Apuestas',
  },
  'profile.refresh': {
    en: 'Refresh',
    es: 'Actualizar',
  },
  'profile.noStakingHistory': {
    en: 'No staking history yet',
    es: 'Aún no hay historial de apuestas',
  },
  'profile.stakingHistoryDesc': {
    en: 'Your staking transactions will appear here',
    es: 'Tus transacciones de apuesta aparecerán aquí',
  },
  'profile.unlocked': {
    en: 'Unlocked',
    es: 'Desbloqueado',
  },
  'profile.progress': {
    en: 'Progress',
    es: 'Progreso',
  },
  'profile.copy': {
    en: 'Copy',
    es: 'Copiar',
  },
  'profile.copied': {
    en: 'Copied!',
    es: '¡Copiado!',
  },
  'profile.pleaseConnectWallet': {
    en: 'Please connect your native blockchain wallet',
    es: 'Por favor conecta tu billetera blockchain nativa',
  },
  'profile.pleaseEnterValidAmount': {
    en: 'Please enter a valid amount',
    es: 'Por favor ingresa una cantidad válida',
  },
  'profile.insufficientBalance': {
    en: 'Insufficient DYO balance. Available: {{amount}} DYO',
    es: 'Balance DYO insuficiente. Disponible: {{amount}} DYO',
  },
  'profile.successfullyStaked': {
    en: 'Successfully staked {{amount}} DYO tokens!',
    es: '¡{{amount}} tokens DYO apostados exitosamente!',
  },
  'profile.errorPrefix': {
    en: 'Error',
    es: 'Error',
  },
  'profile.unknownError': {
    en: 'Unknown error',
    es: 'Error desconocido',
  },
  'profile.pleaseSelectPosition': {
    en: 'Please select a staking position to unstake',
    es: 'Por favor selecciona una posición de apuesta para desapostar',
  },
  'profile.noRewardsAvailable': {
    en: 'No rewards available to claim',
    es: 'No hay recompensas disponibles para reclamar',
  },
  'profile.successfullyClaimed': {
    en: 'Successfully claimed {{amount}} DYO rewards!',
    es: '¡{{amount}} recompensas DYO reclamadas exitosamente!',
  },
  'profile.achievementFirstTrade': {
    en: 'First Trade',
    es: 'Primera Transacción',
  },
  'profile.achievementFirstTradeDesc': {
    en: 'Completed your first DEX trade',
    es: 'Completaste tu primera transacción en DEX',
  },
  'profile.achievementMusicLover': {
    en: 'Music Lover',
    es: 'Amante de la Música',
  },
  'profile.achievementMusicLoverDesc': {
    en: 'Listened to 100+ tracks',
    es: 'Escuchaste más de 100 canciones',
  },
  'profile.achievementGamingMaster': {
    en: 'Gaming Master',
    es: 'Maestro del Gaming',
  },
  'profile.achievementGamingMasterDesc': {
    en: 'Played 50+ games',
    es: 'Jugaste más de 50 juegos',
  },
  'profile.achievementContentCreator': {
    en: 'Content Creator',
    es: 'Creador de Contenido',
  },
  'profile.achievementContentCreatorDesc': {
    en: 'Created 10+ pieces of content',
    es: 'Creaste más de 10 piezas de contenido',
  },
  'profile.achievementStakingPro': {
    en: 'Staking Pro',
    es: 'Profesional de Apuestas',
  },
  'profile.achievementStakingProDesc': {
    en: 'Staked 1000+ DYO tokens',
    es: 'Apostaste más de 1000 tokens DYO',
  },
  'profile.achievementEarlyAdopter': {
    en: 'Early Adopter',
    es: 'Adoptante Temprano',
  },
  'profile.achievementEarlyAdopterDesc': {
    en: 'Joined DUJYO in the first month',
    es: 'Te uniste a DUJYO en el primer mes',
  },
  'profile.achievementValidator': {
    en: 'Validator',
    es: 'Validador',
  },
  'profile.achievementValidatorDesc': {
    en: 'Became a network validator',
    es: 'Te convertiste en validador de la red',
  },
  'profile.achievementTopListener': {
    en: 'Top Listener',
    es: 'Top Oyente',
  },
  'profile.achievementTopListenerDesc': {
    en: 'Top 10% of music listeners',
    es: 'Top 10% de oyentes de música',
  },
  'profile.fullWalletAddress': {
    en: 'Full Wallet Address',
    es: 'Dirección Completa de Billetera',
  },
  'profile.walletNotConnected': {
    en: 'Wallet not connected',
    es: 'Billetera no conectada',
  },
  'profile.pleaseConnectWallet': {
    en: 'Please connect your native blockchain wallet',
    es: 'Por favor conecta tu billetera de blockchain nativa',
  },
  'profile.enterValidAmount': {
    en: 'Please enter a valid amount',
    es: 'Por favor ingresa una cantidad válida',
  },
  'profile.insufficientBalance': {
    en: 'Insufficient DYO balance',
    es: 'Balance DYO insuficiente',
  },
  'profile.selectStakingPosition': {
    en: 'Please select a staking position to unstake',
    es: 'Por favor selecciona una posición de apuesta para desapostar',
  },
  'profile.noRewardsAvailable': {
    en: 'No rewards available to claim',
    es: 'No hay recompensas disponibles para reclamar',
  },
  'profile.successfullyStaked': {
    en: 'Successfully staked',
    es: 'Apostado exitosamente',
  },
  'profile.successfullyUnstaked': {
    en: 'Successfully unstaked position!',
    es: '¡Posición desapostada exitosamente!',
  },
  'profile.received': {
    en: 'Received',
    es: 'Recibido',
  },
  'profile.successfullyClaimed': {
    en: 'Successfully claimed',
    es: 'Reclamado exitosamente',
  },
  'profile.dyoRewards': {
    en: 'DYO Rewards',
    es: 'Recompensas DYO',
  },
  
  // Marketplace
  'marketplace.title': {
    en: 'Marketplace',
    es: 'Mercado',
  },
  'marketplace.subtitle': {
    en: 'Discover and purchase exclusive content, NFTs, and licenses',
    es: 'Descubre y compra contenido exclusivo, NFTs y licencias',
  },
  'marketplace.content': {
    en: 'Content',
    es: 'Contenido',
  },
  'marketplace.digitalContent': {
    en: 'Digital Content',
    es: 'Contenido Digital',
  },
  'marketplace.nft': {
    en: 'NFT',
    es: 'NFT',
  },
  'marketplace.nftsCollectibles': {
    en: 'NFTs & Collectibles',
    es: 'NFTs y Coleccionables',
  },
  'marketplace.licenses': {
    en: 'Licenses',
    es: 'Licencias',
  },
  'marketplace.contentLicenses': {
    en: 'Content Licenses',
    es: 'Licencias de Contenido',
  },
  'marketplace.searchPlaceholder': {
    en: 'Search content, creators, NFTs...',
    es: 'Buscar contenido, creadores, NFTs...',
  },
  'marketplace.filter': {
    en: 'Filter',
    es: 'Filtrar',
  },
  'marketplace.category': {
    en: 'Category',
    es: 'Categoría',
  },
  'marketplace.priceRange': {
    en: 'Price Range',
    es: 'Rango de Precio',
  },
  'marketplace.contentType': {
    en: 'Content Type',
    es: 'Tipo de Contenido',
  },
  'marketplace.rating': {
    en: 'Rating',
    es: 'Calificación',
  },
  'marketplace.earningPotential': {
    en: 'Earning Potential',
    es: 'Potencial de Ganancia',
  },
  'marketplace.all': {
    en: 'All',
    es: 'Todos',
  },
  'marketplace.topCreators': {
    en: 'Top Creators',
    es: 'Top Creadores',
  },
  'marketplace.verified': {
    en: 'Verified',
    es: 'Verificado',
  },
  'marketplace.totalEarnings': {
    en: 'Total Earnings',
    es: 'Ganancias Totales',
  },
  'marketplace.contentCount': {
    en: 'Content',
    es: 'Contenido',
  },
  'marketplace.viewDetails': {
    en: 'View Details & Calculator',
    es: 'Ver Detalles y Calculadora',
  },
  'marketplace.purchase': {
    en: 'Purchase',
    es: 'Comprar',
  },
  'marketplace.buyNow': {
    en: 'Buy Now',
    es: 'Comprar Ahora',
  },
  'marketplace.purchasing': {
    en: 'Purchasing...',
    es: 'Comprando...',
  },
  'marketplace.items': {
    en: 'items',
    es: 'elementos',
  },
  'marketplace.streamingLicenseTiers': {
    en: 'Streaming License Tiers',
    es: 'Niveles de Licencia de Transmisión',
  },
  'marketplace.none': {
    en: 'None',
    es: 'Ninguno',
  },
  'marketplace.streamToEarnActive': {
    en: 'Stream-to-Earn Active',
    es: 'Transmite para Ganar Activo',
  },
  'marketplace.verifiedHighEarner': {
    en: 'Verified High Earner',
    es: 'Ganador Alto Verificado',
  },
  'marketplace.purchaseSuccess': {
    en: 'Purchase successful!',
    es: '¡Compra exitosa!',
  },
  'marketplace.purchaseFailed': {
    en: 'Purchase failed. Please try again.',
    es: 'Error en la compra. Por favor intenta de nuevo.',
  },
  'marketplace.earningsPerStream': {
    en: 'Earnings per Stream',
    es: 'Ganancias por Transmisión',
  },
  'marketplace.streamCount': {
    en: 'Stream Count',
    es: 'Conteo de Transmisiones',
  },
  'marketplace.royaltyShare': {
    en: 'Royalty Share',
    es: 'Participación de Regalías',
  },
  'marketplace.royalty': {
    en: 'Royalty',
    es: 'Regalía',
  },
  'marketplace.highEarner': {
    en: 'High Earner',
    es: 'Alto Ganador',
  },
  'marketplace.perStream': {
    en: 'Per Stream',
    es: 'Por Transmisión',
  },
  'marketplace.recent24h': {
    en: 'Recent 24h',
    es: 'Recientes 24h',
  },
  'marketplace.engagement': {
    en: 'Engagement',
    es: 'Compromiso',
  },
  'marketplace.viewDetailsCalculator': {
    en: 'View Details & Calculator',
    es: 'Ver Detalles y Calculadora',
  },
  'marketplace.engagementScore': {
    en: 'Engagement Score',
    es: 'Puntuación de Compromiso',
  },
  'marketplace.personalUse': {
    en: 'Personal Use',
    es: 'Uso Personal',
  },
  'marketplace.commercialLicense': {
    en: 'Commercial License',
    es: 'Licencia Comercial',
  },
  'marketplace.premiumLicense': {
    en: 'Premium License',
    es: 'Licencia Premium',
  },
  'marketplace.selectLicense': {
    en: 'Select License',
    es: 'Seleccionar Licencia',
  },
  'marketplace.basicStreamingRights': {
    en: 'Basic streaming rights',
    es: 'Derechos básicos de transmisión',
  },
  'marketplace.noCommercialUse': {
    en: 'No commercial use',
    es: 'Sin uso comercial',
  },
  'marketplace.personalListening': {
    en: 'Personal listening/viewing',
    es: 'Escucha/visualización personal',
  },
  'marketplace.commercialStreamingRights': {
    en: 'Commercial streaming rights',
    es: 'Derechos de transmisión comercial',
  },
  'marketplace.royaltySharePercent': {
    en: 'royalty share',
    es: 'participación de regalías',
  },
  'marketplace.contentMonetization': {
    en: 'Content monetization',
    es: 'Monetización de contenido',
  },
  'marketplace.analyticsAccess': {
    en: 'Analytics access',
    es: 'Acceso a analíticas',
  },
  'marketplace.fullCommercialRights': {
    en: 'Full commercial rights',
    es: 'Derechos comerciales completos',
  },
  'marketplace.prioritySupport': {
    en: 'Priority support',
    es: 'Soporte prioritario',
  },
  'marketplace.advancedAnalytics': {
    en: 'Advanced analytics',
    es: 'Analíticas avanzadas',
  },
  'marketplace.contentPromotion': {
    en: 'Content promotion',
    es: 'Promoción de contenido',
  },
  'marketplace.nftMintingRights': {
    en: 'NFT minting rights',
    es: 'Derechos de acuñación NFT',
  },
  'marketplace.earningCalculator': {
    en: 'Earning Calculator',
    es: 'Calculadora de Ganancias',
  },
  'marketplace.expectedStreams': {
    en: 'Expected Streams',
    es: 'Transmisiones Esperadas',
  },
  'marketplace.audienceSize': {
    en: 'Audience Size',
    es: 'Tamaño de Audiencia',
  },
  'marketplace.projectedEarnings': {
    en: 'Projected Earnings',
    es: 'Ganancias Proyectadas',
  },
  'marketplace.roi': {
    en: 'ROI',
    es: 'ROI',
  },
  'marketplace.breakEvenStreams': {
    en: 'Break Even Streams',
    es: 'Transmisiones de Punto de Equilibrio',
  },
  'marketplace.calculate': {
    en: 'Calculate',
    es: 'Calcular',
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

