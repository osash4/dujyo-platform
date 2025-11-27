# Sistema de Onboarding Dujyo

## 📦 Componentes Disponibles

### 1. OnboardingTour.tsx
Walkthrough interactivo con highlights en la UI.

**Uso:**
```tsx
import { OnboardingTour, artistDashboardTour } from './components/onboarding/OnboardingTour';

<OnboardingTour
  tourId="artist-dashboard"
  steps={artistDashboardTour}
  onComplete={() => console.log('Tour completado')}
  onSkip={() => console.log('Tour saltado')}
  autoStart={false}
/>
```

**Tours Predefinidos:**
- `artistDashboardTour`: Tour para artistas
- `userFlowTour`: Tour para usuarios

### 2. HelpCenter.tsx
Centro de ayuda con documentación y búsqueda.

**Uso:**
```tsx
import HelpCenter from './components/onboarding/HelpCenter';

<HelpCenter
  onClose={() => setShowHelp(false)}
  initialCategory="getting-started"
  initialSearch="como subir canción"
/>
```

### 3. FeedbackWidget.tsx
Widget de feedback in-app flotante.

**Uso:**
```tsx
import FeedbackWidget from './components/onboarding/FeedbackWidget';

<FeedbackWidget
  position="bottom-right"
  onFeedbackSubmit={async (feedback) => {
    // Enviar al backend
    await fetch('/api/v1/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }}
/>
```

## 🔧 Integración en App.tsx

### Agregar Help Center Button
```tsx
import HelpCenter from './components/onboarding/HelpCenter';

const [showHelp, setShowHelp] = useState(false);

// En el header o sidebar:
<button onClick={() => setShowHelp(true)}>
  <HelpCircle /> Help Center
</button>

{showHelp && <HelpCenter onClose={() => setShowHelp(false)} />}
```

### Agregar Tour Button
```tsx
import { OnboardingTour, artistDashboardTour } from './components/onboarding/OnboardingTour';

const [tourActive, setTourActive] = useState(false);

// Botón para iniciar tour:
<button onClick={() => setTourActive(true)}>
  Start Tour
</button>

{tourActive && (
  <OnboardingTour
    tourId="artist-dashboard"
    steps={artistDashboardTour}
    onComplete={() => setTourActive(false)}
    onSkip={() => setTourActive(false)}
  />
)}
```

### Agregar Feedback Widget
```tsx
import FeedbackWidget from './components/onboarding/FeedbackWidget';

// Simplemente incluir en cualquier componente:
<FeedbackWidget position="bottom-right" />
```

## 📝 Atributos Data-Tour

Para que el OnboardingTour funcione correctamente, agrega atributos `data-tour` a los elementos:

```tsx
<div data-tour="dashboard">
  {/* Dashboard content */}
</div>

<div data-tour="metrics">
  {/* Metrics content */}
</div>

<div data-tour="content-hub">
  {/* Content Hub */}
</div>
```

## 🎯 Tours Disponibles

### Artist Dashboard Tour
- `dashboard`: Dashboard principal
- `metrics`: Métricas unificadas
- `content-hub`: Content Hub
- `dex`: Quick DEX Swap
- `earnings`: Earnings & Royalties

### User Flow Tour
- `discover`: Descubrir contenido
- `stream-earn`: Stream & Earn
- `staking`: Staking de tokens
- `community`: Comunidad

## 📚 Documentación

Las guías completas están en:
- `/docs/artist-guide.md`: Guía para artistas
- `/docs/user-guide.md`: Guía para usuarios

## 🚀 Próximos Pasos

1. Agregar atributos `data-tour` a los componentes principales
2. Integrar HelpCenter en el header
3. Agregar FeedbackWidget globalmente
4. Crear tours personalizados según necesidades

