import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

export interface VerificationStatus {
  emailVerified: boolean;
  termsAccepted: boolean;
  quizCompleted: boolean;
  verificationLevel: 'unverified' | 'basic_artist' | 'verified_artist' | 'partner_artist';
  canUpgrade: boolean;
}

export const useVerification = () => {
  const { user, getUserRole } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    termsAccepted: false,
    quizCompleted: false,
    verificationLevel: 'unverified',
    canUpgrade: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVerificationStatus();
  }, [user]);

  const loadVerificationStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Simulate API call to get verification status
      // In a real app, this would fetch from your backend
      const mockStatus = await new Promise<VerificationStatus>((resolve) => {
        setTimeout(() => {
          // Check localStorage for verification status
          const storedStatus = localStorage.getItem(`verification_${user.uid}`);
          if (storedStatus) {
            resolve(JSON.parse(storedStatus));
          } else {
            resolve({
              emailVerified: false,
              termsAccepted: false,
              quizCompleted: false,
              verificationLevel: 'unverified',
              canUpgrade: false
            });
          }
        }, 1000);
      });

      setVerificationStatus(mockStatus);
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateVerificationStep = async (step: keyof VerificationStatus, value: boolean) => {
    if (!user) return;

    try {
      const updatedStatus = {
        ...verificationStatus,
        [step]: value
      };

      // Update verification level based on completed steps
      if (updatedStatus.emailVerified && updatedStatus.termsAccepted && updatedStatus.quizCompleted) {
        updatedStatus.verificationLevel = 'basic_artist';
        updatedStatus.canUpgrade = true;
      } else if (updatedStatus.emailVerified && updatedStatus.termsAccepted) {
        updatedStatus.verificationLevel = 'unverified';
        updatedStatus.canUpgrade = false;
      }

      setVerificationStatus(updatedStatus);
      
      // Save to localStorage (in a real app, this would be saved to your backend)
      localStorage.setItem(`verification_${user.uid}`, JSON.stringify(updatedStatus));
    } catch (error) {
      console.error('Error updating verification step:', error);
    }
  };

  const completeEmailVerification = async () => {
    await updateVerificationStep('emailVerified', true);
  };

  const acceptTerms = async () => {
    await updateVerificationStep('termsAccepted', true);
  };

  const completeQuiz = async () => {
    await updateVerificationStep('quizCompleted', true);
  };

  const resetVerification = async () => {
    if (!user) return;

    const resetStatus: VerificationStatus = {
      emailVerified: false,
      termsAccepted: false,
      quizCompleted: false,
      verificationLevel: 'unverified',
      canUpgrade: false
    };

    setVerificationStatus(resetStatus);
    localStorage.removeItem(`verification_${user.uid}`);
  };

  const getVerificationProgress = () => {
    const steps = [verificationStatus.emailVerified, verificationStatus.termsAccepted, verificationStatus.quizCompleted];
    const completedSteps = steps.filter(Boolean).length;
    return {
      completed: completedSteps,
      total: steps.length,
      percentage: (completedSteps / steps.length) * 100
    };
  };

  const getVerificationLevelInfo = (level: VerificationStatus['verificationLevel']) => {
    const levels = {
      unverified: {
        name: 'Unverified',
        description: 'Complete verification steps to become an artist',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/50'
      },
      basic_artist: {
        name: 'Basic Artist',
        description: 'Can upload content and earn royalties',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/50'
      },
      verified_artist: {
        name: 'Verified Artist',
        description: 'Content reviewed and verified by Dujyo team',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/50'
      },
      partner_artist: {
        name: 'Partner Artist',
        description: 'Special agreements and enhanced features',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/50'
      }
    };

    return levels[level];
  };

  return {
    verificationStatus,
    isLoading,
    completeEmailVerification,
    acceptTerms,
    completeQuiz,
    resetVerification,
    getVerificationProgress,
    getVerificationLevelInfo,
    updateVerificationStep
  };
};
