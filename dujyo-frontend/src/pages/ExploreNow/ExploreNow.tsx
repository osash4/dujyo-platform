import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useWallet } from '../../hooks/useWallet';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Music, Video, Gamepad2, Wallet, Sparkles, Zap, Coins } from 'lucide-react';
import Logo from '../../components/common/Logo';
import '../../styles/neon-colors.css';

// Futuristic ExploreNow Component
const ExploreNow: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { connect, account, isConnecting } = useWallet();
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect if already signed in and has wallet
  useEffect(() => {
    if (isSignedIn && account) {
      navigate('/profile');
    }
  }, [isSignedIn, account, navigate]);

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: 'var(--bg-hero)' }}>
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        {/* DUJYO brand colors: gold (#F59E0B), amber (#FBBF24), copper (#EA580C) */}
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
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center px-4">
        {/* Hero Section with Epic Logo */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          {/* Epic Logo Entrance */}
          <motion.div
            className="relative mb-8 flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ 
              duration: 1.2, 
              delay: 0.3,
              type: "spring",
              stiffness: 100
            }}
          >
            {/* Glow Effect Behind Logo - Optimized for performance */}
            <motion.div
              className="absolute inset-0 flex justify-center items-center"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full blur-3xl" style={{ background: 'linear-gradient(to right, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2), rgba(245, 158, 11, 0.2))' }} />
            </motion.div>

            {/* Floating Particles - Reduced on mobile for performance */}
            {Array.from({ length: isMobile ? 3 : 6 }, (_, i) => {
              const particleCount = isMobile ? 3 : 6;
              const radius = isMobile ? 150 : 250;
              const radiusMax = isMobile ? 180 : 300;
              return (
              <motion.div
                key={i}
                className="absolute"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [
                      Math.cos((i * Math.PI * 2) / particleCount) * radius,
                      Math.cos((i * Math.PI * 2) / particleCount) * radiusMax,
                      Math.cos((i * Math.PI * 2) / particleCount) * radius
                  ],
                  y: [
                      Math.sin((i * Math.PI * 2) / particleCount) * radius,
                      Math.sin((i * Math.PI * 2) / particleCount) * radiusMax,
                      Math.sin((i * Math.PI * 2) / particleCount) * radius
                  ]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                }}
                  style={{ willChange: 'transform, opacity' }}
              >
                <Sparkles 
                    className="w-4 h-4 md:w-6 md:h-6 text-amber-400" 
                  style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))' }}
                />
              </motion.div>
              );
            }).filter(Boolean)}

            {/* Main Logo - Better hierarchy: Full logo on desktop, icon on mobile */}
            <motion.div
              className="relative z-10 flex flex-col justify-center items-center gap-4"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Mobile: Large icon */}
              <Logo size="4xl" variant="icon" showText={false} className="md:hidden" />
              {/* Desktop: Complete logo (icon + text) - Text logo larger for better proportion */}
              <div className="hidden md:flex flex-col items-center gap-3">
                <Logo size="4xl" variant="icon" showText={false} />
                <Logo size="3xl" variant="text" />
              </div>
            </motion.div>

            {/* Pulsing Ring - Responsive */}
            <motion.div
              className="absolute inset-0 flex justify-center items-center"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="w-[280px] h-[280px] md:w-[550px] md:h-[550px] border-2 border-amber-400/30 rounded-full" />
            </motion.div>
          </motion.div>

          {/* Title - Updated copywriting for multistream and stream-to-earn */}
          <motion.h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-4 text-gray-200 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <motion.span
              className="text-gray-300"
              animate={{
                textShadow: [
                  '0 0 20px rgba(245, 158, 11, 0.5)',
                  '0 0 40px rgba(245, 158, 11, 0.8), 0 0 60px rgba(234, 88, 12, 0.6)',
                  '0 0 20px rgba(245, 158, 11, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              Enter the Ultimate Stream-to-Earn Universe
            </motion.span>
          </motion.h1>

          {/* Subtitle with Tech Badge */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <motion.div
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-full"
              whileHover={{ scale: 1.05 }}
              style={{ 
                background: 'linear-gradient(to right, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))',
                borderColor: 'rgba(245, 158, 11, 0.3)'
              }}
            >
              <Zap className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-sm font-semibold" style={{ color: '#FBBF24' }}>Blockchain Powered</span>
            </motion.div>
          </motion.div>

          <motion.p
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 md:mb-12 max-w-3xl mx-auto px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            The first multistream platform where music, video, and gaming merge with blockchain. 
            Create, stream, and earn $DYO tokens.
          </motion.p>

          {/* Platform Features Preview - Updated messaging for multistream and stream-to-earn */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-8 md:mb-16 px-4 max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <motion.div
              className="card p-6 relative overflow-hidden group"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Music className="w-12 h-12 text-amber-400 mx-auto mb-4 icon-music relative z-10" />
              <h3 className="text-xl font-semibold text-amber-300 mb-2 relative z-10">Music Universe</h3>
              <p className="text-gray-400 relative z-10">Discover and earn from streams</p>
            </motion.div>

            <motion.div
              className="card p-6 relative overflow-hidden group"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Video className="w-12 h-12 text-orange-400 mx-auto mb-4 icon-video relative z-10" />
              <h3 className="text-xl font-semibold text-orange-300 mb-2 relative z-10">Video Galaxy</h3>
              <p className="text-gray-400 relative z-10">Monetize your content</p>
            </motion.div>

            <motion.div
              className="card p-6 relative overflow-hidden group"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.8 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Gamepad2 className="w-12 h-12 text-cyan-400 mx-auto mb-4 icon-gaming relative z-10" />
              <h3 className="text-xl font-semibold text-cyan-300 mb-2 relative z-10">Gaming Matrix</h3>
              <p className="text-gray-400 relative z-10">Play and earn rewards</p>
            </motion.div>

            {/* New Stream-to-Earn Card */}
            <motion.div
              className="card p-6 relative overflow-hidden group"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 2.0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Coins className="w-12 h-12 text-amber-400 mx-auto mb-4 relative z-10" style={{ color: '#F59E0B' }} />
              <h3 className="text-xl font-semibold text-amber-300 mb-2 relative z-10">Stream-to-Earn</h3>
              <p className="text-gray-400 relative z-10">Get paid in $DYO tokens for engagement</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Authentication Section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-white">
            <span className="bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
              Join the Revolution
            </span>
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <motion.button
              onClick={handleSignIn}
              className="btn-primary group relative px-8 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-3">
                <LogIn className="w-6 h-6" />
                <span>Sign In</span>
              </div>
            </motion.button>

            <motion.button
              onClick={handleSignUp}
              className="btn-primary group relative px-8 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-3">
                <UserPlus className="w-6 h-6" />
                <span>Sign Up</span>
              </div>
            </motion.button>
          </div>

          {/* Connect Wallet Button - Show if signed in but no wallet */}
          {isSignedIn && !account && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.2 }}
            >
              <motion.button
                onClick={connect}
                disabled={isConnecting}
                className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isConnecting ? 1 : 1.05 }}
                whileTap={{ scale: isConnecting ? 1 : 0.95 }}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </motion.button>
              <motion.p
                className="text-gray-400 mt-4 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.4 }}
              >
                Connect your wallet to access the full ecosystem
              </motion.p>
            </motion.div>
          )}
          
          {!isSignedIn && (
            <motion.p
              className="text-gray-400 mt-8 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.2 }}
            >
              Sign in to connect your wallet and access the full ecosystem
            </motion.p>
          )}
        </motion.div>

        {/* Blockchain Status - Responsive positioning */}
        <motion.div
          className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
        >
          <motion.div
            className="w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0.7)',
                '0 0 0 10px rgba(34, 197, 94, 0)',
                '0 0 0 0 rgba(34, 197, 94, 0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ willChange: 'transform' }}
          />
          <span className="text-green-400 text-xs md:text-sm font-semibold">$DYO Token Ecosystem Live</span>
        </motion.div>
      </div>
    </div>
  );
};

export default ExploreNow;