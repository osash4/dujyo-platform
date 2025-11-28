import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search, Bell, User, Menu } from 'lucide-react';
import Logo from '../common/Logo';
import { motion } from 'framer-motion';

interface MainHeaderProps {
  onMenuClick?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
}

const MainHeader: React.FC<MainHeaderProps> = ({ 
  onMenuClick, 
  showSearch = true, 
  showNotifications = true 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-6">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          )}
          
          {/* Logo - Clickable */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo size="md" variant="icon" showText={false} />
            <div className="hidden sm:block">
              <Logo size="sm" variant="text" />
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-4">
            <button
              onClick={() => navigate('/explore')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/explore' || location.pathname === '/'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('nav.discover')}
            </button>
            <button
              onClick={() => navigate('/music')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/music'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('nav.music')}
            </button>
            <button
              onClick={() => navigate('/video')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/video'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('nav.videos')}
            </button>
            <button
              onClick={() => navigate('/gaming')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/gaming'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('nav.gaming')}
            </button>
          </nav>
        </div>

        {/* Center: Search (Desktop) */}
        {showSearch && (
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('page.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </form>
          </div>
        )}

        {/* Right: User menu + Notifications */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {showNotifications && (
            <button
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
            </button>
          )}

          {/* User Profile */}
          {user ? (
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="hidden sm:block text-sm text-gray-300">
                {user.displayName || user.email}
              </span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {t('auth.signIn')}
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default MainHeader;

