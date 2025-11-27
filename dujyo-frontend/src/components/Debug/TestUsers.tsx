import React from 'react';
import { motion } from 'framer-motion';

const TestUsers: React.FC = () => {
  const testUsers = [
    {
      email: 'admin@dujyo.admin',
      password: 'admin123',
      role: 'admin',
      description: 'Administrator account'
    },
    {
      email: 'artist@dujyo.artist',
      password: 'artist123',
      role: 'artist',
      description: 'Artist account'
    },
    {
      email: 'validator@dujyo.validator',
      password: 'validator123',
      role: 'validator',
      description: 'Validator account'
    },
    {
      email: 'listener@example.com',
      password: 'listener123',
      role: 'listener',
      description: 'Regular listener account'
    },
    {
      email: 'demo@example.com',
      password: 'demo123',
      role: 'listener',
      description: 'Demo account'
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-amber-400/30 shadow-lg max-w-4xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-amber-400 mb-6 text-center">
        🔐 Test Users for Dujyo Login
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testUsers.map((user, index) => (
          <motion.div
            key={user.email}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-amber-400/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                user.role === 'artist' ? 'bg-pink-500/20 text-orange-400' :
                user.role === 'validator' ? 'bg-blue-500/20 text-blue-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {user.role.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400">Email:</label>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-white bg-gray-800 px-2 py-1 rounded flex-1">
                    {user.email}
                  </code>
                  <button
                    onClick={() => copyToClipboard(user.email)}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                    title="Copy email"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Password:</label>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-white bg-gray-800 px-2 py-1 rounded flex-1">
                    {user.password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(user.password)}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                    title="Copy password"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 italic">
                {user.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <h3 className="text-yellow-400 font-semibold mb-2">📝 How to use:</h3>
        <ol className="text-sm text-gray-300 space-y-1">
          <li>1. Go to the Login page</li>
          <li>2. Copy and paste any email/password from above</li>
          <li>3. Click "Sign In"</li>
          <li>4. You should be redirected to your profile</li>
        </ol>
      </div>
      
      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h3 className="text-blue-400 font-semibold mb-2">🔧 Debug Info:</h3>
        <p className="text-sm text-gray-300">
          If login fails, check the browser console for error messages. 
          The system generates unique wallets for each email address.
        </p>
      </div>
    </motion.div>
  );
};

export default TestUsers;
