import { 
  Home as HomeIcon, User as UserIcon, Settings as SettingsIcon, 
  LogOut as LogOutIcon, LogIn as LogInIcon, Wallet as WalletIcon,
  Music, Video, Gamepad, ShoppingCart, TrendingUp, Search, BarChart3
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { motion } from 'framer-motion';

interface BottomNavBarProps {
  onNavigateToSettings: () => void;
  onNavigateToProfile: () => void;
  onNavigateToAccount: () => void;
  onConnectWallet: () => void; // Nueva función para conectar la billetera
  onLogout: () => void; // Nueva función para el logout
  value: string;
  onChange: (newValue: string) => void;
  placeholder: string;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onNavigateToSettings,
  onNavigateToProfile,
  onNavigateToAccount,
  onConnectWallet,
  onLogout,
  value,
  onChange,
  placeholder
}) => {
  const { isSignedIn, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    if (!isSignedIn) {
      signIn('test@example.com', 'password123');
    }
  };

  const handleLogoutInternal = () => {
    if (isSignedIn) {
      signOut();
      navigate('/explore');
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
      console.log('El usuario ha cerrado sesión');
    }
  }, [isSignedIn]);

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogoutConfirmation = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      handleLogoutInternal();
      onLogout();
    }
  };

  const navigationItems = [
    { path: '/home', icon: HomeIcon, label: 'Home', color: '#8B5CF6' },
    { path: '/music', icon: Music, label: 'Music', color: '#F59E0B' },
    { path: '/video', icon: Video, label: 'Video', color: '#00F5FF' },
    { path: '/gaming', icon: Gamepad, label: 'Gaming', color: '#EA580C' },
    { path: '/marketplace', icon: ShoppingCart, label: 'Market', color: '#FFD700' },
    { path: '/dex', icon: TrendingUp, label: 'DEX', color: '#FF6B6B' },
    { path: '/consensus', icon: BarChart3, label: 'CPV', color: '#9C27B0' },
    { path: '/profile', icon: UserIcon, label: 'Profile', color: '#4ECDC4' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800/90 backdrop-blur-lg border-t border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Navigation Items */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <motion.button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 min-w-0 ${
                    active 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {active && (
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${item.color}20, transparent)`,
                        border: `1px solid ${item.color}30`,
                        boxShadow: `0 0 10px ${item.color}20`
                      }}
                      layoutId="activeBottomNav"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  <Icon 
                    size={20} 
                    style={{ color: active ? item.color : undefined }}
                    className="relative z-10"
                  />
                  <span className="text-xs font-medium relative z-10 truncate max-w-16">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {isSignedIn ? (
              <>
                <motion.button
                  onClick={onConnectWallet}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <WalletIcon size={16} />
                  <span className="text-xs font-medium">Wallet</span>
                </motion.button>
                
                <motion.button
                  onClick={handleLogoutConfirmation}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOutIcon size={16} />
                  <span className="text-xs font-medium">Logout</span>
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogInIcon size={16} />
                  <span className="text-xs font-medium">Sign In</span>
                </motion.button>
                
                <motion.button
                  onClick={() => navigate('/signup')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-xs font-medium">Sign Up</span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomNavBar;
