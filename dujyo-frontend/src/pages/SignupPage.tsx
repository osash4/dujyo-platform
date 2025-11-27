import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowLeft, Facebook, Chrome, Wallet, Coins, CheckCircle, AlertCircle, Eye, EyeOff, Music, Video, Gamepad2, TrendingUp, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { getApiBaseUrl } from '../utils/apiConfig';
import Logo from '../components/common/Logo';

type UserRole = 'listener' | 'creator';

interface SignupProgress {
  step: number;
  total: number;
  current: string;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const { connect, account, isConnecting } = useWallet();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: 'listener' as UserRole
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
  }>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [signupProgress, setSignupProgress] = useState<SignupProgress>({
    step: 1,
    total: 3,
    current: 'Account Details'
  });

  // Check for wallet parameter
  useEffect(() => {
    const wallet = searchParams.get('wallet');
    if (wallet) {
      setWalletAddress(wallet);
      setFormData(prev => ({ ...prev, displayName: `Wallet_${wallet.slice(0, 6)}` }));
    }
  }, [searchParams]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear field errors when user types
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Password strength indicator
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (value.length >= 12) strength++;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
      if (/\d/.test(value)) strength++;
      if (/[^a-zA-Z\d]/.test(value)) strength++;
      setPasswordStrength(Math.min(strength, 4));
    }

    // Update progress based on form completion
    updateProgress();
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({ ...prev, role }));
  };

  const updateProgress = () => {
    let step = 1;
    let current = 'Account Details';
    
    if (formData.displayName && formData.email) {
      step = 2;
      current = 'Security Setup';
    }
    if (formData.password && formData.confirmPassword) {
      step = 3;
      current = 'Ready to Join';
    }
    
    setSignupProgress({ step, total: 3, current });
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('One number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('One special character');
    }
    
    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate display name
    if (!formData.displayName.trim()) {
      setFieldErrors(prev => ({ ...prev, displayName: 'Display name is required' }));
      return;
    }
    if (formData.displayName.length < 3) {
      setFieldErrors(prev => ({ ...prev, displayName: 'Display name must be at least 3 characters' }));
      return;
    }

    // Validate email
    if (!formData.email.trim()) {
      setFieldErrors(prev => ({ ...prev, email: 'Email is required' }));
      return;
    }
    if (!validateEmail(formData.email)) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setFieldErrors(prev => ({ 
        ...prev, 
        password: `Password must contain: ${passwordValidation.errors.join(', ')}` 
      }));
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    setIsLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.displayName);
      // signUp already navigates to /profile on success
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
        setFieldErrors(prev => ({ 
          ...prev, 
          email: 'This email is already registered. Please sign in or use a different email.' 
        }));
      } else if (errorMessage.toLowerCase().includes('duplicate')) {
        setFieldErrors(prev => ({ 
          ...prev, 
          email: 'An account with this email already exists. Please sign in instead.' 
        }));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet signup
  const handleWalletSignup = async () => {
    if (!account && !walletAddress) {
      setIsLoading(true);
      try {
        await connect();
      } catch (error) {
        console.error('Wallet connection error:', error);
        setError('Failed to connect wallet. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const wallet = account || walletAddress;
    if (!wallet) return;

    setIsLoading(true);
    setError('');
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/auth/wallet/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: wallet,
          display_name: formData.displayName || `Wallet_${wallet.slice(0, 6)}`,
          role: formData.role
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('jwt_token', data.token);
          navigate('/profile');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Wallet signup failed');
      }
    } catch (error: any) {
      console.error('Wallet signup error:', error);
      setError(error?.message || 'Failed to create account with wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Social signup
  const handleSocialSignup = async (provider: 'facebook' | 'google') => {
    setSocialLoading(provider);
    setError('');
    try {
      const apiBaseUrl = getApiBaseUrl();
      window.location.href = `${apiBaseUrl}/auth/${provider}?signup=true&role=${formData.role}`;
    } catch (error) {
      console.error('Social signup error:', error);
      setError(`Failed to connect with ${provider}. Please try again.`);
      setSocialLoading(null);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const roleBenefits = {
    listener: {
      title: 'Discover & Earn',
      description: 'Explore content across music, video, and gaming while earning $DYO tokens',
      icon: Users,
      features: [
        'Discover trending content',
        'Earn $DYO tokens from streams',
        'Support your favorite creators',
        'Join the community'
      ]
    },
    creator: {
      title: 'Monetize Your Content',
      description: 'Upload and monetize across music, video, and gaming platforms',
      icon: Sparkles,
      features: [
        'Upload music, video, and gaming content',
        'Earn $DYO tokens from streams',
        'Reach global audiences',
        'Track your earnings'
      ]
    }
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg-hero)' }}>
      {/* Animated Background with DUJYO colors */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-600/10" style={{ background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), transparent, rgba(234, 88, 12, 0.1))' }} />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(234, 88, 12, 0.08) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/explore')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          whileHover={{ x: -5 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </motion.button>

        {/* Signup Form */}
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-amber-400/30 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="flex flex-col items-center justify-center mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo with Stream-to-Earn badge */}
              <div className="relative">
                <Logo size="3xl" variant="full" showText={false} className="mb-4" />
                <motion.div
                  className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <Coins className="w-3 h-3" style={{ color: '#F59E0B' }} />
                  <span className="text-xs font-semibold" style={{ color: '#FBBF24' }}>Stream-to-Earn</span>
                </motion.div>
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
              Start Your Stream-to-Earn Journey
            </h1>
            <p className="text-gray-400 mt-2">Join the multistream platform where creators and listeners earn together</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{signupProgress.current}</span>
              <span className="text-xs text-gray-400">Step {signupProgress.step} of {signupProgress.total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                initial={{ width: 0 }}
                animate={{ width: `${(signupProgress.step / signupProgress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              I want to join as:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                onClick={() => handleRoleChange('listener')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 min-h-[44px] ${
                  formData.role === 'listener'
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Users className={`w-5 h-5 mx-auto mb-2 ${formData.role === 'listener' ? 'text-amber-400' : 'text-gray-400'}`} />
                <div className="text-sm font-semibold text-white">Listener</div>
                <div className="text-xs text-gray-400 mt-1">Discover & Earn</div>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleRoleChange('creator')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 min-h-[44px] ${
                  formData.role === 'creator'
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles className={`w-5 h-5 mx-auto mb-2 ${formData.role === 'creator' ? 'text-amber-400' : 'text-gray-400'}`} />
                <div className="text-sm font-semibold text-white">Creator</div>
                <div className="text-xs text-gray-400 mt-1">Monetize Content</div>
              </motion.button>
            </div>
            {/* Role Benefits */}
            <motion.div
              className="mt-4 p-4 bg-amber-500/10 border border-amber-400/30 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-3">
                {React.createElement(roleBenefits[formData.role].icon, { className: "w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" })}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-300 mb-1">{roleBenefits[formData.role].title}</h3>
                  <p className="text-xs text-gray-300 mb-2">{roleBenefits[formData.role].description}</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {roleBenefits[formData.role].features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-amber-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Wallet Signup Option */}
          {(walletAddress || account) && (
            <motion.div
              className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-300 mb-1">Wallet Connected</h3>
                  <p className="text-xs text-gray-300 mb-2">
                    {walletAddress || account}
                  </p>
                  <button
                    onClick={handleWalletSignup}
                    disabled={isLoading}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 min-h-[44px]"
                  >
                    {isLoading ? 'Creating Account...' : 'Sign Up with Wallet'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Divider */}
          {!walletAddress && !account && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Or sign up with email</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 min-h-[44px] ${
                    fieldErrors.displayName ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Choose your display name"
                  required
                />
              </div>
              {fieldErrors.displayName && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.displayName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 min-h-[44px] ${
                    fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Enter your email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 min-h-[44px] ${
                    fieldErrors.password ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors min-h-[44px] flex items-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <motion.div
                        key={level}
                        className={`h-1.5 flex-1 rounded ${
                          level <= passwordStrength
                            ? getPasswordStrengthColor()
                            : 'bg-gray-600'
                        }`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: level <= passwordStrength ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Strength: <span className={getPasswordStrengthColor().replace('bg-', 'text-')}>{getPasswordStrengthText()}</span>
                  </p>
                </div>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 min-h-[44px] ${
                    fieldErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors min-h-[44px] flex items-center"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
                <motion.div
                  className="mt-1 flex items-center gap-1 text-green-400 text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Passwords match</span>
                </motion.div>
              )}
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Stream-to-Earn Benefits Section */}
            <motion.div
              className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Stream-to-Earn Benefits
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <Music className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-xs text-gray-300">Music</p>
                </div>
                <div className="text-center">
                  <Video className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-xs text-gray-300">Video</p>
                </div>
                <div className="text-center">
                  <Gamepad2 className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-xs text-gray-300">Gaming</p>
                </div>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  <span>Earn $DYO tokens from every stream</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>Join a growing multistream community</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Monetize your content across platforms</span>
                </li>
              </ul>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 min-h-[44px]"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account & Start Earning'}
            </motion.button>
          </form>

          {/* Onboarding Next Steps */}
          <motion.div
            className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-blue-300 mb-2">After Sign Up:</h3>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-semibold">1</div>
                <span>Verify your email</span>
              </div>
              <ArrowLeft className="w-3 h-3 text-gray-500 rotate-90" />
              <div className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-semibold">2</div>
                <span>Complete your profile</span>
              </div>
              <ArrowLeft className="w-3 h-3 text-gray-500 rotate-90" />
              <div className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-semibold">3</div>
                <span>Start earning $DYO</span>
              </div>
            </div>
          </motion.div>

          {/* Social Signup */}
          {!walletAddress && !account && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => handleSocialSignup('facebook')}
                  disabled={!!socialLoading}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors disabled:opacity-50 min-h-[44px]"
                  whileHover={{ scale: socialLoading ? 1 : 1.02 }}
                  whileTap={{ scale: socialLoading ? 1 : 0.98 }}
                >
                  {socialLoading === 'facebook' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Facebook className="w-5 h-5 text-blue-400" />
                      <span className="ml-2">Facebook</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={() => handleSocialSignup('google')}
                  disabled={!!socialLoading}
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors disabled:opacity-50 min-h-[44px]"
                  whileHover={{ scale: socialLoading ? 1 : 1.02 }}
                  whileTap={{ scale: socialLoading ? 1 : 0.98 }}
                >
                  {socialLoading === 'google' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Chrome className="w-5 h-5 text-red-400" />
                      <span className="ml-2">Google</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className="text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>

        {/* Blockchain Status - Updated messaging */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <motion.div
            className="w-3 h-3 bg-green-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0.7)',
                '0 0 0 10px rgba(34, 197, 94, 0)',
                '0 0 0 0 rgba(34, 197, 94, 0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-green-400 text-sm font-semibold">$DYO Token Ecosystem Live</span>
        </motion.div>
      </div>
    </div>
  );
};

export default SignupPage;
