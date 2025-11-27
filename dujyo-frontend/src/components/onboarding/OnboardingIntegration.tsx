/**
 * OnboardingIntegration.tsx
 * 
 * Este archivo muestra cómo integrar los componentes de onboarding
 * en la aplicación Dujyo. Puedes importar y usar estos componentes
 * en cualquier parte de tu aplicación.
 */

import React, { useState } from 'react';
import { OnboardingTour, artistDashboardTour, userFlowTour } from './OnboardingTour';
import HelpCenter from './HelpCenter';
import FeedbackWidget from './FeedbackWidget';

/**
 * Ejemplo de integración del sistema de onboarding completo
 */
export const OnboardingIntegration: React.FC = () => {
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  return (
    <>
      {/* Help Center - Puede ser activado desde cualquier botón de ayuda */}
      {showHelpCenter && (
        <HelpCenter
          onClose={() => setShowHelpCenter(false)}
        />
      )}

      {/* Onboarding Tour - Se activa automáticamente o manualmente */}
      {tourActive && (
        <OnboardingTour
          tourId="artist-dashboard"
          steps={artistDashboardTour}
          onComplete={() => {
            console.log('Tour completado');
            setTourActive(false);
          }}
          onSkip={() => setTourActive(false)}
          autoStart={false}
        />
      )}

      {/* Feedback Widget - Siempre visible en la esquina */}
      <FeedbackWidget
        position="bottom-right"
        onFeedbackSubmit={async (feedback) => {
          // Enviar feedback al backend
          try {
            const response = await fetch('/api/v1/feedback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(feedback),
            });
            if (!response.ok) {
              throw new Error('Error enviando feedback');
            }
          } catch (error) {
            console.error('Error:', error);
          }
        }}
      />
    </>
  );
};

/**
 * Hook para usar el sistema de onboarding
 */
export const useOnboarding = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);

  return {
    showHelpCenter: () => setShowHelp(true),
    hideHelpCenter: () => setShowHelp(false),
    startTour: () => setShowTour(true),
    stopTour: () => setShowTour(false),
    HelpCenter: showHelp ? <HelpCenter onClose={() => setShowHelp(false)} /> : null,
    Tour: showTour ? (
      <OnboardingTour
        tourId="user-flow"
        steps={userFlowTour}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
      />
    ) : null,
  };
};

export default OnboardingIntegration;

