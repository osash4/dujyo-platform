import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight,
  Star
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../utils/apiConfig';

const BecomeArtist: React.FC = () => {
  const { user, getUserRole, signIn } = useAuth();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const userRole = getUserRole();

  // Redirect if already artist or validator
  useEffect(() => {
    if (userRole === 'artist' || userRole === 'validator') {
      navigate('/profile');
    }
  }, [userRole, navigate]);


  const handleBecomeArtist = async () => {
    if (!termsAccepted) {
      setError('You must accept the terms to become an artist');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('🔐 Token found, length:', token.length);
      console.log('🔐 Token (first 20 chars):', token.substring(0, 20));

      // Call backend endpoint to become artist
      const apiBaseUrl = getApiBaseUrl();
      console.log('📡 Calling:', `${apiBaseUrl}/api/v1/user/become-artist`);
      
      const response = await fetch(`${apiBaseUrl}/api/v1/user/become-artist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accept_terms: true
        })
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (!response.ok) {
        // Try to get error message from JSON, fallback to status text
        let errorMessage = 'Failed to become artist';
        if (response.status === 401) {
          errorMessage = 'Unauthorized. Your session may have expired. Please log in again.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
        }
        console.error('❌ Error response:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      // Get response text first to check if it's empty
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server');
      }

      // Parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error('Invalid response from server');
      }
      
      if (result.success) {
        // Update user role in local storage - keep the same wallet address
        if (user) {
          const updatedUser = { ...user, role: 'artist' as const };
          // IMPORTANT: Keep the same wallet address (uid) - don't change it
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Force reload user from backend to get updated role
          // Get fresh user data from backend
          const token = localStorage.getItem('jwt_token');
          if (token) {
            try {
              const apiBaseUrl = getApiBaseUrl();
              const userResponse = await fetch(`${apiBaseUrl}/api/v1/user/type`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (userResponse.ok) {
                const userData = await userResponse.json();
                const refreshedUser = {
                  ...user,
                  role: (userData.user_type || 'listener') as 'listener' | 'artist' | 'validator' | 'admin'
                };
                localStorage.setItem('user', JSON.stringify(refreshedUser));
                // Reload page to refresh AuthContext
                window.location.href = '/profile';
                return;
              }
            } catch (e) {
              console.warn('Failed to refresh user data, using local update:', e);
            }
          }
          
          // Fallback: just navigate and reload
          window.location.href = '/profile';
        } else {
          window.location.href = '/profile';
        }
      } else {
        throw new Error(result.message || 'Failed to become artist');
      }
    } catch (error) {
      console.error('Failed to upgrade to artist:', error);
      setError(error instanceof Error ? error.message : 'Failed to become artist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // MVP Simplified: Only show terms and conditions, no email verification or quiz

  if (userRole === 'artist' || userRole === 'validator') {
    return null;
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-hero)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
            >
              <Star size={48} className="text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-4">Become an Artist</h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Join thousands of creators on DUJYO and start earning from your content. 
              Upload music, videos, and gaming content to reach a global audience.
            </p>
          </div>

          {/* Terms & Conditions */}
          <div className="card p-6 rounded-xl border border-amber-400/20">
            <h3 className="text-xl font-semibold text-white mb-4">Artist Terms & Conditions</h3>
            <div className="bg-gray-900/50 p-6 rounded-lg max-h-96 overflow-y-auto space-y-4 text-gray-300 text-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p>
                <strong className="text-white">1. Content Ownership:</strong> You retain all rights to your original content. 
                By uploading to DUJYO, you grant us a non-exclusive license to distribute your content.
              </p>
              <p>
                <strong className="text-white">2. Royalty Payments:</strong> You will receive 70% of net revenue from your content. 
                Payments are processed monthly on the first business day.
              </p>
              <p>
                <strong className="text-white">3. Content Guidelines:</strong> All content must be original or properly licensed. 
                No copyrighted material without permission. Content must comply with our community guidelines.
              </p>
              <p>
                <strong className="text-white">4. Quality Standards:</strong> Audio content must be at least 320kbps. 
                Video content must be at least 720p. Gaming content must be properly packaged.
              </p>
              <p>
                <strong className="text-white">5. Account Security:</strong> You are responsible for maintaining the security of your account. 
                Report any suspicious activity immediately.
              </p>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="terms" className="text-gray-300">
                I have read and agree to the Artist Terms and Conditions
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Become Artist Button */}
          <div className="flex justify-center">
            <motion.button
              onClick={handleBecomeArtist}
              disabled={isLoading || !termsAccepted}
              className="btn-primary font-semibold py-3 px-8 rounded-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center gap-2"
              whileHover={{ scale: termsAccepted && !isLoading ? 1.05 : 1 }}
              whileTap={{ scale: termsAccepted && !isLoading ? 0.95 : 1 }}
            >
              {isLoading ? 'Upgrading...' : 'Become an Artist!'}
              {!isLoading && <ArrowRight size={20} />}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BecomeArtist;
