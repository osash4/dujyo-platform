import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Music,
  Video,
  Gamepad2,
  Wallet,
  TrendingUp,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  ChevronRight,
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or data attribute
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  content?: React.ReactNode;
  icon?: React.ComponentType<any>;
  action?: () => void;
}

interface OnboardingTourProps {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  autoStart?: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  tourId,
  steps,
  onComplete,
  onSkip,
  showSkip = true,
  autoStart = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(autoStart);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      const completed = localStorage.getItem(`tour_${tourId}_completed`);
      if (completed === 'true' && !autoStart) {
        setIsVisible(false);
        return;
      }
      highlightStep(currentStep);
    }
  }, [currentStep, isVisible, tourId, autoStart]);

  const highlightStep = (stepIndex: number) => {
    if (stepIndex >= steps.length) return;

    const step = steps[stepIndex];
    const element = document.querySelector(step.target) as HTMLElement;

    if (element) {
      setHighlightedElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        updateTooltipPosition(element);
      }, 300);
    }
  };

  const updateTooltipPosition = (element: HTMLElement) => {
    if (!tooltipRef.current || !overlayRef.current) return;

    const rect = element.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const overlay = overlayRef.current;

    const step = steps[currentStep];
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = rect.top - tooltipRect.height - 20;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - 20;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + 20;
        break;
      case 'center':
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
        break;
    }

    tooltip.style.top = `${Math.max(20, top)}px`;
    tooltip.style.left = `${Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20))}px`;

    // Create highlight overlay
    const highlightRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    overlay.style.setProperty('--highlight-top', `${highlightRect.top}px`);
    overlay.style.setProperty('--highlight-left', `${highlightRect.left}px`);
    overlay.style.setProperty('--highlight-width', `${highlightRect.width}px`);
    overlay.style.setProperty('--highlight-height', `${highlightRect.height}px`);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    if (onSkip) onSkip();
  };

  const handleComplete = () => {
    localStorage.setItem(`tour_${tourId}_completed`, 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const startTour = () => {
    setCurrentStep(0);
    setIsVisible(true);
  };

  if (!isVisible) {
    return (
      <button
        onClick={startTour}
        className="btn-primary fixed bottom-6 right-6 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
      >
        <Sparkles className="w-5 h-5" />
        <span>Start Tour</span>
      </button>
    );
  }

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon || HelpCircle;

  return (
    <>
      {/* Overlay with highlight */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse var(--highlight-width, 0) var(--highlight-height, 0) at 
            calc(var(--highlight-left, 0) + var(--highlight-width, 0) / 2) 
            calc(var(--highlight-top, 0) + var(--highlight-height, 0) / 2),
            transparent 40%,
            rgba(0, 0, 0, 0.7) 100%
          )`,
        }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 text-white rounded-xl shadow-2xl p-6 max-w-sm pointer-events-auto card border border-amber-400/20"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{currentStepData.title}</h3>
                  <p className="text-sm text-gray-400">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
              {showSkip && (
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="mb-6">
              {currentStepData.content || (
                <p className="text-gray-300">{currentStepData.description}</p>
              )}
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex gap-1 mb-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{
                      background: index === currentStep
                        ? 'linear-gradient(135deg, #F59E0B, #EA580C)'
                        : index < currentStep
                        ? '#FBBF24'
                        : 'var(--bg-card)'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="btn-primary px-6 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="btn-primary px-6 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Predefined tours
export const artistDashboardTour: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard',
    description: 'This is your central hub for managing all your content and earnings across music, video, and gaming.',
    target: '[data-tour="dashboard"]',
    position: 'center',
    icon: Sparkles,
  },
  {
    id: 'metrics',
    title: 'Unified Metrics',
    description: 'View your total earnings, engagement, and audience across all content types in one place.',
    target: '[data-tour="metrics"]',
    position: 'bottom',
    icon: TrendingUp,
  },
  {
    id: 'content-hub',
    title: 'Content Hub',
    description: 'Upload and manage all your content - music, videos, and gaming content - from one place.',
    target: '[data-tour="content-hub"]',
    position: 'bottom',
    icon: Music,
  },
  {
    id: 'dex',
    title: 'Quick DEX Swap',
    description: 'Convert your DYO earnings to stablecoins instantly right from your dashboard.',
    target: '[data-tour="dex"]',
    position: 'left',
    icon: Wallet,
  },
  {
    id: 'earnings',
    title: 'Earnings & Royalties',
    description: 'Track your streaming revenue, NFT sales, and cross-platform royalties.',
    target: '[data-tour="earnings"]',
    position: 'bottom',
    icon: DollarSign,
  },
];

export const userFlowTour: TourStep[] = [
  {
    id: 'discover',
    title: 'Discover Content',
    description: 'Browse music, videos, and games from creators worldwide.',
    target: '[data-tour="discover"]',
    position: 'bottom',
    icon: Music,
  },
  {
    id: 'stream-earn',
    title: 'Stream & Earn',
    description: 'Listen to music and automatically earn DYO tokens for every stream.',
    target: '[data-tour="stream-earn"]',
    position: 'right',
    icon: TrendingUp,
  },
  {
    id: 'staking',
    title: 'Stake Your Tokens',
    description: 'Stake your DYO tokens to earn passive rewards and support the network.',
    target: '[data-tour="staking"]',
    position: 'left',
    icon: Wallet,
  },
  {
    id: 'community',
    title: 'Join the Community',
    description: 'Connect with other users and discover new content through our social features.',
    target: '[data-tour="community"]',
    position: 'top',
    icon: Users,
  },
];

export default OnboardingTour;

