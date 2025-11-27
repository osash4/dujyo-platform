//! Simplified Onboarding Flow for DUJYO
//! 
//! This component provides a Web2.5 onboarding experience:
//! - Email/Google login without wallet initially
//! - Auto-generated custodial wallet
//! - Interactive tutorial (5 steps)
//! - Free 100 DYO tokens
//! - Gradual Web3 conversion

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import Logo from '../common/Logo';
import '../../styles/neon-colors.css';
import { getApiBaseUrl } from '../../utils/apiConfig';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Gift,
  Wallet,
  Music,
  Video,
  Gamepad2,
  Star,
  Shield,
  Zap,
  Users,
  TrendingUp,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// ===========================================
// TYPES & INTERFACES
// ===========================================

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  isCompleted: boolean;
  isOptional: boolean;
}

interface OnboardingStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  googleReady?: boolean;
}

interface OnboardingData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  fullName: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  marketingEmails: boolean;
    loginMethod: 'email' | 'google';
  custodialWalletCreated: boolean;
  tutorialCompleted: boolean;
  freeTokensClaimed: boolean;
  web3ConversionStarted: boolean;
}

// ===========================================
// ONBOARDING FLOW COMPONENT
// ===========================================

const OnboardingFlow: React.FC = () => {
  const { signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    fullName: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    marketingEmails: false,
    loginMethod: 'email',
    custodialWalletCreated: false,
    tutorialCompleted: false,
    freeTokensClaimed: false,
    web3ConversionStarted: false,
  });

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "Welcome to DUJYO",
      description: "Let's get you started with your Web3 entertainment journey",
      component: WelcomeStep,
      isCompleted: false,
      isOptional: false,
    },
    {
      id: 2,
      title: "Create Your Account",
      description: "Sign up with email or social login",
      component: AccountCreationStep,
      isCompleted: false,
      isOptional: false,
    },
    {
      id: 3,
      title: "Your Wallet is Ready",
      description: "We've created a secure custodial wallet for you",
      component: WalletCreationStep,
      isCompleted: false,
      isOptional: false,
    },
    {
      id: 4,
      title: "Claim Your Free Tokens",
      description: "Get 100 DYO tokens to start exploring",
      component: TokenClaimStep,
      isCompleted: false,
      isOptional: false,
    },
    {
      id: 5,
      title: "Quick Tutorial",
      description: "Learn how to use DUJYO in 2 minutes",
      component: TutorialStep,
      isCompleted: false,
      isOptional: true,
    },
    {
      id: 6,
      title: "You're All Set!",
      description: "Welcome to the future of entertainment",
      component: CompletionStep,
      isCompleted: false,
      isOptional: false,
    },
  ];

  // Wait for Google OAuth script to load
  useEffect(() => {
    const checkGoogle = setInterval(() => {
      if ((window as any).google && (window as any).google.accounts) {
        setGoogleReady(true);
        clearInterval(checkGoogle);
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkGoogle);
    }, 10000);
    
    return () => {
      clearInterval(checkGoogle);
    };
  }, []);

  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Complete onboarding process
      await completeOnboarding(data);
      
      // Redirect to profile page (user's main dashboard)
      window.location.href = '/profile';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (onboardingData: OnboardingData) => {
    // Validate required fields
    if (!onboardingData.email || !onboardingData.password) {
      throw new Error('Email and password are required');
    }
    
    if (onboardingData.password !== onboardingData.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (!onboardingData.agreeToTerms || !onboardingData.agreeToPrivacy) {
      throw new Error('You must agree to the terms and privacy policy');
    }
    
    // Call the real registration endpoint using AuthContext
    // This will:
    // 1. Create user account in database
    // 2. Generate custodial wallet
    // 3. Return JWT token
    // 4. Set user in AuthContext
    // 5. Save token in localStorage
    await signUp(
      onboardingData.email,
      onboardingData.password,
      onboardingData.username || onboardingData.fullName || onboardingData.email.split('@')[0]
    );
    
    // Note: signUp already handles:
    // - Saving JWT token to localStorage
    // - Setting user in AuthContext
    // - Redirecting to /profile
    // So we don't need to do that here
  };

  const currentStepData = steps[currentStep];
  const CurrentStepComponent = currentStepData.component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-hero)' }}>
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-300">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Main Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="card backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-amber-400/20"
        >
          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}

          {/* Step Content */}
          <CurrentStepComponent
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            data={data}
            updateData={updateData}
            googleReady={googleReady}
          />

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex space-x-3">
              {currentStepData.isOptional && (
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
                >
                  Skip
                </button>
              )}

              {currentStep === steps.length - 1 ? (
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="btn-primary flex items-center space-x-2 px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all transform hover:scale-105"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Completing...' : 'Complete Setup'}</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="btn-primary flex items-center space-x-2 px-6 py-3 rounded-lg transition-all transform hover:scale-105"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Step Indicators */}
        <div className="flex justify-center space-x-2 mt-6">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentStep
                  ? 'scale-125'
                  : index < currentStep
                  ? ''
                  : ''
              }`}
              style={{
                backgroundColor: index === currentStep 
                  ? 'var(--primary-accent)' 
                  : index < currentStep 
                  ? 'var(--highlight)' 
                  : 'var(--bg-card)'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ===========================================
// STEP COMPONENTS
// ===========================================

const WelcomeStep: React.FC<OnboardingStepProps> = () => {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, type: "spring", stiffness: 100 }}
        >
          <Logo size="3xl" variant="icon" showText={false} className="mb-6" />
          <Logo size="2xl" variant="text" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
            Welcome to DUJYO
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          The future of entertainment is here. Stream, create, and earn in the Web3 ecosystem powered by blockchain.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card rounded-lg p-6 border border-amber-400/20 hover:border-amber-400/40 transition-all"
        >
          <Music className="w-8 h-8 text-amber-400 mx-auto mb-4 icon-music" />
          <h3 className="text-lg font-semibold text-white mb-2 neon-text-music">Stream Music</h3>
          <p className="text-gray-300 text-sm">Discover and stream your favorite tracks while earning DYO rewards</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card rounded-lg p-6 border border-orange-400/20 hover:border-orange-400/40 transition-all"
        >
          <Video className="w-8 h-8 text-orange-400 mx-auto mb-4 icon-video" />
          <h3 className="text-lg font-semibold text-white mb-2 neon-text-video">Watch Videos</h3>
          <p className="text-gray-300 text-sm">Enjoy high-quality video content with interactive Web3 features</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card rounded-lg p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition-all"
        >
          <Gamepad2 className="w-8 h-8 text-cyan-400 mx-auto mb-4 icon-gaming" />
          <h3 className="text-lg font-semibold text-white mb-2 neon-text-gaming">Play Games</h3>
          <p className="text-gray-300 text-sm">Experience Web3 gaming with play-to-earn mechanics</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center space-x-4 text-sm text-gray-300"
      >
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span>Secure</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-orange-400" />
          <span>Community</span>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Earn Rewards</span>
        </div>
      </motion.div>
    </div>
  );
};

const AccountCreationStep: React.FC<OnboardingStepProps> = ({ data, updateData, googleReady = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation is handled by parent component

  const handleGoogleLogin = async () => {
    try {
      updateData({ loginMethod: 'google' });
      
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        alert('Google OAuth is not configured. Please contact support or use email registration.');
        return;
      }
      
      // Wait for Google OAuth to load (up to 5 seconds)
      let attempts = 0;
      while (!(window as any).google || !(window as any).google.accounts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
        if (attempts > 25) {
          alert('Google Sign-In is taking too long to load. Please refresh the page and try again.');
          return;
        }
      }
      
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile',
        callback: async (response: any) => {
          if (response.access_token) {
            // Send token to backend for verification and user creation
            const apiBaseUrl = getApiBaseUrl();
            try {
              const backendResponse = await fetch(`${apiBaseUrl}/api/v1/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: response.access_token })
              });
              
              if (!backendResponse.ok) {
                throw new Error('Backend authentication failed');
              }
              
              const result = await backendResponse.json();
              if (result.success && result.token) {
                localStorage.setItem('jwt_token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = '/profile';
              } else {
                throw new Error(result.message || 'Google login failed');
              }
            } catch (error) {
              console.error('Google OAuth error:', error);
              alert('Failed to authenticate with Google. Please try again.');
            }
          }
        }
      });
      
      client.requestAccessToken();
    } catch (error) {
      console.error('Google login error:', error);
      alert('Google Sign-In is not available. Please use email registration.');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-white mb-2">Create Your Account</h2>
      <p className="text-gray-300 mb-8">Choose how you'd like to sign up</p>

      {/* Social Login Options */}
      <div className="space-y-4 mb-8">
        <button
          onClick={handleGoogleLogin}
          disabled={!googleReady || !(import.meta as any).env?.VITE_GOOGLE_CLIENT_ID}
          className={`w-full flex items-center justify-center space-x-3 rounded-lg p-4 transition-colors ${
            googleReady && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID
              ? 'bg-white/10 hover:bg-white/20' 
              : 'bg-gray-700/50 cursor-not-allowed opacity-50'
          }`}
        >
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="text-white">
            {!(import.meta as any).env?.VITE_GOOGLE_CLIENT_ID 
              ? 'Google OAuth not configured' 
              : !googleReady 
                ? 'Loading Google...' 
                : 'Continue with Google'}
          </span>
        </button>

      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-transparent text-gray-400">Or continue with email</span>
        </div>
      </div>

      {/* Email Form */}
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => updateData({ fullName: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
          <input
            type="text"
            value={data.username}
            onChange={(e) => updateData({ username: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Choose a username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
            className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => updateData({ password: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={data.confirmPassword}
              onChange={(e) => updateData({ confirmPassword: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Terms and Privacy */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={data.agreeToTerms}
              onChange={(e) => updateData({ agreeToTerms: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">
              I agree to the <a href="/terms" className="text-blue-400 hover:underline">Terms of Service</a>
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={data.agreeToPrivacy}
              onChange={(e) => updateData({ agreeToPrivacy: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">
              I agree to the <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={data.marketingEmails}
              onChange={(e) => updateData({ marketingEmails: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">
              Send me marketing emails and updates (optional)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

const WalletCreationStep: React.FC<OnboardingStepProps> = ({ data, updateData }) => {
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!data.custodialWalletCreated) {
      createCustodialWallet();
    }
  }, []);

  const createCustodialWallet = async () => {
    setIsCreating(true);
    
    // Simulate wallet creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateData({ custodialWalletCreated: true });
    setIsCreating(false);
  };

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
        >
          {isCreating ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : (
            <Wallet className="w-12 h-12 text-white" />
          )}
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">
          {isCreating ? 'Creating Your Wallet...' : 'Your Wallet is Ready!'}
        </h2>
        
        <p className="text-xl text-gray-300 mb-8">
          {isCreating 
            ? 'We\'re setting up a secure custodial wallet for you'
            : 'We\'ve created a secure custodial wallet that you can use immediately'
          }
        </p>
      </motion.div>

      {!isCreating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 rounded-lg p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Secure</h3>
              <p className="text-gray-300 text-sm">Your private keys are encrypted and stored securely</p>
            </div>
            
            <div className="text-center">
              <Zap className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Instant</h3>
              <p className="text-gray-300 text-sm">Start using Web3 features immediately</p>
            </div>
            
            <div className="text-center">
              <Key className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Recoverable</h3>
              <p className="text-gray-300 text-sm">Easy recovery with email and phone</p>
            </div>
          </div>
        </motion.div>
      )}

      {!isCreating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-300"
        >
          <p className="mb-2">Your wallet address: <span className="text-blue-400 font-mono">0x1234...5678</span></p>
          <p>You can upgrade to a self-custody wallet later in settings</p>
        </motion.div>
      )}
    </div>
  );
};

const TokenClaimStep: React.FC<OnboardingStepProps> = ({ data, updateData }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [, setError] = useState<string | null>(null);

  const claimTokens = async () => {
    setIsClaiming(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get wallet address from user object or localStorage
      const userStr = localStorage.getItem('user');
      let walletAddress: string | null = null;
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          walletAddress = user.uid || user.wallet_address;
        } catch (e) {
          console.warn('Failed to parse user from localStorage:', e);
        }
      }
      
      if (!walletAddress) {
        walletAddress = localStorage.getItem('wallet_address');
      }
      
      if (!walletAddress) {
        throw new Error('Wallet address not found. Please complete wallet creation first.');
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/user/claim-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          wallet_address: walletAddress
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to claim tokens' }));
        throw new Error(errorData.message || 'Failed to claim tokens');
      }

      const result = await response.json();
      if (result.success) {
        updateData({ freeTokensClaimed: true });
      } else {
        throw new Error(result.message || 'Failed to claim tokens');
      }
    } catch (err) {
      console.error('Error claiming tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}
        >
          <Gift className="w-12 h-12 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">Claim Your Free Tokens!</h2>
        
        <p className="text-xl text-gray-300 mb-8">
          Get 100 DYO tokens to start exploring the DUJYO ecosystem
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/10 rounded-lg p-8 mb-8"
      >
        <div className="text-6xl font-bold text-yellow-400 mb-4">100 DYO</div>
        <p className="text-gray-300 mb-6">Worth approximately $10 USD</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Stream music and earn rewards</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Buy and sell NFTs</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Participate in governance</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Stake for additional rewards</span>
          </div>
        </div>
      </motion.div>

      {!data.freeTokensClaimed ? (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={claimTokens}
          disabled={isClaiming}
          className="btn-primary px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
        >
          {isClaiming ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Claiming Tokens...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Gift className="w-5 h-5" />
              <span>Claim 100 DYO</span>
            </div>
          )}
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Tokens Claimed!</h3>
          <p className="text-gray-300">Your 100 DYO tokens are now in your wallet</p>
        </motion.div>
      )}
    </div>
  );
};

const TutorialStep: React.FC<OnboardingStepProps> = ({ onNext, updateData }) => {
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Discover Content",
      description: "Browse music, videos, and games in our curated library",
      icon: <Music className="w-8 h-8 text-blue-400" />,
    },
    {
      title: "Stream & Earn",
      description: "Listen to music and earn DYO tokens automatically",
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
    },
    {
      title: "Create & Share",
      description: "Upload your own content and build your audience",
      icon: <Users className="w-8 h-8 text-purple-400" />,
    },
    {
      title: "Trade NFTs",
      description: "Buy, sell, and collect unique digital assets",
      icon: <Star className="w-8 h-8 text-yellow-400" />,
    },
  ];

  const handleTutorialNext = () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      setCurrentTutorialStep(prev => prev + 1);
    } else {
      updateData({ tutorialCompleted: true });
      onNext();
    }
  };

  const currentStep = tutorialSteps[currentTutorialStep];

  return (
    <div className="text-center">
      <motion.div
        key={currentTutorialStep}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
        >
          {currentStep.icon}
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">{currentStep.title}</h2>
        
        <p className="text-xl text-gray-300 mb-8">{currentStep.description}</p>
      </motion.div>

      <div className="flex justify-center space-x-2 mb-8">
        {tutorialSteps.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentTutorialStep
                ? 'bg-blue-500 scale-125'
                : index < currentTutorialStep
                ? 'bg-green-500'
                : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      <button
        onClick={handleTutorialNext}
        className="btn-primary px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
      >
        {currentTutorialStep === tutorialSteps.length - 1 ? 'Finish Tutorial' : 'Next'}
      </button>
    </div>
  );
};

const CompletionStep: React.FC<OnboardingStepProps> = () => {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
        >
          <Check className="w-12 h-12 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">You're All Set!</h2>
        
        <p className="text-xl text-gray-300 mb-8">
          Welcome to the future of entertainment. Let's start your journey!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/10 rounded-lg p-6 mb-8"
      >
        <h3 className="text-xl font-semibold text-white mb-4">What's Next?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Explore the music library</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Check out trending videos</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Play Web3 games</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Connect with the community</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-gray-300"
      >
        <p>Need help? Check out our <a href="/help" className="text-blue-400 hover:underline">help center</a> or join our <a href="/discord" className="text-blue-400 hover:underline">Discord community</a></p>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;
