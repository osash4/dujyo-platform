import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Facebook, Chrome, Wallet, HelpCircle, Coins, Fingerprint, Info, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { getApiBaseUrl } from '../utils/apiConfig';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from '../components/common/Logo';

interface LoginAttempt {
  timestamp: number;
  ip?: string;
}

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { signIn, isSignedIn } = useAuth();
  const { connect, account, isConnecting } = useWallet();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for biometric support
  useEffect(() => {
    if ('credentials' in navigator && 'get' in navigator.credentials) {
      setBiometricAvailable(true);
    }
  }, []);

  // Rate limiting check
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const recentAttempts = loginAttempts.filter(attempt => now - attempt.timestamp < 60000); // 1 minute
    if (recentAttempts.length >= 5) {
      setError('Too many login attempts. Please wait a minute before trying again.');
      return false;
    }
    return true;
  };

  // Record login attempt
  const recordLoginAttempt = () => {
    setLoginAttempts(prev => [...prev, { timestamp: Date.now() }]);
  };

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      navigate('/profile');
    }
  }, [isSignedIn, navigate]);

  // Check if user is new
  useEffect(() => {
    const hasVisited = localStorage.getItem('dujyo_has_visited');
    setIsNewUser(!hasVisited);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Password strength indicator
    if (e.target.name === 'password' && showForgotPassword) {
      const password = e.target.value;
      let strength = 0;
      if (password.length >= 8) strength++;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
      if (password.match(/\d/)) strength++;
      if (password.match(/[^a-zA-Z\d]/)) strength++;
      setPasswordStrength(strength);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!checkRateLimit()) return;

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    recordLoginAttempt();
    
    try {
      await signIn(formData.email, formData.password);
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('dujyo_remember_me', 'true');
        localStorage.setItem('dujyo_remembered_email', formData.email);
      } else {
        localStorage.removeItem('dujyo_remember_me');
        localStorage.removeItem('dujyo_remembered_email');
      }
      
      // Mark as visited
      localStorage.setItem('dujyo_has_visited', 'true');
      
      navigate('/profile');
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to sign in. Please try again.';
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('User not found')) {
          errorMessage = 'User not found. Please check your email or register first.';
        } else if (msg.includes('Invalid password')) {
          errorMessage = 'Incorrect password. Please try again or use "Forgot Password".';
        } else if (msg.includes('Cannot connect to server') || msg.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else {
          errorMessage = msg;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified wallet connection - no email required
  const handleWalletLogin = async () => {
    if (!checkRateLimit()) return;
    
    setIsLoading(true);
    setError('');
    recordLoginAttempt();
    
    try {
      await connect();
      if (account) {
        // Wallet-only authentication
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/auth/wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: account
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('jwt_token', data.token);
            localStorage.setItem('dujyo_has_visited', 'true');
            navigate('/profile');
          } else {
            // New wallet user - redirect to signup
            navigate('/signup?wallet=' + account);
          }
        } else {
          throw new Error('Wallet authentication failed');
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError('Failed to connect wallet. Please try again or use email/password sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Real OAuth integration
  const handleSocialLogin = async (provider: 'facebook' | 'google') => {
    if (!checkRateLimit()) return;
    
    setSocialLoading(provider);
    setError('');
    recordLoginAttempt();
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      window.location.href = `${apiBaseUrl}/auth/${provider}`;
    } catch (error) {
      console.error('Social login error:', error);
      setError(`Failed to connect with ${provider}. Please try again.`);
      setSocialLoading(null);
    }
  };

  // Biometric login
  const handleBiometricLogin = async () => {
    if (!biometricAvailable) return;
    
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: []
        }
      } as any);
      
      if (credential) {
        // Handle biometric authentication
        const rememberedEmail = localStorage.getItem('dujyo_remembered_email');
        if (rememberedEmail) {
          setFormData({ ...formData, email: rememberedEmail });
          // Auto-submit if password is stored securely
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
    }
  };

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('dujyo_remember_me');
    const rememberedEmail = localStorage.getItem('dujyo_remembered_email');
    if (remembered === 'true' && rememberedEmail) {
      setRememberMe(true);
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
    }
  }, []);

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

        {/* Login Form */}
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-amber-400/30 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="flex flex-col items-center justify-center mb-6 px-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo with Stream-to-Earn badge */}
              <div className="relative">
                <Logo size="3xl" variant="full" showText={false} className="mb-4" />
                <motion.div
                  className="absolute -top-2 -right-2 sm:-right-4 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <Coins className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#F59E0B' }} />
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: '#FBBF24' }}>Stream-to-Earn</span>
                </motion.div>
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
              {t('auth.continueJourney')}
            </h1>
            <p className="text-gray-400 mt-2">{t('auth.accessDashboard')}</p>
            <p className="text-sm text-amber-300/80 mt-1">{t('auth.startEarning')}</p>
          </div>

          {/* New User Tooltip */}
          {isNewUser && (
            <motion.div
              className="mb-6 p-4 bg-amber-500/10 border border-amber-400/30 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-300 mb-1">{t('auth.newToDujyo')}</h3>
                  <p className="text-xs text-gray-300">
                    {t('auth.joinDescription')}
                  </p>
                </div>
                <button
                  onClick={() => setIsNewUser(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Wallet Login - Standalone, no email required */}
          <div className="mb-6">
            <motion.button
              type="button"
              onClick={isMobile ? () => setShowMobileSheet(true) : handleWalletLogin}
              disabled={isLoading || isConnecting}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              whileHover={{ scale: (isLoading || isConnecting) ? 1 : 1.02 }}
              whileTap={{ scale: (isLoading || isConnecting) ? 1 : 0.98 }}
              onMouseEnter={() => !isMobile && setShowTooltip('wallet')}
              onMouseLeave={() => !isMobile && setShowTooltip(null)}
            >
              <Wallet className="w-5 h-5" />
              <span>{isConnecting ? 'Connecting Wallet...' : 'Connect wallet for instant access'}</span>
            </motion.button>
            {showTooltip === 'wallet' && !isMobile && (
              <motion.div
                className="mt-2 p-2 bg-gray-700/90 rounded text-xs text-gray-300"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {t('auth.continueWithWallet')}
              </motion.div>
            )}
          </div>

          {/* Mobile Bottom Sheet for Login Methods */}
          <AnimatePresence>
            {showMobileSheet && isMobile && (
              <>
                <motion.div
                  className="fixed inset-0 bg-black/50 z-40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileSheet(false)}
                />
                <motion.div
                  className="fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-6 z-50 max-h-[80vh] overflow-y-auto"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-white mb-4">{t('auth.login')}</h3>
                  
                  <div className="space-y-3">
                    <motion.button
                      onClick={handleWalletLogin}
                      disabled={isLoading || isConnecting}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 min-h-[44px]"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Wallet className="w-5 h-5" />
                      <span>{t('auth.continueWithWallet')}</span>
                    </motion.button>
                    
                    {biometricAvailable && (
                      <motion.button
                        onClick={handleBiometricLogin}
                        className="w-full py-4 bg-gray-700 border border-gray-600 rounded-lg text-white flex items-center justify-center gap-2 min-h-[44px]"
                        whileTap={{ scale: 0.98 }}
                      >
                        <Fingerprint className="w-5 h-5" />
                        <span>{t('common.useBiometric')}</span>
                      </motion.button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowMobileSheet(false)}
                    className="w-full mt-4 py-3 text-gray-400 hover:text-white"
                  >
                    {t('common.cancel')}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">{t('auth.continueWithEmail')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 min-h-[44px]"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-200 min-h-[44px]"
                  placeholder={t('auth.password')}
                  required
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-gray-400 cursor-pointer">
                    {t('auth.rememberMe')}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 min-h-[44px]"
                >
                  <HelpCircle className="w-3 h-3" />
                  {t('auth.forgotPassword')}
                </button>
              </div>
            </div>

            {/* Biometric Login Option */}
            {biometricAvailable && rememberMe && (
              <motion.button
                type="button"
                onClick={handleBiometricLogin}
                className="w-full py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Fingerprint className="w-5 h-5" />
                <span>{t('common.useBiometric')}</span>
              </motion.button>
            )}

            {/* Forgot Password Form */}
            <AnimatePresence>
            {showForgotPassword && (
              <motion.div
                className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 space-y-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">{t('auth.forgotPassword')}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordSent(false);
                        setPasswordStrength(0);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                      <X className="w-4 h-4" />
                  </button>
                </div>
                {!forgotPasswordSent ? (
                  <>
                    <p className="text-sm text-gray-300">
                      {t('auth.resetPasswordDescription')}
                    </p>
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Enter your email"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 min-h-[44px]"
                    />
                      {/* Password Strength Indicator (for new password) */}
                      {passwordStrength > 0 && (
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded ${
                                  level <= passwordStrength
                                    ? level <= 2
                                      ? 'bg-red-500'
                                      : level === 3
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                    : 'bg-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-400">
                            {passwordStrength <= 2 ? 'Weak' : passwordStrength === 3 ? 'Medium' : 'Strong'}
                          </p>
                        </div>
                      )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!forgotPasswordEmail) {
                          setError('Please enter your email');
                          return;
                        }
                        setIsLoading(true);
                        setError('');
                        try {
                          const apiBaseUrl = getApiBaseUrl();
                          const response = await fetch(`${apiBaseUrl}/forgot-password`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              email: forgotPasswordEmail
                            })
                          });
                          
                          const result = await response.json();
                          
                          if (result.success) {
                            setForgotPasswordSent(true);
                            setError('');
                          } else {
                            setError(result.message || 'Failed to send reset email. Please try again.');
                          }
                        } catch (error) {
                          console.error('Forgot password error:', error);
                          setError('Failed to send reset email. Please check your connection and try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                      <p className="text-green-400 font-semibold">Reset link sent!</p>
                    <p className="text-sm text-gray-300">
                      Check your email ({forgotPasswordEmail}) for instructions to reset your password.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail('');
                        setForgotPasswordSent(false);
                      }}
                      className="text-amber-400 hover:text-amber-300 text-sm"
                    >
                      Back to Login
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>

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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </motion.button>
          </form>

          {/* Social Login */}
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
                onClick={() => handleSocialLogin('facebook')}
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
                onClick={() => handleSocialLogin('google')}
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

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
              >
                Sign Up
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

export default Login;

