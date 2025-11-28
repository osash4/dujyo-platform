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
    en: 'Music',
    es: 'Música',
  },
  'music.subtitle': {
    en: 'Discover and stream your favorite tracks',
    es: 'Descubre y transmite tus canciones favoritas',
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
  
  // Profile
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

