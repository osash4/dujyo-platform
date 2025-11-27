import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { 
  Home, Search, Library, Heart, Music, Video, Gamepad, 
  ShoppingCart, TrendingUp, User, Settings, LogOut, 
  Wallet, Coins, Upload, Palette,
  DollarSign, Users, FileText, Mic
} from 'lucide-react';
import Logo from '../common/Logo';

interface SidebarProps {
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, getUserRole } = useAuth();

  const userRole = getUserRole();

  // Base navigation items for all users
  const baseNavigationItems = [
    { path: '/home', icon: Home, label: 'Home', color: '#8B5CF6' },
    { path: '/wallet', icon: Wallet, label: 'Wallet', color: '#00F5FF' },
    { path: '/music', icon: Music, label: 'Music', color: '#F59E0B' },
    { path: '/video', icon: Video, label: 'Video', color: '#00F5FF' },
    { path: '/gaming', icon: Gamepad, label: 'Gaming', color: '#EA580C' },
    { path: '/marketplace', icon: ShoppingCart, label: 'Marketplace', color: '#FFD700' },
    { path: '/dex', icon: TrendingUp, label: 'DEX', color: '#FF6B6B' },
    { path: '/profile', icon: User, label: 'Profile', color: '#4ECDC4' },
    { path: '/library', icon: Library, label: 'Library', color: '#45B7D1' },
    { path: '/search', icon: Search, label: 'Search', color: '#96CEB4' },
    { path: '/liked', icon: Heart, label: 'Liked', color: '#FFEAA7' },
  ];

  // Artist-specific navigation items
  const artistNavigationItems = [
    { path: '/artist/dashboard', icon: Palette, label: 'Artist Portal', color: '#8B5CF6' },
    { path: '/artist/royalties', icon: DollarSign, label: 'Royalties', color: '#10B981' },
    { path: '/artist/upload', icon: Upload, label: 'Content Hub', color: '#F59E0B' },
    { path: '/artist/content', icon: FileText, label: 'My Content', color: '#EF4444' },
    { path: '/artist/fans', icon: Users, label: 'Fan Engagement', color: '#EC4899' },
  ];

  // Other role-specific items
  const otherNavigationItems = [
    { path: '/staking', icon: Coins, label: 'Staking', color: '#FFD700' },
    { path: '/upload', icon: Upload, label: 'Upload', color: '#F59E0B' },
  ];

  // Combine navigation items based on user role
  const getNavigationItems = () => {
    if (userRole === 'artist') {
      return [...artistNavigationItems, ...baseNavigationItems];
    } else {
      return [...baseNavigationItems, ...otherNavigationItems];
    }
  };

  const navigationItems = getNavigationItems();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo size="lg" variant="icon" showText={false} />
          <Logo size="md" variant="text" className="ml-3" />
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active Background */}
              {active && (
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 rounded-r-full"
                  layoutId="activeIndicator"
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Icon */}
              <div className={`p-2 rounded-lg transition-all duration-300 ${
                active 
                  ? 'bg-gray-700' 
                  : 'hover:bg-gray-700/50'
              }`}>
                <Icon 
                  size={20} 
                  style={{ color: active ? item.color : undefined }}
                />
              </div>

              {/* Label */}
              <span className="font-medium">{item.label}</span>

              {/* Active Glow */}
              {active && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}10, transparent)`,
                    border: `1px solid ${item.color}30`,
                    boxShadow: `0 0 20px ${item.color}20`
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <motion.button
          onClick={() => handleNavigation('/settings')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-gray-400 hover:text-gray-300 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-2 rounded-lg hover:bg-gray-700/50">
            <Settings size={20} />
          </div>
          <span className="font-medium">Settings</span>
        </motion.button>

        <motion.button
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-400 hover:text-red-300 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-2 rounded-lg hover:bg-red-500/10">
            <LogOut size={20} />
          </div>
          <span className="font-medium">Logout</span>
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;
