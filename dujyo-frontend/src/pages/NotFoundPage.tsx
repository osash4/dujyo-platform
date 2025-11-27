import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Number */}
          <motion.h1
            className="text-9xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent mb-4"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            404
          </motion.h1>

          {/* Error Message */}
          <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
          <p className="text-gray-400 text-lg mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/25"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Home className="w-5 h-5" />
              Go Home
            </motion.button>

            <motion.button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </motion.button>

            <motion.button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-5 h-5" />
              Explore
            </motion.button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <p className="text-gray-500 text-sm mb-4">You might be looking for:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => navigate('/artist/dashboard')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Artist Dashboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFoundPage;

