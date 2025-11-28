import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Palette, 
  Heart, 
  Plus,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface RegistrationForm {
  type: 'economic' | 'creative' | 'community';
  address: string;
  stake?: number;
  verified_nfts?: string[];
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  validator_type: string;
}

const ValidatorRegistration: React.FC = () => {
  const [form, setForm] = useState<RegistrationForm>({
    type: 'economic',
    address: '',
    stake: 1000,
    verified_nfts: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RegistrationResponse | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setResult({
        success: false,
        message: 'Please login to register as a validator',
        validator_type: form.type
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let endpoint = '';
      let body: any = { address: user.uid };

      switch (form.type) {
        case 'economic':
          endpoint = '/consensus/register/economic';
          body.stake = form.stake || 1000;
          break;
        case 'creative':
          endpoint = '/consensus/register/creative';
          body.verified_nfts = form.verified_nfts || [];
          break;
        case 'community':
          endpoint = '/consensus/register/community';
          break;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Registration error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        validator_type: form.type
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validatorTypes = [
    {
      type: 'economic' as const,
      title: 'Economic Validator',
      description: 'Secure the network through staking and economic activity',
      icon: TrendingUp,
      color: '#00F5FF',
      requirements: ['Minimum 1,000 DYO stake', 'Active economic participation', 'Transaction validation']
    },
    {
      type: 'creative' as const,
      title: 'Creative Validator',
      description: 'Validate content authenticity and royalty distribution',
      icon: Palette,
      color: '#F59E0B',
      requirements: ['Verified NFTs', 'Creative score > 50', 'Royalty earnings']
    },
    {
      type: 'community' as const,
      title: 'Community Validator',
      description: 'Govern the network through voting and content curation',
      icon: Heart,
      color: '#EA580C',
      requirements: ['Community participation', 'Voting activity', 'Content curation']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-white mb-4">
          <span className="bg-gradient-to-r from-amber-400 via-blue-500 to-orange-600 bg-clip-text text-transparent">
            Become a CPV Validator
          </span>
        </h2>
        <p className="text-gray-300 text-lg">
          Join the DUJYO consensus network and help secure the creative economy
        </p>
      </motion.div>

      {/* Validator Type Selection */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {validatorTypes.map((validator) => {
          const Icon = validator.icon;
          const isSelected = form.type === validator.type;
          
          return (
            <motion.button
              key={validator.type}
              onClick={() => setForm(prev => ({ ...prev, type: validator.type }))}
              className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                isSelected 
                  ? 'border-amber-400 bg-amber-400/10' 
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center">
                <div className={`p-3 rounded-full mx-auto mb-4 ${
                  isSelected ? 'bg-amber-400/20' : 'bg-gray-700/50'
                }`}>
                  <Icon 
                    size={32} 
                    className={isSelected ? 'text-amber-400' : 'text-gray-400'} 
                  />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  isSelected ? 'text-white' : 'text-gray-300'
                }`}>
                  {validator.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {validator.description}
                </p>
                <div className="space-y-1">
                  {validator.requirements.map((req, index) => (
                    <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      {req}
                    </div>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Registration Form */}
      <motion.div
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-amber-400" />
          Registration Form
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Address (auto-filled with user's wallet) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={user?.uid || ''}
              disabled
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your wallet address (automatically filled)
            </p>
          </div>

          {/* Economic Validator Fields */}
          {form.type === 'economic' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stake Amount (DYO)
              </label>
              <input
                type="number"
                value={form.stake || 1000}
                onChange={(e) => setForm(prev => ({ ...prev, stake: parseInt(e.target.value) }))}
                min="1000"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum stake: 1,000 DYO
              </p>
            </div>
          )}

          {/* Creative Validator Fields */}
          {form.type === 'creative' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verified NFT IDs (comma-separated)
              </label>
              <input
                type="text"
                value={form.verified_nfts?.join(', ') || ''}
                onChange={(e) => setForm(prev => ({ 
                  ...prev, 
                  verified_nfts: e.target.value.split(',').map(id => id.trim()).filter(id => id)
                }))}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="NFT-001, NFT-002, NFT-003"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the IDs of your verified NFTs
              </p>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 rounded-xl text-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Register as {validatorTypes.find(v => v.type === form.type)?.title}
              </>
            )}
          </motion.button>
        </form>

        {/* Result */}
        {result && (
          <motion.div
            className={`mt-6 p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-500/20 border-green-500/50' 
                : 'bg-red-500/20 border-red-500/50'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={`font-semibold ${
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.success ? 'Registration Successful!' : 'Registration Failed'}
              </span>
            </div>
            <p className="text-gray-300 mt-2">{result.message}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ValidatorRegistration;
