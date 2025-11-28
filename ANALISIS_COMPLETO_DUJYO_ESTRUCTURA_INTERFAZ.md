# 📊 ANÁLISIS COMPLETO DE PLATAFORMA DUJYO - ESTRUCTURA E INTERFAZ

**Fecha de Análisis:** Noviembre 2025  
**Versión del Sistema:** Dujyo Frontend v2.1  
**Framework:** React 18 + TypeScript + React Router v6  
**Última Actualización:** Noviembre 2025

---

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura de Páginas](#1-arquitectura-de-páginas)
2. [Componentes de Interfaz](#2-componentes-de-interfaz)
3. [Diseño Responsive](#3-diseño-responsive)
4. [Sistema de Logo y Branding](#4-sistema-de-logo-y-branding)
5. [Recomendaciones de Implementación](#5-recomendaciones-de-implementación)

---

## 1. ARQUITECTURA DE PÁGINAS

### 1.1. Mapa Completo de Rutas

#### **RUTAS PÚBLICAS** (Sin autenticación requerida)

| Ruta | Componente | Descripción | Layout |
|------|-----------|-------------|--------|
| `/` | `ExploreNow` | Página principal de exploración | Sin layout |
| `/home` | `HomePage` | Página de inicio alternativa | Sin layout |
| `/login` | `Login` | Página de inicio de sesión | Sin layout |
| `/signin` | `Login` | Alias de login | Sin layout |
| `/signup` | `SignupPage` | Página de registro | Sin layout |
| `/explore` | `ExploreNow` | Exploración principal | Sin layout |
| `/explore/music` | `ExploreMusic` | Explorar música | Sin layout |
| `/explore/video` | `ExploreVideo` | Explorar videos | Sin layout |
| `/explore/gaming` | `ExploreGaming` | Explorar juegos | Sin layout |
| `/explore/education` | `ExploreEducation` | Explorar educación | Sin layout |
| `/onboarding` | `OnboardingFlow` | Flujo de onboarding | Sin layout |
| `/music` | `MusicPage` | Página de música | Sin layout |
| `/video` | `VideoPage` | Página de videos | Sin layout |
| `/gaming` | `GamingPage` | Página de juegos | Sin layout |
| `/search` | `SearchPage` | Búsqueda global | Sin layout |

#### **RUTAS PROTEGIDAS** (Requieren autenticación)

##### **Rutas con SimpleAppLayout**
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/profile` | `ProfilePage` | Perfil de usuario |
| `/settings` | `SettingsPage` | Configuración de cuenta |

##### **Rutas con ArtistLayout** (Solo para Artists)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/artist/dashboard` | `ArtistDashboard` | Dashboard principal de artista |
| `/artist/royalties` | `RoyaltiesManager` | Gestión de regalías |
| `/artist/upload` | `UploadMusic` | Subir contenido |
| `/artist/video` | `VideoManager` | Gestión de videos |
| `/artist/gaming` | `GamingManager` | Gestión de juegos |
| `/artist/analytics` | `CrossPlatformAnalytics` | Analytics multiplataforma |
| `/artist/content` | `ContentManager` | Gestión de catálogo |
| `/artist/fans` | `FanEngagement` | Engagement con fans |
| `/payments` | `PaymentDashboard` | Dashboard de pagos |
| `/analytics/realtime` | `RealTimeAnalyticsDashboard` | Analytics en tiempo real |
| `/royalties/overview` | `RoyaltiesOverview` | Resumen de regalías |
| `/royalties/overview` | `RoyaltiesOverview` | Resumen de regalías |
| `/royalties/external-report` | `ExternalReportForm` | Reportes externos |
| `/payments` | `PaymentDashboard` | Dashboard de pagos |
| `/discovery/leaderboard` | `DiscoveryLeaderboard` | Leaderboard de descubrimiento |
| `/discovery/stats/:userId` | `UserDiscoveryStats` | Estadísticas de usuario |

##### **Rutas sin Layout Específico** (Componentes independientes)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/become-artist` | `BecomeArtist` | Onboarding para artistas |
| `/wallet` | `WalletDashboard` | Dashboard de billetera |
| `/artist-portal` | `ArtistPortal` | Portal de artista (legacy) |
| `/wallet-connector` | `WalletConnector` | Conector de billetera |
| `/marketplace` | `ContentMarketplace` | Marketplace de contenido |
| `/dex` | `DEXPage` | Intercambio descentralizado |
| `/staking` | `StakingPage` | Staking de tokens |
| `/upload` | `UploadPage` | Subir contenido (genérico) |
| `/consensus` | `ConsensusPage` | Consenso CPV |
| `/validator` | `ValidatorPage` | Panel de validador |
| `/validator/rewards` | `ValidatorRewardsPage` | Recompensas de validador |
| `/validator/stats` | `ValidatorStatsPage` | Estadísticas de validador |
| `/admin` | `AdminPage` | Panel de administración |
| `/admin/users` | `AdminUsersPage` | Gestión de usuarios |
| `/admin/content` | `AdminContentPage` | Moderación de contenido |
| `/admin/blockchain` | `AdminBlockchainPage` | Administración blockchain |
| `/admin/analytics` | `AdminAnalyticsPage` | Analytics del sistema |
| `/blockchain-info` | `BlockchainInfo` | Información blockchain |
| `/add-transaction` | `TransactionForm` | Formulario de transacción |
| `/view-blockchain` | `BlockchainView` | Vista de blockchain |
| `/add-validator` | `ValidatorForm` | Formulario de validador |

#### **RUTA CATCH-ALL**
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `*` | `NotFoundPage` | Página 404 |

### 1.2. Estructura de Navegación Principal

#### **Sistema de Navegación por Roles**

La plataforma implementa **navegación dinámica basada en roles de usuario**:

##### **1. Listener (Oyente)**
- Discover (`/`)
- Music (`/music`)
- Videos (`/video`)
- Games (`/gaming`)
- Shop (`/marketplace`)
- DEX (`/dex`)
- My Profile (`/profile`)
- Settings (`/settings`)

##### **2. Artist (Artista)**
- Multistreaming Dashboard (`/artist/dashboard`)
- Music (`/music`)
- Videos (`/video`)
- Gaming (`/gaming`)
- Marketplace (`/marketplace`)
- Artist Profile (`/profile`)

##### **3. Validator (Validador)**
- Validator Hub (`/`)
- Validation Panel (`/validator`)
- CPV Consensus (`/consensus`)
- Rewards (`/validator/rewards`)
- Network Stats (`/validator/stats`)
- Validator Profile (`/profile`)

##### **4. Admin (Administrador)**
- Admin Panel (`/`)
- User Management (`/admin/users`)
- Content Moderation (`/admin/content`)
- Blockchain (`/admin/blockchain`)
- System Analytics (`/admin/analytics`)
- Admin Profile (`/profile`)

### 1.3. Layouts Base

#### **1.3.1. SimpleAppLayout**
**Ubicación:** `src/components/Layout/SimpleAppLayout.tsx`

**Características:**
- **Sidebar derecho con Edge Reveal** (aparece al acercarse al borde)
- **Navegación por iconos** (sin texto, solo iconos)
- **SpotifyBottomNav** en la parte inferior
- **Global Player** cuando hay música reproduciéndose
- **Zona de detección de proximidad** de 60px en el borde derecho
- **Animaciones con Framer Motion**

**Estructura:**
```
┌─────────────────────────────────────┐
│                                     │
│      Main Content Area              │
│      (children)                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│   SpotifyBottomNav (fixed bottom)  │
└─────────────────────────────────────┘
                    │
                    │ Edge Reveal Zone (60px)
                    ▼
┌──────────────────┐
│  Sidebar (80px)  │
│  - Icons only    │
│  - Navigation    │
│  - Language      │
│  - Help          │
│  - Logout        │
└──────────────────┘
```

**Uso:** Páginas de perfil y configuración

#### **1.3.2. ArtistLayout**
**Ubicación:** `src/layouts/ArtistLayout.tsx`

**Características:**
- **Sidebar izquierdo fijo** (320px de ancho)
- **Navegación completa con texto e iconos**
- **Secciones organizadas:**
  - Artist Tools (herramientas de artista)
  - General (navegación general)
- **Header con branding** ("Artist Portal")
- **Footer con versión** ("DUJYO Artist Portal v2.0")
- **Responsive:** Se oculta en móvil con overlay
- **Global Player** integrado

**Estructura:**
```
┌──────────────┬──────────────────────────┐
│              │                          │
│  Sidebar     │   Main Content Area      │
│  (320px)     │   (flex-1)               │
│              │                          │
│  - Header    │   {children}             │
│  - Artist    │                          │
│    Tools     │                          │
│  - General   │                          │
│  - Footer    │                          │
│              │                          │
└──────────────┴──────────────────────────┘
```

**Uso:** Todas las rutas `/artist/*` y rutas relacionadas con artistas

#### **1.3.3. AppLayout** (Legacy/Alternativo)
**Ubicación:** `src/components/Layout/AppLayout.tsx`

**Características:**
- **Sidebar izquierdo fijo** (256px)
- **Header móvil** con logo
- **BottomNavBar** en móvil
- **Navegación básica** (hardcoded)

**Estado:** Parece ser un layout alternativo o legacy, no se usa en las rutas principales

#### **1.3.4. Sin Layout**
**Páginas sin layout específico:**
- Páginas públicas (Login, Signup, ExploreNow)
- Páginas de contenido (Music, Video, Gaming)
- Componentes independientes (Wallet, DEX, Marketplace)

---

## 2. COMPONENTES DE INTERFAZ

### 2.1. Header Actual

#### **2.1.1. SimpleAppLayout - Sin Header Tradicional**
- **NO tiene header fijo en la parte superior**
- La navegación está en el **sidebar derecho** (Edge Reveal)
- El **SpotifyBottomNav** actúa como barra de navegación inferior

#### **2.1.2. ArtistLayout - Header en Sidebar**
**Ubicación:** Dentro del sidebar izquierdo (`src/layouts/ArtistLayout.tsx`)

**Estado Actual:**
- **Header del sidebar** con información del artista
- **Mensaje de bienvenida** con nombre de usuario
- **Estadísticas de ganancias** (weekly earnings, stream count)
- **Navegación organizada** en secciones: Artist Tools y General

**Características:**
- **Sidebar izquierdo fijo** (320px de ancho)
- **Navegación completa** con iconos y texto
- **Secciones organizadas:**
  - Artist Tools (herramientas de artista)
  - General (navegación general)
- **Footer con versión** ("DUJYO Artist Portal v2.0")
- **Responsive:** Se oculta en móvil con overlay
- **Global Player** integrado

#### **2.1.3. AppLayout - Header Móvil**
**Ubicación:** `src/components/Layout/AppLayout.tsx` (líneas 106-118)

```tsx
<header className="md:hidden bg-gray-800 p-4 flex items-center justify-between">
  <button onClick={toggleSidebar}>☰</button>
  <Logo size="sm" variant="icon" showText={false} />
  <Logo size="sm" variant="text" className="ml-2" />
  <div className="w-6" />
</header>
```

**Características:**
- **Solo visible en móvil** (`md:hidden`)
- **Logo icon + texto** centrado
- **Botón hamburguesa** para toggle sidebar

### 2.2. Sistema de Navegación

#### **2.2.1. SpotifyBottomNav**
**Ubicación:** `src/components/Layout/SpotifyBottomNav.tsx`

**Estructura:**
```
┌─────────────────────────────────────────────────────┐
│ [Profile] [Search Bar + Home + Browse] [DUJYO Logo] │
└─────────────────────────────────────────────────────┘
```

**Componentes:**
- **Izquierda:** Avatar de usuario (click → `/profile`)
- **Centro:** Barra de búsqueda con botones Home y Browse
- **Derecha:** Logo DUJYO (icon only, size="sm")

**Uso:** En `SimpleAppLayout` (fixed bottom)

#### **2.2.2. Sidebar (SimpleAppLayout)**
**Ubicación:** Dentro de `SimpleAppLayout.tsx`

**Características:**
- **Edge Reveal:** Aparece al acercarse al borde derecho
- **Solo iconos** (48x48px cada uno)
- **Tooltips** con labels al hover
- **Animaciones** de entrada/salida
- **Items dinámicos** según rol de usuario

**Elementos:**
- Navegación principal (iconos)
- Separador
- Language Selector
- Help Center button
- Logout button

#### **2.2.3. Sidebar (ArtistLayout)**
**Ubicación:** Dentro de `ArtistLayout.tsx`

**Estructura:**
```
┌─────────────────────────────┐
│ Header (Logo + Title)       │
├─────────────────────────────┤
│ Artist Tools Section         │
│ - Artist Portal             │
│ - Royalties                 │
│ - Payments                  │
│ - Content Hub               │
│ - Video Content             │
│ - Gaming Content            │
│ - Analytics                 │
│ - My Content                │
│ - Fan Engagement            │
├─────────────────────────────┤
│ General Section             │
│ - Discover Music            │
│ - Videos                    │
│ - Gaming                    │
│ - Marketplace               │
│ - Profile Settings          │
├─────────────────────────────┤
│ Language Selector           │
│ Help Center                 │
│ Sign Out                    │
├─────────────────────────────┤
│ Footer (Version)            │
└─────────────────────────────┘
```

#### **2.2.4. BottomNavBar** (Componente independiente)
**Ubicación:** `src/components/BottomNavBar/BottomNavBar.tsx`

**Características:**
- **Navegación horizontal** con scroll
- **Iconos + labels** pequeños
- **Botones de acción** (Wallet, Logout/Login)
- **Fixed bottom** con backdrop blur

**Uso:** En `AppLayout` (legacy) para móvil

### 2.3. Puntos de Branding Actual

#### **2.3.1. Logo en ExploreNow (Página Principal)**
**Ubicación:** `src/pages/ExploreNow/ExploreNow.tsx` (líneas 133-145)

**Implementación Responsive:**
```tsx
{/* Mobile: Large icon */}
<Logo size="4xl" variant="icon" showText={false} className="md:hidden" />
{/* Desktop: Complete logo (icon + text) */}
<div className="hidden md:flex flex-col items-center gap-3">
  <Logo size="4xl" variant="icon" showText={false} />
  <Logo size="3xl" variant="text" />
</div>
```

**Características:**
- **Móvil:** Logo icon 4xl (400x400px) solo
- **Desktop:** Logo icon 4xl + Logo text 3xl (combinado)
- **Efectos:** Glow, animaciones, partículas flotantes (Sparkles)
- **Posición:** Centro de la hero section
- **Animaciones:** Framer Motion con hover effects

#### **2.3.2. Logo en Login/Signup**
**Ubicación:** `src/pages/Login.tsx` y `src/pages/SignupPage.tsx`

**Implementación:**
- **Combinación:** Icon + Text (separados)
- **Tamaños:** Icon 2xl (240x240px) + Text xl (180x180px aprox)
- **Posición:** Centro del formulario
- **Efectos:** Animaciones con Framer Motion

#### **2.3.3. Logo en Sidebar (SimpleAppLayout)**
**Ubicación:** `src/components/Layout/SimpleAppLayout.tsx`

**Estado Actual:**
- El sidebar derecho (Edge Reveal) **NO tiene logo actualmente**
- Solo contiene iconos de navegación
- **Oportunidad:** Agregar logo pequeño en la parte superior del sidebar

**Nota:** El componente `Sidebar.tsx` mencionado en el análisis anterior puede no estar en uso actualmente

#### **2.3.4. Logo en SpotifyBottomNav (BottomNav)**
**Ubicación:** `src/components/Layout/BottomNav.tsx` (línea 92)

```tsx
<Logo size="sm" showText={false} variant="icon" />
```

**Características:**
- **Tamaño:** sm (40x40px)
- **Variant:** icon only
- **Posición:** Derecha de la barra inferior fija
- **Contexto:** Barra de navegación inferior tipo Spotify con:
  - Avatar de usuario (izquierda)
  - Barra de búsqueda con botones Home y Browse (centro)
  - Logo DUJYO (derecha)

#### **2.3.5. Logo en AppLayout (Móvil)**
**Ubicación:** `src/components/Layout/AppLayout.tsx` (líneas 115-116)

```tsx
<Logo size="sm" variant="icon" showText={false} />
<Logo size="sm" variant="text" className="ml-2" />
```

- **Combinación:** Icon + Text (ambos sm)
- **Posición:** Header móvil

#### **2.3.6. Logo en DEXPage**
**Ubicación:** `src/pages/DEXPage.tsx` (líneas 137-138)

```tsx
<Logo size="3xl" showText={false} variant="icon" className="mb-6" />
<Logo size="2xl" variant="text" />
```

- **Combinación:** Icon (3xl) + Text (2xl)
- **Posición:** Hero section

#### **2.3.7. Logo en Otras Páginas**
- **MusicPage, VideoPage, GamingPage:** Logo icon (lg) en secciones específicas
- **ProfilePage:** Logo icon (lg) integrado
- **OnboardingFlow:** Logo icon (3xl) + Text (2xl)
- **DEXPage:** Logo icon (3xl) + Text (2xl) en hero section
- **ArtistLayout:** Actualmente NO tiene logo en el header del sidebar (oportunidad de mejora)

---

## 3. DISEÑO RESPONSIVE

### 3.1. Breakpoints Definidos

**Ubicación:** `src/styles/mobile-responsive.css`

```css
--mobile-xs: 320px;
--mobile-sm: 375px;
--mobile-md: 414px;
--mobile-lg: 480px;
--tablet-sm: 768px;    /* md: */
--tablet-md: 1024px;   /* lg: */
--desktop-sm: 1280px;
--desktop-md: 1440px;
--desktop-lg: 1920px;
```

### 3.2. Sistema de Breakpoints Tailwind

La aplicación usa **Tailwind CSS** con breakpoints estándar:

- **sm:** 640px
- **md:** 768px (tablet)
- **lg:** 1024px (desktop pequeño)
- **xl:** 1280px (desktop)
- **2xl:** 1536px (desktop grande)

### 3.3. Adaptación Móvil/Desktop

#### **3.3.1. SimpleAppLayout**
- **Desktop:** Sidebar derecho con Edge Reveal
- **Móvil:** SpotifyBottomNav siempre visible, sidebar oculto por defecto

#### **3.3.2. ArtistLayout**
- **Desktop:** Sidebar izquierdo fijo (320px)
- **Móvil:** 
  - Sidebar oculto por defecto
  - Header móvil con hamburger menu
  - Overlay oscuro cuando sidebar está abierto

```tsx
{/* Mobile Header */}
<header className="md:hidden bg-gray-800 p-4 flex items-center justify-between">
  <button onClick={toggleSidebar}>☰</button>
  <h1>Artist Portal</h1>
  <div className="w-6" />
</header>
```

#### **3.3.3. Grids Responsive**

**Patrón común en toda la aplicación:**

```tsx
// 1 columna en móvil, 2 en tablet, 3+ en desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

**Ejemplos:**
- `ArtistDashboard`: `grid-cols-1 md:grid-cols-3`
- `ContentManager`: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `WalletDashboard`: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

#### **3.3.4. Texto Responsive**

```tsx
// Tamaños de texto adaptativos
<h1 className="text-4xl md:text-6xl">Título</h1>
<p className="text-xl md:text-2xl">Subtítulo</p>
```

### 3.4. Componentes que Cambian entre Vistas

#### **Navegación:**
- **Desktop:** Sidebar visible
- **Móvil:** Bottom navigation o hamburger menu

#### **Headers:**
- **Desktop:** Integrados en sidebar o sin header
- **Móvil:** Headers fijos con logo y menu

#### **Cards/Grids:**
- **Desktop:** 3-4 columnas
- **Tablet:** 2 columnas
- **Móvil:** 1 columna

---

## 4. SISTEMA DE LOGO Y BRANDING

### 4.1. Componente Logo

**Ubicación:** `src/components/common/Logo.tsx`

#### **4.1.1. Props del Componente**

```typescript
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showText?: boolean;
  className?: string;
  variant?: 'icon' | 'text' | 'full';
  withBackground?: boolean;
}
```

#### **4.1.2. Tamaños Disponibles**

| Tamaño | Dimensiones | Font Size |
|--------|------------|-----------|
| sm | 40x40px | text-lg |
| md | 64x64px | text-xl |
| lg | 120x120px | text-2xl |
| xl | 180x180px | text-4xl |
| 2xl | 240x240px | text-5xl |
| 3xl | 320x320px | text-6xl |
| 4xl | 400x400px | text-7xl |
| 5xl | 500x500px | text-8xl |

#### **4.1.3. Variants**

##### **variant="icon"**
- Muestra **solo el logo SVG** (icon)
- **Ruta:** `/assets/brand/DUJYO Icon/{tamaño}{-transparent}.svg`
- **Ejemplo:** `/assets/brand/DUJYO Icon/512x512-transparent.svg`
- **Tamaños disponibles:** 32x32, 40x40, 64x64, 120x120, 512x512
- **Efecto glow:** Drop shadow con color amber/orange cuando `withBackground={false}`

##### **variant="text"**
- Muestra **solo el texto "DUJYO"** como SVG
- **Ruta:** `/assets/brand/DUJYO Logo/{tamaño}{-transparent}.svg`
- **Ejemplo:** `/assets/brand/DUJYO Logo/240x60-transparent.svg`
- **Tamaños disponibles:** 120x30, 160x40, 240x60, 512x128
- **Efecto glow:** Drop shadow con color amber/orange cuando `withBackground={false}`
- **Dimensiones:** Ancho más ancho que alto (proporción horizontal)

##### **variant="full"**
- Muestra el **logo completo** (SVG que incluye icon + texto)
- **Ruta:** `/assets/brand/DUJYO Logo-Complete/{tamaño}{-transparent}.svg`
- **Ejemplo:** `/assets/brand/DUJYO Logo-Complete/480x120-transparent.svg`
- **Tamaños disponibles:** 160x40, 240x60, 320x80, 480x120, 640x160, 800x200, 960x240, 1200x300
- **Selección automática:** El componente selecciona el tamaño más cercano al solicitado
- **Efecto glow:** Drop shadow con color amber/orange cuando `withBackground={false}`

#### **4.1.4. Estructura de Archivos de Assets (ACTUALIZADA)**

**Nueva estructura organizada por carpetas:**

```
/public/assets/brand/
  ├── DUJYO Icon/
  │   ├── 32x32.svg / 32x32-transparent.svg
  │   ├── 40x40.svg / 40x40-transparent.svg
  │   ├── 64x64.svg / 64x64-transparent.svg
  │   ├── 120x120.svg / 120x120-transparent.svg
  │   └── 512x512.svg / 512x512-transparent.svg
  ├── DUJYO Logo/
  │   ├── 120x30.svg / 120x30-transparent.svg
  │   ├── 160x40.svg / 160x40-transparent.svg
  │   ├── 240x60.svg / 240x60-transparent.svg
  │   └── 512x128.svg / 512x128-transparent.svg
  └── DUJYO Logo-Complete/
      ├── 160x40.svg / 160x40-transparent.svg
      ├── 240x60.svg / 240x60-transparent.svg
      ├── 320x80.svg / 320x80-transparent.svg
      ├── 480x120.svg / 480x120-transparent.svg
      ├── 640x160.svg / 640x160-transparent.svg
      ├── 800x200.svg / 800x200-transparent.svg
      ├── 960x240.svg / 960x240-transparent.svg
      └── 1200x300.svg / 1200x300-transparent.svg
```

**Notas:**
- Cada tamaño tiene versión **con background** (`.svg`) y **transparente** (`-transparent.svg`)
- El componente `Logo` selecciona automáticamente el tamaño más cercano disponible
- Los espacios en las rutas se codifican automáticamente (`%20`)

### 4.2. Espacios Disponibles para Logo

#### **4.2.1. Header Superior (MainHeader) - ✅ IMPLEMENTADO**

**Ubicación:** `src/components/Layout/MainHeader.tsx`

**Estado Actual (Actualizado Noviembre 2025):**
- ✅ **Header fijo implementado:** MainHeader component creado
- ✅ **Logo + navegación:** Logo icon + text con navegación principal
- ✅ **Búsqueda global:** Barra de búsqueda integrada (desktop)
- ✅ **Notificaciones:** Icono de notificaciones con badge
- ✅ **Perfil de usuario:** Avatar y menú de usuario
- ✅ **Responsive:** Visible solo en desktop (>1024px), oculto en móvil

**Características:**
- Header fijo superior con backdrop blur
- Logo clickeable para navegar a home
- Navegación principal (Explore, Music, Video, Gaming)
- Barra de búsqueda con funcionalidad completa
- Integrado en SimpleAppLayout y ArtistLayout

#### **4.2.2. Sidebar Izquierdo (ArtistLayout)**

**Ubicación:** `src/layouts/ArtistLayout.tsx`

**Estado Actual:**
- **Header del sidebar:** Contiene información del usuario y estadísticas
- **NO tiene logo actualmente** - Solo texto "Artist Portal" y mensaje de bienvenida
- **Espacio disponible:** ~320px de ancho (todo el sidebar)

**Recomendación:**
- Agregar **Logo icon (md/lg)** en el header del sidebar
- Agregar **Logo text (sm/md)** debajo o al lado del icon
- Reemplazar o complementar el texto "Artist Portal" con branding oficial

#### **4.2.3. Sidebar Derecho (SimpleAppLayout)**

**Ubicación:** `src/components/Layout/SimpleAppLayout.tsx`

**Estado Actual (Actualizado Noviembre 2025):**
- ✅ **Logo implementado:** Logo icon (sm) en la parte superior del sidebar
- ✅ **Mejoras agregadas:**
  - Click para navegar a home
  - Hover effects mejorados
  - Tooltip "DUJYO - Go to Home"
  - Animaciones suaves

**Características del Sidebar:**
- **Edge Reveal:** Aparece al acercarse al borde derecho (60px de zona de detección)
- **Logo + iconos** de navegación (48x48px cada uno)
- **Tooltips** con labels al hover
- **Animaciones** de entrada/salida con Framer Motion
- **Items dinámicos** según rol de usuario

**Implementación:**
```tsx
<div onClick={() => navigate('/')} title="DUJYO - Go to Home">
  <Logo size="sm" variant="icon" showText={false} />
</div>
```

#### **4.2.4. SpotifyBottomNav**

**Ubicación:** `src/components/Layout/SpotifyBottomNav.tsx` (línea 92)

**Estado actual:**
- Logo icon (sm) en la **derecha**
- 40x40px

**Oportunidades:**
- Mantener icon solo (actual)
- Agregar texto al hacer hover
- Cambiar a logo + texto en desktop

#### **4.2.5. Páginas Públicas (Login, Signup, ExploreNow)**

**Estado actual:**
- ✅ **ExploreNow:** Logo responsive - icon 4xl en móvil, icon 4xl + text 3xl en desktop
- ✅ **Login/Signup:** Logo 2xl (icon) + xl (text)
- ✅ **OnboardingFlow:** Logo icon (3xl) + Text (2xl)
- ✅ **Footer:** Logo icon + text agregado (Noviembre 2025)

**Estado:** ✅ Bien implementado y visible. No requiere cambios adicionales.

### 4.3. Lugares Ideales para Cada Versión del Logo

#### **4.3.1. Logo Solo (Icon)**

**Ubicaciones actuales:**
- ✅ SpotifyBottomNav (derecha)
- ✅ ExploreNow (centro hero)
- ✅ DEXPage (hero section)
- ✅ MusicPage, VideoPage, GamingPage (secciones)

**Nuevas ubicaciones recomendadas:**
- ✅ **Header fijo superior** (✅ IMPLEMENTADO - MainHeader)
- 🔄 **Favicon** (ya debería estar)
- 🔄 **Loading screens**
- 🔄 **Notifications/Toasts**
- ✅ **ArtistLayout sidebar header** (✅ IMPLEMENTADO - Logo icon + text)
- ✅ **SimpleAppLayout sidebar** (✅ IMPLEMENTADO - Logo icon con mejoras)

#### **4.3.2. Texto Solo (Text)**

**Ubicaciones actuales:**
- ✅ Login/Signup (centro)
- ✅ Sidebar (SimpleAppLayout)
- ✅ DEXPage (hero)

**Nuevas ubicaciones recomendadas:**
- ✅ **Footer** (✅ IMPLEMENTADO - Logo icon + text)
- 🔄 **Email templates**
- 🔄 **PDF reports**

#### **4.3.3. Logo Completo (Full/Combinado)**

**Ubicaciones actuales:**
- ✅ Login/Signup (icon + text separados)
- ✅ Sidebar (icon + text separados)
- ✅ DEXPage (icon + text separados)

**Nuevas ubicaciones recomendadas:**
- ✅ **Header principal** (✅ IMPLEMENTADO - MainHeader con logo icon + text)
- ✅ **ArtistLayout sidebar header** (✅ IMPLEMENTADO - Logo icon + text)
- 🔄 **Email signatures**
- 🔄 **Documentación**
- ✅ **SimpleAppLayout sidebar** (✅ IMPLEMENTADO - Logo icon mejorado)

---

## 5. RECOMENDACIONES DE IMPLEMENTACIÓN

### 5.1. Archivos Clave que Necesitan Modificación

#### **5.1.1. Para Agregar Header Principal**

**Archivos a crear/modificar:**

1. **`src/components/Layout/MainHeader.tsx`** (NUEVO)
   - Header fijo superior
   - Logo + navegación + búsqueda + perfil
   - Responsive (oculto en móvil, visible en desktop)

2. **`src/components/Layout/SimpleAppLayout.tsx`** (MODIFICAR)
   - Agregar `<MainHeader />` antes del main content
   - Ajustar padding-top del main para compensar header

3. **`src/layouts/ArtistLayout.tsx`** (MODIFICAR)
   - Opcional: Agregar header superior además del sidebar
   - O mejorar el header del sidebar con logo

#### **5.1.2. Para Mejorar Branding en Sidebars**

**Archivos a modificar:**

1. **`src/layouts/ArtistLayout.tsx`** (header del sidebar)
   ```tsx
   // AGREGAR en el header del sidebar:
   <div className="flex items-center space-x-3 mb-4">
     <Logo size="md" variant="icon" showText={false} />
     <Logo size="sm" variant="text" />
   </div>
   // O mantener el texto "Artist Portal" y agregar logo debajo
   ```

2. **`src/components/Layout/SimpleAppLayout.tsx`**
   - Agregar logo en la parte superior del sidebar derecho
   - Opcional: Logo fijo pequeño siempre visible

#### **5.1.3. Para Agregar Logo en Footer**

**Archivos a modificar:**

1. **`src/components/Footer.tsx`** (líneas 1-7)
   ```tsx
   // AGREGAR:
   <div className="flex items-center justify-center gap-3 mb-4">
     <Logo size="sm" variant="icon" showText={false} />
     <Logo size="sm" variant="text" />
   </div>
   ```

### 5.2. Estructura Recomendada de Header Principal

```tsx
// src/components/Layout/MainHeader.tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
  <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
    {/* Left: Logo + Navigation */}
    <div className="flex items-center gap-6">
      <Logo size="md" variant="icon" showText={false} />
      <Logo size="sm" variant="text" />
      <nav className="hidden md:flex gap-4">
        {/* Navigation items */}
      </nav>
    </div>
    
    {/* Center: Search (desktop) */}
    <div className="hidden lg:flex flex-1 max-w-md mx-4">
      {/* Search bar */}
    </div>
    
    {/* Right: User menu + Notifications */}
    <div className="flex items-center gap-3">
      {/* User avatar, notifications, etc */}
    </div>
  </div>
</header>
```

### 5.3. Matriz de Implementación de Logo

| Ubicación | Variant Recomendado | Tamaño | Prioridad | Estado |
|-----------|-------------------|--------|-----------|--------|
| **Header Principal** (MainHeader) | icon + text | md + sm | 🔴 Alta | ✅ **IMPLEMENTADO** |
| **ArtistLayout Sidebar Header** | icon + text | md + sm | 🔴 Alta | ✅ **IMPLEMENTADO** |
| **SimpleAppLayout Sidebar** | icon | sm | 🟡 Media | ✅ **IMPLEMENTADO** |
| **Footer** | icon + text | sm + sm | 🟡 Media | ✅ **IMPLEMENTADO** |
| **BottomNav** | icon | sm | 🟢 Baja | ✅ Ya implementado |
| **Login/Signup** | icon + text | 2xl + xl | 🟢 Baja | ✅ Ya implementado |
| **ExploreNow** | icon + text (responsive) | 4xl + 3xl | 🟢 Baja | ✅ Ya implementado |

### 5.4. Consideraciones de Responsive

#### **Desktop (>1024px)**
- Header completo con logo + texto
- Sidebar con logo visible
- Footer con logo

#### **Tablet (768px - 1024px)**
- Header simplificado (solo logo icon)
- Sidebar colapsable
- Footer con logo pequeño

#### **Móvil (<768px)**
- Header mínimo (solo logo icon)
- Bottom navigation (ya tiene logo)
- Footer simplificado

### 5.5. Checklist de Implementación

#### **Fase 1: Branding Básico (Alta Prioridad)**
- [x] ✅ Agregar logo en ArtistLayout sidebar header
- [x] ✅ Agregar logo en SimpleAppLayout sidebar
- [x] ✅ Verificar que todos los assets de logo existan (✅ Estructura actualizada con carpetas organizadas)

#### **Fase 2: Header Principal (Media Prioridad)**
- [x] ✅ Crear componente MainHeader
- [x] ✅ Integrar en SimpleAppLayout
- [x] ✅ Integrar en ArtistLayout (opcional)
- [x] ✅ Ajustar responsive

#### **Fase 3: Branding Completo (Baja Prioridad)**
- [x] ✅ Agregar logo en Footer
- [ ] Mejorar logo en páginas públicas (ya están bien implementadas)
- [ ] Agregar logo en loading states
- [ ] Agregar logo en emails/notificaciones

---

## 6. RESUMEN EJECUTIVO

### 6.1. Estado Actual

✅ **Fortalezas:**
- Sistema de Logo bien estructurado y flexible
- Navegación responsive funcional
- Branding presente en páginas clave (Login, ExploreNow)
- Layouts diferenciados por rol de usuario

✅ **Mejoras Implementadas (Noviembre 2025):**
- ✅ **Header principal fijo** implementado (MainHeader) - Visible en desktop
- ✅ **Branding consistente** entre layouts
- ✅ **Sidebar de ArtistLayout** tiene logo oficial (icon + text)
- ✅ **SimpleAppLayout sidebar** tiene logo mejorado (icon con hover effects)
- ✅ **Footer** tiene branding completo (logo icon + text)
- ✅ **Estructura de assets actualizada** - Logo component usa nueva estructura de carpetas organizadas

🔄 **Oportunidades Futuras (Baja Prioridad):**
- Agregar logo en loading states
- Agregar logo en emails/notificaciones
- Agregar logo en documentación

### 6.2. Estado de Implementación

✅ **COMPLETADO (Noviembre 2025):**
1. ✅ **ALTA:** Logo oficial agregado en ArtistLayout sidebar header
2. ✅ **ALTA:** Logo mejorado en SimpleAppLayout sidebar (Edge Reveal)
3. ✅ **MEDIA:** Header principal creado (MainHeader) con logo y navegación
4. ✅ **MEDIA:** Logo agregado en Footer
5. ✅ **COMPLETADO:** Estructura de assets de logo organizada y componente Logo actualizado

🔄 **Pendientes (Baja Prioridad):**
- Mejorar branding en componentes secundarios (loading states, emails, etc.)

### 6.3. Archivos Críticos

**Para modificar branding:**
- `src/components/common/Logo.tsx` (componente base)
- `src/layouts/ArtistLayout.tsx` (header sidebar)
- `src/components/Layout/SimpleAppLayout.tsx` (sidebar)
- `src/components/Footer.tsx` (footer)

**Header principal:**
- ✅ `src/components/Layout/MainHeader.tsx` (✅ CREADO E IMPLEMENTADO)
- ✅ `src/components/Layout/SimpleAppLayout.tsx` (✅ INTEGRADO)
- ✅ `src/layouts/ArtistLayout.tsx` (✅ INTEGRADO)

---

## 📝 NOTAS FINALES

- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS + CSS Modules
- **Animaciones:** Framer Motion
- **Icons:** Lucide React
- **Estado:** Context API (Auth, Blockchain, Player, WebSocket)

**Última actualización:** Noviembre 2025 - Basado en análisis del código fuente actual

**Estado de Implementación:** ✅ Todas las mejoras de branding de alta y media prioridad han sido implementadas (Noviembre 2025)

---

## 7. CAMBIOS RECIENTES (Noviembre 2025)

### 7.1. Nuevas Rutas Agregadas
- `/onboarding` - Flujo de onboarding completo
- `/royalties/overview` - Resumen de regalías
- `/payments` - Dashboard de pagos
- `/discovery/leaderboard` - Leaderboard de descubrimiento
- `/discovery/stats/:userId` - Estadísticas de usuario

### 7.2. Componente Logo Actualizado
- **Nueva estructura de archivos:** Organizados en carpetas `DUJYO Icon/`, `DUJYO Logo/`, `DUJYO Logo-Complete/`
- **Selección automática de tamaños:** El componente selecciona el tamaño más cercano disponible
- **Soporte para múltiples variantes:** icon, text, full con diferentes tamaños
- **Efectos visuales mejorados:** Drop shadows y glow effects cuando `withBackground={false}`

### 7.3. ExploreNow Mejorado
- **Logo responsive:** Diferente en móvil (icon solo) vs desktop (icon + text)
- **Animaciones mejoradas:** Partículas flotantes y efectos de glow
- **Mejor jerarquía visual:** Logo más prominente y mejor integrado

### 7.4. BottomNav (SpotifyBottomNav)
- **Barra de navegación inferior tipo Spotify**
- **Logo integrado** en la parte derecha
- **Búsqueda integrada** con botones Home y Browse
- **Avatar de usuario** en la parte izquierda

### 7.5. Contextos y Providers
- **EventBusProvider:** Sistema de eventos global
- **WebSocketProvider:** Conexión WebSocket mejorada
- **PlayerProvider:** Gestión de reproductor global
- **BlockchainProvider:** Integración blockchain

### 7.6. Componentes de Onboarding
- **OnboardingFlow:** Flujo completo de onboarding
- **OnboardingTour:** Tours guiados para artistas
- **HelpCenter:** Centro de ayuda integrado
- **FeedbackWidget:** Widget de feedback global
- **LanguageSelector:** Selector de idioma

### 7.7. Mejoras de Branding Implementadas (Noviembre 2025)

#### **7.7.1. MainHeader Component**
- ✅ Componente creado: `src/components/Layout/MainHeader.tsx`
- ✅ Logo icon + text clickeable
- ✅ Navegación principal (Explore, Music, Video, Gaming)
- ✅ Barra de búsqueda (desktop)
- ✅ Notificaciones y perfil de usuario
- ✅ Responsive: visible solo en desktop (>1024px)
- ✅ Integrado en SimpleAppLayout y ArtistLayout

#### **7.7.2. Logo en ArtistLayout Sidebar**
- ✅ Logo icon (md) + text (sm) en header del sidebar
- ✅ Reemplazado logo `variant="full"` por combinación icon + text
- ✅ Mejor visibilidad y consistencia

#### **7.7.3. Logo Mejorado en SimpleAppLayout Sidebar**
- ✅ Logo icon (sm) con mejoras:
  - Click para navegar a home
  - Hover effects mejorados
  - Tooltip informativo
  - Animaciones suaves

#### **7.7.4. Logo en Footer**
- ✅ Logo icon + text agregado
- ✅ Centrado y con espaciado adecuado
- ✅ Mantiene copyright debajo

#### **7.7.5. Archivos Modificados/Creados**
- ✅ Creado: `src/components/Layout/MainHeader.tsx`
- ✅ Modificado: `src/layouts/ArtistLayout.tsx`
- ✅ Modificado: `src/components/Layout/SimpleAppLayout.tsx`
- ✅ Modificado: `src/components/Footer.tsx`

---

## 📝 NOTAS FINALES

- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6 con future flags (v7_startTransition, v7_relativeSplatPath)
- **Styling:** Tailwind CSS + CSS Modules
- **Animaciones:** Framer Motion
- **Icons:** Lucide React
- **Estado:** Context API (Auth, Blockchain, Player, WebSocket, EventBus)
- **Error Handling:** ErrorBoundary global
- **WebSocket:** Conexión en tiempo real con fallback graceful

---

## 8. CAMBIOS RECIENTES Y OPTIMIZACIONES (Noviembre 2025)

### 8.1. Optimización del Repositorio

#### **8.1.1. Reducción Masiva de Tamaño**
- **Antes:** 5.7GB (1.23GB pack + 4.21GB garbage)
- **Después:** 36MB (35.60MB pack, 0 garbage)
- **Reducción:** 99.4% del tamaño original
- **Impacto:** Pushes de horas a segundos

#### **8.1.2. Archivos Removidos del Historial**
- ✅ `target/` (archivos de compilación Rust)
- ✅ `node_modules/` (dependencias Node.js)
- ✅ `*.log` (archivos de logs)
- ✅ `*.wav`, `*.mp3`, `*.mp4` (archivos de música/video grandes)
- ✅ `.env*` (archivos de entorno con secretos)
- ✅ `archive/` (archivos duplicados)

#### **8.1.3. .gitignore Mejorado**
- ✅ Exclusión completa de `target/` y `node_modules/`
- ✅ Exclusión de logs y archivos temporales
- ✅ Exclusión de archivos de música/video grandes
- ✅ Exclusión de archivos de entorno y secretos
- ✅ Exclusión de archivos de build y distribución

### 8.2. Fixes de Deployment

#### **8.2.1. Variables de Entorno para Host/Port**
**Archivos Modificados:**
- ✅ `src/server.rs` - Usa `HOST` y `PORT` env vars
- ✅ `src/main_optimized.rs` - Usa `HOST` y `PORT` env vars
- ✅ `src/bin/test_mvp_flow.rs` - Usa variables de entorno
- ✅ `src/legacy_rpc_proxy.rs` - Usa variables de entorno
- ✅ `src/services/blockchainService.rs` - Usa variables de entorno
- ✅ `src/rpc_server.rs` - Usa variables de entorno

**Implementación:**
```rust
// Antes (hardcoded):
let listener = tokio::net::TcpListener::bind("127.0.0.1:8083").await?;

// Después (variables de entorno):
let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
let port = std::env::var("PORT").unwrap_or_else(|_| "8083".to_string()).parse().unwrap_or(8083);
let bind_addr = format!("{}:{}", host, port);
let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
```

**Valores por Defecto:**
- `HOST`: `0.0.0.0` (para producción en Render/cloud)
- `PORT`: `8083` (pero lee de `$PORT` para compatibilidad con Render)

#### **8.2.2. Beneficios para Deployment**
- ✅ Render puede detectar el puerto automáticamente
- ✅ El servidor se bindea a `0.0.0.0` para aceptar conexiones externas
- ✅ Compatible con variables de entorno de plataformas cloud
- ✅ Mantiene compatibilidad con desarrollo local

### 8.3. Estado del Backend

#### **8.3.1. Estructura Actual**
```
dujyo-backend/
├── src/
│   ├── main.rs                    # Punto de entrada
│   ├── server.rs                  # Servidor Axum (con HOST/PORT fix)
│   ├── main_optimized.rs          # Versión optimizada (con HOST/PORT fix)
│   ├── lib.rs                     # Módulos exportados
│   ├── blockchain/                # Módulos blockchain
│   │   ├── gas_fees.rs           # Sistema de gas fees
│   │   ├── native_token.rs       # Token nativo DYO
│   │   ├── real_blockchain.rs    # Blockchain principal
│   │   └── ...
│   ├── gas/                       # Sistema avanzado de gas
│   │   ├── creative_gas_engine.rs
│   │   ├── auto_swap_handler.rs
│   │   └── ...
│   ├── utils/                     # Utilidades
│   │   ├── access_control.rs     # RBAC (con bootstrap system user)
│   │   ├── safe_math.rs          # Matemáticas seguras
│   │   ├── vrf.rs                # Verifiable Random Function
│   │   └── ...
│   ├── middleware/                # Middleware
│   │   └── rate_limiting.rs      # Rate limiting con Redis
│   ├── security/                  # Seguridad
│   │   ├── rate_limiting_redis.rs
│   │   └── rate_limiter_memory.rs
│   └── routes/                    # Rutas API
│       └── metrics.rs            # Métricas del sistema
├── tests/                         # Tests
│   ├── gas_fees_test.rs          # Tests de gas fees (17 tests)
│   ├── rate_limiting_test.rs     # Tests de rate limiting
│   └── e2e_test.rs               # Tests end-to-end
└── Cargo.toml                    # Dependencias
```

#### **8.3.2. Tests**
- ✅ **60 tests pasando** (0 fallidos)
- ✅ Tests de gas fees validados (17 tests)
- ✅ Tests de rate limiting refactorizados
- ✅ Tests de access control con bootstrap
- ✅ Tests de VRF corregidos
- ✅ Tests de safe math mejorados

#### **8.3.3. Compilación**
- ✅ Build release exitoso
- ✅ Sin errores de compilación
- ✅ Warnings menores (no críticos)
- ✅ Binario funcional y estable

### 8.4. Estado del Frontend

#### **8.4.1. Push a GitHub**
- ✅ Frontend completo subido a GitHub
- ✅ Estructura React + TypeScript completa
- ✅ Componentes y rutas documentados
- ⚠️ Archivos de música grandes (>50MB) - GitHub recomienda Git LFS

#### **8.4.2. Estructura Actual**
```
dujyo-frontend/
├── src/
│   ├── App.tsx                    # Componente principal
│   ├── main.tsx                   # Punto de entrada
│   ├── components/                # Componentes React
│   │   ├── Layout/               # Layouts (SimpleAppLayout, ArtistLayout)
│   │   ├── DEX/                  # DEX components
│   │   ├── Player/               # Music player
│   │   ├── artist/               # Artist dashboard components
│   │   └── ...
│   ├── pages/                     # Páginas principales
│   ├── contexts/                  # Context API
│   │   ├── AuthContext.tsx
│   │   ├── BlockchainContext.tsx
│   │   └── ...
│   ├── services/                  # Servicios API
│   └── hooks/                     # Custom hooks
├── public/                        # Archivos estáticos
│   ├── assets/brand/              # Branding assets
│   └── music/                     # Archivos de música (grandes)
└── package.json                   # Dependencias Node.js
```

### 8.5. Configuración de Deployment

#### **8.5.1. Variables de Entorno Requeridas**
```bash
# Backend
HOST=0.0.0.0                    # Host para binding (default: 0.0.0.0)
PORT=8083                       # Puerto del servidor (default: 8083)
DATABASE_URL=...                # URL de PostgreSQL
REDIS_URL=...                   # URL de Redis
JWT_SECRET=...                  # Secret para JWT
LEGACY_PROXY_URL=...            # URL del proxy legacy
HTTP_API_URL=...                # URL de la API HTTP
RPC_HOST=...                    # Host del RPC server
RPC_PORT=...                    # Puerto del RPC server

# Frontend
VITE_API_URL=...                # URL del backend API
VITE_WS_URL=...                 # URL del WebSocket
```

#### **8.5.2. Render Deployment**
- ✅ Backend listo para deployment (usa `$PORT` automáticamente)
- ✅ Frontend puede deployarse como static site
- ✅ Variables de entorno configuradas
- ✅ Servidor se bindea a `0.0.0.0` para aceptar conexiones

### 8.6. Mejoras de Performance

#### **8.6.1. Repositorio Optimizado**
- ✅ Pushes rápidos (segundos en lugar de horas)
- ✅ Clones más rápidos
- ✅ Menor uso de ancho de banda
- ✅ Mejor experiencia de desarrollo

#### **8.6.2. Código Optimizado**
- ✅ Sin hardcoded values
- ✅ Configuración flexible vía env vars
- ✅ Mejor separación de concerns
- ✅ Tests completos y pasando

### 8.7. Próximos Pasos Recomendados

1. **Deployment en Render:**
   - Configurar variables de entorno
   - Deploy backend como Web Service
   - Deploy frontend como Static Site
   - Configurar PostgreSQL y Redis

2. **Optimización de Archivos Grandes:**
   - Considerar Git LFS para archivos de música
   - O mover archivos de música a CDN/storage externo

3. **Monitoreo:**
   - Configurar métricas en producción
   - Monitorear rate limiting
   - Tracking de performance

---

**Última actualización:** 27 de Noviembre 2025 - Incluye optimizaciones de repositorio y fixes de deployment

