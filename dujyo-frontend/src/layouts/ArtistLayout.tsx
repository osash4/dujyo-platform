import React, { ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Music, 
  TrendingUp, 
  Upload, 
  BarChart3,
  FileText, 
  Users, 
  Settings,
  LogOut, Wallet,
  DollarSign,
  Headphones,
  Video,
  Gamepad,
  HelpCircle,
  Coins,
  Play
} from 'lucide-react';
import { LanguageSelector } from '../components/onboarding/LanguageSelector';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { getApiBaseUrl } from '../utils/apiConfig';
import MainHeader from '../components/Layout/MainHeader';
import Logo from '../components/common/Logo';

interface ArtistLayoutProps {
  children: ReactNode;
}

const ArtistLayout: React.FC<ArtistLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { account } = useWallet();
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [streamCount, setStreamCount] = useState(0);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

  // Fetch artist earnings
  useEffect(() => {
    if (user && account) {
      fetchArtistEarnings();
    }
  }, [user, account]);

  const fetchArtistEarnings = async () => {
    setIsLoadingEarnings(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/earnings/artist/${account || user?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWeeklyEarnings(data.weeklyEarnings || 0);
        setStreamCount(data.streamCount || 0);
      }
    } catch (error) {
      console.error('Error fetching artist earnings:', error);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const artistNavigationItems = [
    { 
      path: '/artist/dashboard', 
      icon: Home, 
      label: 'Artist Portal', 
      color: '#F59E0B',
      description: 'Overview & Metrics',
      earningContext: 'Track your $DYO earnings'
    },
    { 
      path: '/artist/royalties', 
      icon: DollarSign, 
      label: 'Earnings & Payments', 
      color: '#FBBF24',
      description: 'Earnings & Payments in $DYO',
      earningContext: 'View all your $DYO earnings'
    },
    { 
      path: '/payments', 
      icon: Wallet, 
      label: 'Payments', 
      color: '#EA580C',
      description: 'Withdrawals & Tax Reports',
      earningContext: 'Withdraw your $DYO tokens'
    },
    { 
      path: '/artist/upload', 
      icon: Upload, 
      label: 'Content Hub', 
      color: '#F59E0B',
      description: 'Upload Music/Video/Gaming',
      earningContext: 'Upload to earn $DYO'
    },
    { 
      path: '/artist/video', 
      icon: Video, 
      label: 'Video Content', 
      color: '#00F5FF',
      description: 'Manage Video Content',
      earningContext: 'Earn from video streams'
    },
    { 
      path: '/artist/gaming', 
      icon: Gamepad, 
      label: 'Gaming Content', 
      color: '#EA580C',
      description: 'Manage Gaming Assets',
      earningContext: 'Earn from gaming plays'
    },
    { 
      path: '/artist/analytics', 
      icon: BarChart3, 
      label: 'Analytics', 
      color: '#3B82F6',
      description: 'Cross-Platform Insights',
      earningContext: 'Track earnings analytics'
    },
    { 
      path: '/artist/content', 
      icon: FileText, 
      label: 'My Content', 
      color: '#EF4444',
      description: 'Manage Catalog',
      earningContext: 'Manage earning content'
    },
    { 
      path: '/artist/fans', 
      icon: Users, 
      label: 'Fan Engagement', 
      color: '#EC4899',
      description: 'Connect with Fans',
      earningContext: 'Engage to boost earnings'
    },
  ];

  const generalNavigationItems = [
    { 
      path: '/music', 
      icon: Music, 
      label: 'Discover Music', 
      color: '#F59E0B',
      description: 'Explore & Listen'
    },
    { 
      path: '/video', 
      icon: Video, 
      label: 'Videos', 
      color: '#00F5FF',
      description: 'Watch & Explore'
    },
    { 
      path: '/gaming', 
      icon: Gamepad, 
      label: 'Gaming', 
      color: '#EA580C',
      description: 'Play & Discover'
    },
    { 
      path: '/marketplace', 
      icon: TrendingUp, 
      label: 'Marketplace', 
      color: '#FFD700',
      description: 'Trade & Invest'
    },
    { 
      path: '/profile', 
      icon: Settings, 
      label: 'Profile Settings', 
      color: '#4ECDC4',
      description: 'Account & Preferences'
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Main Header - Desktop only, hidden on mobile since sidebar has header */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-40">
        <MainHeader showSearch={false} showNotifications={false} />
      </div>
      
      {/* Artist Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 shadow-2xl"
        style={{ top: '64px' }} // Adjust for MainHeader height
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            {/* DUJYO Logo - Icon + Text */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Logo size="md" variant="icon" showText={false} />
              <Logo size="sm" variant="text" />
            </div>
            
            {/* Enhanced Artist Identity Section */}
            {user && (
              <motion.div
                className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-lg"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm text-gray-300 mb-1">Welcome back,</p>
                <p className="font-semibold text-white text-lg">{user.displayName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-full">
                    <Coins className="w-3 h-3" style={{ color: '#F59E0B' }} />
                    <span className="text-xs font-semibold" style={{ color: '#FBBF24' }}>Stream-to-Earn Active</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-300">
                  <TrendingUp className="w-3 h-3" />
                  <span>Earning $DYO</span>
              </div>
              </motion.div>
            )}
          </div>

          {/* Quick Earnings Widget */}
          {user && (
            <div className="px-6 py-4 border-b border-gray-700">
              <motion.div
                className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-lg p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Earnings</h3>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                {isLoadingEarnings ? (
                  <div className="text-sm text-gray-400">Loading...</div>
                ) : (
                  <>
                    <div className="mb-2">
                      <div className="text-2xl font-bold text-amber-400">{weeklyEarnings.toFixed(2)} $DYO</div>
                      <div className="text-xs text-gray-400">This Week</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-gray-400">
                        <Play className="w-3 h-3 inline mr-1" />
                        {streamCount.toLocaleString()} streams
                      </div>
                      <button
                        onClick={() => navigate('/artist/royalties')}
                        className="text-amber-400 hover:text-amber-300 transition-colors text-xs font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Artist Tools Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Artist Tools
              </h3>
              <div className="space-y-1">
                {artistNavigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.path}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" style={{ color: isActive(item.path) ? 'white' : item.color }} />
                      <div className="flex-1 text-left">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs opacity-75">{item.description}</p>
                        {item.earningContext && (
                          <p className="text-xs opacity-50 mt-0.5" style={{ color: isActive(item.path) ? 'rgba(255,255,255,0.5)' : '#F59E0B' }}>
                            {item.earningContext}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* General Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                General
              </h3>
              <div className="space-y-1">
                {generalNavigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.path}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" style={{ color: isActive(item.path) ? 'white' : item.color }} />
                      <div className="flex-1 text-left">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs opacity-75">{item.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Language Selector */}
            <div className="mb-2">
              <LanguageSelector position="sidebar" />
            </div>

            {/* Help Center */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if ((window as any).openHelpCenter) {
                  (window as any).openHelpCenter();
                }
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-amber-600 hover:text-white transition-all duration-200"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">Help Center</span>
            </motion.button>

            {/* Sign Out */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </motion.button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Headphones className="w-4 h-4" />
              <span>DUJYO Artist Portal v2.0</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 ml-0 md:ml-80">
        {/* Mobile Header */}
        <header className="md:hidden bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
          <button
            onClick={toggleSidebar}
            className="text-white hover:text-amber-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center justify-center flex-1">
            <Logo size="md" variant="full" className="h-6" />
          </div>
          <div className="w-6" />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-900" style={{ paddingTop: '64px' }}>
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ArtistLayout;
