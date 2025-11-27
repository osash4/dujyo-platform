import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Search, Home, Compass, User } from 'lucide-react';
import Logo from '../common/Logo';

const SpotifyBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleBrowseClick = () => {
    navigate('/explore');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-700" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: User Profile */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleProfileClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
          </button>
        </div>

        {/* Center: Search Bar with Home and Browse */}
        <div className="flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={handleHomeClick}
                className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${
                  location.pathname === '/' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Home className="w-4 h-4" />
              </button>
              <Search className="absolute left-12 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you in the mood for?"
                className="w-full pl-20 pr-20 py-2 bg-gray-800 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={handleBrowseClick}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                <Compass className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Right: DUJYO Logo */}
        <div className="flex items-center space-x-3">
          <Logo size="sm" showText={false} variant="icon" />
        </div>
      </div>
    </div>
  );
};

export default SpotifyBottomNav;
