import React, { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { useWallet } from '../../hooks/useWallet';
import { getApiBaseUrl } from '../../utils/apiConfig';
import GlobalPlayer from '../Player/GlobalPlayer';
import SpotifyBottomNav from './BottomNav';
import MainHeader from './MainHeader';
import Logo from '../common/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Music, Video, Gamepad,
  ShoppingCart, TrendingUp, User, LogOut,
  BarChart3, Shield, Palette, Settings, HelpCircle,
  Wallet, Coins
} from 'lucide-react';
import { LanguageSelector } from '../onboarding/LanguageSelector';

interface SimpleAppLayoutProps {
  children: ReactNode;
}

const SimpleAppLayout: React.FC<SimpleAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, getUserRole, user } = useAuth();
  const { currentTrack, playerPosition } = usePlayerContext();
  const { account } = useWallet();
  const [userEarnings, setUserEarnings] = useState(0);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  
  // 🎯 Estado para Edge Reveal del sidebar derecho
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [shouldShowSidebar, setShouldShowSidebar] = useState(false);
  
  // 🎯 Control de visibilidad del sidebar con Edge Reveal
  React.useEffect(() => {
    if (isSidebarHovered) {
      setShouldShowSidebar(true);
    } else {
      const timer = setTimeout(() => {
        if (!isSidebarHovered) {
          setShouldShowSidebar(false);
        }
      }, 1200); // 1.2 segundos de delay - tiempo suficiente para navegar sin que se cierre accidentalmente
      return () => clearTimeout(timer);
    }
  }, [isSidebarHovered]);

  // Fetch user earnings for listener/artist roles
  useEffect(() => {
    const userRole = getUserRole();
    if ((userRole === 'listener' || userRole === 'artist') && (account || user?.email)) {
      fetchUserEarnings();
    }
  }, [account, user, getUserRole]);

  const fetchUserEarnings = async () => {
    if (!account && !user?.email) return;
    
    setIsLoadingEarnings(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = account || user?.email || '';
      const endpoint = getUserRole() === 'artist' 
        ? `/api/earnings/artist/${userId}`
        : `/api/earnings/user/${userId}`;
      
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserEarnings(data.totalEarnings || data.weeklyEarnings || 0);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  // Get user role
  const userRole = getUserRole();

  // Role colors for indicators
  const getRoleColor = () => {
    switch (userRole) {
      case 'listener': return '#4ECDC4'; // Cyan
      case 'artist': return '#F59E0B'; // DUJYO Gold
      case 'validator': return '#00F5FF'; // Cyan
      case 'admin': return '#EF4444'; // Red
      default: return '#9CA3AF'; // Gray
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'listener': return 'Listener';
      case 'artist': return 'Artist';
      case 'validator': return 'Validator';
      case 'admin': return 'Admin';
      default: return 'User';
    }
  };

  // Define navigation items based on user role - COMPLETELY DIFFERENT EXPERIENCES
  const getNavigationItems = () => {
    switch (userRole) {
      case 'listener':
        return [
          { path: '/', icon: Home, label: 'Discover', color: '#8B5CF6' },
          { path: '/music', icon: Music, label: 'Music', color: '#F59E0B' },
          { path: '/video', icon: Video, label: 'Videos', color: '#00F5FF' },
          { path: '/gaming', icon: Gamepad, label: 'Games', color: '#EA580C' },
          { path: '/marketplace', icon: ShoppingCart, label: 'Shop', color: '#FFD700' },
          { path: '/dex', icon: TrendingUp, label: 'DEX', color: '#FF6B6B' },
          { path: '/profile', icon: User, label: 'My Profile', color: '#4ECDC4' },
          { path: '/settings', icon: Settings, label: 'Settings', color: '#9CA3AF' },
        ];

      case 'artist':
        return [
          { path: '/artist/dashboard', icon: Palette, label: 'Multistreaming Dashboard', color: '#F59E0B' },
          { path: '/music', icon: Music, label: 'Music', color: '#F59E0B' },
          { path: '/video', icon: Video, label: 'Videos', color: '#00F5FF' },
          { path: '/gaming', icon: Gamepad, label: 'Gaming', color: '#EA580C' },
          { path: '/marketplace', icon: ShoppingCart, label: 'Marketplace', color: '#FFD700' },
          { path: '/profile', icon: User, label: 'Artist Profile', color: '#4ECDC4' },
        ];

      case 'validator':
        return [
          { path: '/', icon: Home, label: 'Validator Hub', color: '#8B5CF6' },
          { path: '/validator', icon: Shield, label: 'Validation Panel', color: '#00F5FF' },
          { path: '/consensus', icon: BarChart3, label: 'CPV Consensus', color: '#8B5CF6' },
          { path: '/validator/rewards', icon: TrendingUp, label: 'Rewards', color: '#FFD700' },
          { path: '/validator/stats', icon: BarChart3, label: 'Network Stats', color: '#EA580C' },
          { path: '/profile', icon: User, label: 'Validator Profile', color: '#4ECDC4' },
        ];

      case 'admin':
        return [
          { path: '/', icon: Home, label: 'Admin Panel', color: '#8B5CF6' },
          { path: '/admin/users', icon: User, label: 'User Management', color: '#F59E0B' },
          { path: '/admin/content', icon: Music, label: 'Content Moderation', color: '#00F5FF' },
          { path: '/admin/blockchain', icon: Shield, label: 'Blockchain', color: '#EA580C' },
          { path: '/admin/analytics', icon: BarChart3, label: 'System Analytics', color: '#8B5CF6' },
          { path: '/profile', icon: User, label: 'Admin Profile', color: '#4ECDC4' },
        ];

      default:
        return [
          { path: '/', icon: Home, label: 'Home', color: '#8B5CF6' },
          { path: '/profile', icon: User, label: 'Profile', color: '#4ECDC4' },
        ];
    }
  };

  const navigationItems = getNavigationItems();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleWalletClick = () => {
    navigate('/wallet');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      {/* Main Header - Desktop only */}
      <div className="hidden lg:block">
        <MainHeader showSearch={true} showNotifications={true} />
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '64px' }}>
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
        
        {/* Spotify-style Bottom Navigation */}
        <SpotifyBottomNav />
      </div>

      {/* 🎯 Zona de detección de proximidad para el sidebar (invisible) - Edge Reveal */}
      <div
        className="fixed right-0 top-0 bottom-0 z-40"
        style={{
          width: '60px', // Zona de detección generosa (60px) para facilitar la activación desde el borde
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      />

      {/* Sidebar - Right side with icons only - Edge Reveal */}
      <AnimatePresence>
        {shouldShowSidebar && (
          <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            style={{ 
              width: '80px', 
              backgroundColor: '#1f2937', 
              minHeight: '100vh', 
              position: 'fixed',
              right: 0,
              top: 0,
              zIndex: 9999,
              borderLeft: '1px solid #374151',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)' // Sombra sutil para dar profundidad
            }}
          >
        <div style={{ padding: '16px 8px', color: 'white' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            {/* DUJYO Logo at top - Enhanced with hover text */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                width: '48px',
                minHeight: '48px',
                marginBottom: '8px',
                paddingBottom: '12px',
                borderBottom: '1px solid #374151',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => navigate('/')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="DUJYO - Go to Home"
            >
              <Logo size="sm" variant="icon" showText={false} />
              {/* Text logo appears on hover (optional enhancement) */}
              <div 
                className="hidden group-hover:block"
                style={{ 
                  marginTop: '4px',
                  fontSize: '8px',
                  color: '#F59E0B',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                DUJYO
              </div>
            </div>

            {/* User Role Indicator */}
            {userRole && (
              <div
                title={getRoleLabel()}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: `${getRoleColor()}20`,
                  border: `2px solid ${getRoleColor()}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                  cursor: 'default'
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: getRoleColor()
                  }}
                />
              </div>
            )}

            {/* Stream-to-Earn Status Badge for Listener/Artist */}
            {(userRole === 'listener' || userRole === 'artist') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                title={`Earning $DYO - ${userEarnings.toFixed(2)} $DYO`}
                style={{
                  width: '48px',
                  padding: '6px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'default'
                }}
              >
                <Coins size={16} style={{ color: '#F59E0B' }} />
                <div style={{ 
                  fontSize: '8px', 
                  color: '#FBBF24',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  lineHeight: '1'
                }}>
                  EARNING
                </div>
                {!isLoadingEarnings && userEarnings > 0 && (
                  <div style={{ 
                    fontSize: '7px', 
                    color: '#F59E0B',
                    textAlign: 'center',
                    lineHeight: '1'
                  }}>
                    {userEarnings.toFixed(1)}
                  </div>
                )}
              </motion.div>
            )}

            {/* Wallet Quick Access Button */}
            <button
              onClick={handleWalletClick}
              title="Wallet & Earnings"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px', 
                height: '48px',
                backgroundColor: location.pathname === '/wallet' ? '#10B981' : 'transparent',
                color: location.pathname === '/wallet' ? 'white' : '#10B981',
                border: location.pathname === '/wallet' ? 'none' : '1px solid #10B981',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.2s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== '/wallet') {
                  e.currentTarget.style.backgroundColor = '#10B981';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/wallet') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#10B981';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <Wallet size={24} />
            </button>

            <div style={{ height: '20px', borderTop: '1px solid #374151', width: '100%', margin: '8px 0' }} />
            
            {/* Navigation Items */}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  title={item.label}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px', 
                    height: '48px',
                    backgroundColor: isActive ? '#374151' : 'transparent',
                    color: isActive ? '#F59E0B' : 'white', // DUJYO gold for active state
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#374151';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <Icon size={24} style={{ color: isActive ? '#F59E0B' : 'white' }} />
                </button>
              );
            })}
            
            <div style={{ height: '20px', borderTop: '1px solid #374151', width: '100%', margin: '8px 0' }} />
            
            {/* Language Selector */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px', 
              height: '48px',
            }}>
              <LanguageSelector position="sidebar" />
            </div>

            {/* Help Center Button */}
            <button
              onClick={() => {
                if ((window as any).openHelpCenter) {
                  (window as any).openHelpCenter();
                }
              }}
              title="Help Center"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px', 
                height: '48px',
                backgroundColor: 'transparent',
                color: '#F59E0B', // DUJYO gold instead of purple
                border: 'none',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <HelpCircle size={24} />
            </button>
            
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px', 
                height: '48px',
                backgroundColor: 'transparent',
                color: '#ef4444',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Global Player - Show when there's a track */}
      {currentTrack && (
        <GlobalPlayer 
          track={currentTrack}
          position={playerPosition}
        />
      )}
    </div>
  );
};

export default SimpleAppLayout;
