import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Music, 
  Image, 
  FileText, 
  Users, 
  DollarSign,
  Calendar,
  Tag,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Save,
  Play,
  Pause,
  Coins,
  TrendingUp,
  Sparkles,
  Zap,
  Award,
  BarChart3,
  Target,
  Info,
  Gift,
  ArrowRight,
  Activity,
  Lock,
  Percent,
  Calculator
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface SongMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  mood: string;
  bpm: number;
  releaseDate: string;
  description: string;
  tags: string[];
  royaltyRate: number;
  collaborators: Array<{
    name: string;
    address: string;
    percentage: number;
  }>;
}

interface UploadProgress {
  file: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  txHash?: string;
}

interface EarningEstimate {
  monthlyDYO: number;
  firstMonthStreams: number;
  earningRate: number;
  factors: {
    genre: number;
    mood: number;
    historical: number;
    platform: number;
  };
}

interface PerformancePrediction {
  firstMonthStreams: number;
  targetAudience: string;
  growthPotential: number;
  factors: string[];
}

interface BlockchainProgress {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  txHash?: string;
  message?: string;
}

const UploadMusic: React.FC = () => {
  const { user } = useAuth();
  const { account } = useBlockchain();
  const [currentStep, setCurrentStep] = useState(1);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<SongMetadata>({
    title: '',
    artist: user?.displayName || '',
    album: '',
    genre: '',
    mood: '',
    bpm: 120,
    releaseDate: new Date().toISOString().split('T')[0],
    description: '',
    tags: [],
    royaltyRate: 85,
    collaborators: []
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newCollaborator, setNewCollaborator] = useState({ name: '', address: '', percentage: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [earningEstimate, setEarningEstimate] = useState<EarningEstimate | null>(null);
  const [performancePrediction, setPerformancePrediction] = useState<PerformancePrediction | null>(null);
  const [blockchainProgress, setBlockchainProgress] = useState<BlockchainProgress[]>([]);
  const [dyoTokenPrice, setDyoTokenPrice] = useState(1.0);
  const [showBenefits, setShowBenefits] = useState(true);
  const [uploadBonus, setUploadBonus] = useState(0);
  const [isFirstUpload, setIsFirstUpload] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const genres = [
    'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical', 'Country', 'R&B',
    'Reggae', 'Blues', 'Folk', 'Alternative', 'Indie', 'Ambient', 'Techno', 'House'
  ];

  const moods = [
    'Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Aggressive', 'Melancholic',
    'Uplifting', 'Dark', 'Peaceful', 'Nostalgic', 'Futuristic', 'Mysterious', 'Playful'
  ];

  // Genre and mood multipliers for earning potential
  const genreMultipliers: Record<string, number> = {
    'Electronic': 1.2,
    'Hip Hop': 1.3,
    'Rock': 1.1,
    'Pop': 1.4,
    'Jazz': 0.9,
    'Classical': 0.8,
    'Country': 1.0,
    'R&B': 1.2,
    'Reggae': 1.1,
    'Blues': 0.9,
    'Folk': 0.95,
    'Alternative': 1.15,
    'Indie': 1.05,
    'Ambient': 0.85,
    'Techno': 1.25,
    'House': 1.2
  };

  const moodMultipliers: Record<string, number> = {
    'Happy': 1.2,
    'Energetic': 1.3,
    'Uplifting': 1.25,
    'Calm': 1.0,
    'Romantic': 1.15,
    'Sad': 0.9,
    'Melancholic': 0.85,
    'Aggressive': 1.1,
    'Dark': 0.95,
    'Peaceful': 0.9,
    'Nostalgic': 1.05,
    'Futuristic': 1.15,
    'Mysterious': 1.0,
    'Playful': 1.1
  };

  useEffect(() => {
    fetchDYOTokenPrice();
    checkFirstUpload();
    calculateEarningEstimate();
    calculatePerformancePrediction();
  }, [metadata.genre, metadata.mood, metadata.title, metadata.artist]);

  const fetchDYOTokenPrice = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/token-price/dyo`);
      if (response.ok) {
        const data = await response.json();
        setDyoTokenPrice(data.price || 1.0);
      }
    } catch (error) {
      console.error('Error fetching DYO token price:', error);
    }
  };

  const checkFirstUpload = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const walletAddress = account || user?.uid;
      if (!walletAddress) return;
      
      const response = await fetch(`${apiBaseUrl}/api/artist/upload-count/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsFirstUpload(data.count === 0);
        if (data.count === 0) {
          setUploadBonus(10); // First upload bonus
        } else if (data.count % 10 === 0) {
          setUploadBonus(5); // Consistent upload reward
        }
      }
    } catch (error) {
      console.error('Error checking upload count:', error);
    }
  };

  const calculateEarningEstimate = () => {
    if (!metadata.genre || !metadata.mood) {
      setEarningEstimate(null);
      return;
    }

    const genreMultiplier = genreMultipliers[metadata.genre] || 1.0;
    const moodMultiplier = moodMultipliers[metadata.mood] || 1.0;
    const historicalMultiplier = 1.0; // Would be fetched from similar content
    const platformRate = 0.05; // Base DYO per stream

    const earningRate = platformRate * genreMultiplier * moodMultiplier * historicalMultiplier;
    const estimatedFirstMonthStreams = 1000 * genreMultiplier; // Base 1000 streams
    const monthlyDYO = estimatedFirstMonthStreams * earningRate * metadata.royaltyRate / 100;

    setEarningEstimate({
      monthlyDYO,
      firstMonthStreams: estimatedFirstMonthStreams,
      earningRate,
      factors: {
        genre: genreMultiplier,
        mood: moodMultiplier,
        historical: historicalMultiplier,
        platform: platformRate
      }
    });
  };

  const calculatePerformancePrediction = () => {
    if (!metadata.genre || !metadata.mood || !metadata.title) {
      setPerformancePrediction(null);
      return;
    }

    const genreMultiplier = genreMultipliers[metadata.genre] || 1.0;
    const estimatedStreams = Math.floor(1000 * genreMultiplier);
    
    let targetAudience = 'General Audience';
    if (metadata.genre === 'Electronic' || metadata.genre === 'Techno' || metadata.genre === 'House') {
      targetAudience = 'Electronic Music Fans (18-35)';
    } else if (metadata.genre === 'Hip Hop' || metadata.genre === 'R&B') {
      targetAudience = 'Hip Hop & R&B Listeners (16-30)';
    } else if (metadata.genre === 'Rock' || metadata.genre === 'Alternative') {
      targetAudience = 'Rock Music Enthusiasts (20-40)';
    } else if (metadata.genre === 'Pop') {
      targetAudience = 'Pop Music Fans (All Ages)';
    }

    const growthPotential = genreMultiplier > 1.2 ? 85 : genreMultiplier > 1.0 ? 70 : 60;
    
    const factors: string[] = [];
    if (genreMultiplier > 1.2) factors.push('High-demand genre');
    if (moodMultipliers[metadata.mood] > 1.2) factors.push('Popular mood');
    if (metadata.tags.length > 3) factors.push('Well-tagged content');
    if (metadata.description.length > 50) factors.push('Detailed description');

    setPerformancePrediction({
      firstMonthStreams: estimatedStreams,
      targetAudience,
      growthPotential,
      factors
    });
  };

  const calculateRoyaltyInDYO = (percentage: number, monthlyEarnings: number) => {
    return (monthlyEarnings * percentage) / 100;
  };

  const handleFileSelect = (file: File, type: 'audio' | 'image') => {
    if (type === 'audio') {
      setAudioFile(file);
      setMetadata(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    } else {
      setCoverImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, type: 'audio' | 'image') => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (type === 'audio' && file.type.startsWith('audio/')) {
      handleFileSelect(file, 'audio');
    } else if (type === 'image' && file.type.startsWith('image/')) {
      handleFileSelect(file, 'image');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCollaborator = () => {
    if (newCollaborator.name && newCollaborator.address && newCollaborator.percentage > 0) {
      const totalPercentage = metadata.collaborators.reduce((sum, c) => sum + c.percentage, 0) + newCollaborator.percentage;
      if (totalPercentage + metadata.royaltyRate <= 100) {
        setMetadata(prev => ({
          ...prev,
          collaborators: [...prev.collaborators, { ...newCollaborator }]
        }));
        setNewCollaborator({ name: '', address: '', percentage: 0 });
      }
    }
  };

  const removeCollaborator = (index: number) => {
    setMetadata(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter((_, i) => i !== index)
    }));
  };

  const simulateBlockchainRegistration = async () => {
    setBlockchainProgress([
      { step: 'Creating NFT Metadata', status: 'processing', message: 'Preparing content for blockchain...' },
      { step: 'Registering as NFT', status: 'pending', message: 'Waiting...' },
      { step: 'Setting up Smart Contract', status: 'pending', message: 'Waiting...' },
      { step: 'Configuring Royalty Splits', status: 'pending', message: 'Waiting...' }
    ]);

    // Step 1: Create NFT Metadata
    await new Promise(resolve => setTimeout(resolve, 2000));
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Creating NFT Metadata' 
        ? { ...p, status: 'completed', message: 'Metadata created successfully' }
        : p
    ));

    // Step 2: Register as NFT
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Registering as NFT' 
        ? { ...p, status: 'processing', message: 'Registering on DYO Blockchain...' }
        : p
    ));
    await new Promise(resolve => setTimeout(resolve, 3000));
    const txHash1 = '0x' + Math.random().toString(16).substr(2, 64);
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Registering as NFT' 
        ? { ...p, status: 'completed', txHash: txHash1, message: 'NFT registered successfully' }
        : p
    ));

    // Step 3: Smart Contract
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Setting up Smart Contract' 
        ? { ...p, status: 'processing', message: 'Deploying smart contract...' }
        : p
    ));
    await new Promise(resolve => setTimeout(resolve, 2500));
    const txHash2 = '0x' + Math.random().toString(16).substr(2, 64);
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Setting up Smart Contract' 
        ? { ...p, status: 'completed', txHash: txHash2, message: 'Smart contract deployed' }
        : p
    ));

    // Step 4: Royalty Configuration
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Configuring Royalty Splits' 
        ? { ...p, status: 'processing', message: 'Configuring royalty distribution...' }
        : p
    ));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setBlockchainProgress(prev => prev.map(p => 
      p.step === 'Configuring Royalty Splits' 
        ? { ...p, status: 'completed', message: 'Royalty splits configured' }
        : p
    ));
  };

  const simulateUpload = async () => {
    setIsUploading(true);
    const files = [
      { name: 'Audio File', file: audioFile },
      { name: 'Cover Image', file: coverImage },
      { name: 'Metadata', file: null }
    ].filter(item => item.file);

    for (const item of files) {
      setUploadProgress(prev => [...prev, {
        file: item.name,
        progress: 0,
        status: 'uploading',
        message: 'Uploading to IPFS...'
      }]);

      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(prev => prev.map(p => 
          p.file === item.name ? { ...p, progress: i } : p
        ));
      }

      setUploadProgress(prev => prev.map(p => 
        p.file === item.name ? { ...p, status: 'processing', message: 'Processing...' } : p
      ));

      await new Promise(resolve => setTimeout(resolve, 1000));

      setUploadProgress(prev => prev.map(p => 
        p.file === item.name ? { ...p, status: 'completed', message: 'Upload complete' } : p
      ));
    }

    // Blockchain registration
    await simulateBlockchainRegistration();

    setIsUploading(false);
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDYO = (amount: number) => {
    return `${amount.toFixed(2)} $DYO`;
  };

  const steps = [
    { number: 1, title: 'Upload Files', description: 'Select audio and cover image' },
    { number: 2, title: 'Metadata', description: 'Add song information' },
    { number: 3, title: 'Royalties', description: 'Configure earnings and splits' },
    { number: 4, title: 'Review', description: 'Review and publish' }
  ];

  const totalCollaboratorPercentage = metadata.collaborators.reduce((sum, c) => sum + c.percentage, 0);
  const remainingPercentage = 100 - metadata.royaltyRate - totalCollaboratorPercentage;
  const monthlyEarnings = earningEstimate?.monthlyDYO || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Music</h1>
        <p className="text-gray-400 mt-1">Release your music to the world and earn $DYO tokens</p>
      </div>

      {/* Stream-to-Earn Benefits Display */}
      {showBenefits && (
        <motion.div
          className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Why Upload to DUJYO?
            </h2>
            <button
              onClick={() => setShowBenefits(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">85% Royalty Rate</h3>
              </div>
              <p className="text-sm text-gray-400">Industry best - vs 10-15% on traditional platforms</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Earn DYO Tokens</h3>
              </div>
              <p className="text-sm text-gray-400">Earn $DYO tokens from every stream, view, and play</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Blockchain-Powered</h3>
              </div>
              <p className="text-sm text-gray-400">Transparent royalty tracking on DYO Blockchain</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">NFT Earnings</h3>
              </div>
              <p className="text-sm text-gray-400">Secondary market NFT earnings and royalties</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Incentives */}
      {uploadBonus > 0 && (
        <motion.div
          className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-400/30 rounded-xl p-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-green-400" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">
                {isFirstUpload ? 'First Upload Bonus!' : 'Consistent Upload Reward!'}
              </h3>
              <p className="text-gray-300">
                You'll receive {formatDYO(uploadBonus)} bonus tokens after publishing this track
              </p>
            </div>
            <div className="text-2xl font-bold text-green-400">
              +{formatDYO(uploadBonus)}
            </div>
          </div>
        </motion.div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep >= step.number 
                ? 'bg-amber-600 border-amber-600 text-white' 
                : 'border-gray-600 text-gray-400'
            }`}>
              {currentStep > step.number ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="font-semibold">{step.number}</span>
              )}
            </div>
            <div className="ml-3">
              <p className={`font-medium ${currentStep >= step.number ? 'text-white' : 'text-gray-400'}`}>
                {step.title}
              </p>
              <p className="text-sm text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${currentStep > step.number ? 'bg-amber-600' : 'bg-gray-600'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: File Upload */}
      {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Audio Upload */}
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Audio File</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                audioFile ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'audio')}
            >
              {audioFile ? (
                <div className="space-y-4">
                  <Music className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-white font-medium">{audioFile.name}</p>
                    <p className="text-gray-400 text-sm">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={togglePlayPause}
                      className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-full transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setAudioFile(null)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioFile ? URL.createObjectURL(audioFile) : undefined}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Drag & drop your audio file here</p>
                  <p className="text-gray-500 text-sm mb-4">or</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px]"
                  >
                    Choose File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'audio')}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Cover Image</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                coverImage ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'image')}
            >
              {coverImage ? (
                <div className="space-y-4">
                  <img
                    src={URL.createObjectURL(coverImage)}
                    alt="Cover preview"
                    className="w-32 h-32 object-cover rounded-lg mx-auto"
                  />
                  <div>
                    <p className="text-white font-medium">{coverImage.name}</p>
                    <p className="text-gray-400 text-sm">
                      {(coverImage.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setCoverImage(null)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px]"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Drag & drop your cover image here</p>
                  <p className="text-gray-500 text-sm mb-4">or</p>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px]"
                  >
                    Choose Image
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'image')}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Metadata */}
      {currentStep === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Earning Potential Calculator */}
          {earningEstimate && (
            <motion.div
              className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Earning Potential Calculator</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Estimated Monthly Earnings</p>
                  <p className="text-2xl font-bold text-amber-400">{formatDYO(earningEstimate.monthlyDYO)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">First Month Streams</p>
                  <p className="text-2xl font-bold text-white">{earningEstimate.firstMonthStreams.toFixed(0)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Earning Rate</p>
                  <p className="text-2xl font-bold text-amber-400">{formatDYO(earningEstimate.earningRate)}/stream</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-gray-800/50 rounded-lg text-xs">
                  <span className="text-gray-400">Genre Multiplier: </span>
                  <span className="text-amber-400 font-semibold">{(earningEstimate.factors.genre * 100).toFixed(0)}%</span>
                </div>
                <div className="px-3 py-1 bg-gray-800/50 rounded-lg text-xs">
                  <span className="text-gray-400">Mood Multiplier: </span>
                  <span className="text-amber-400 font-semibold">{(earningEstimate.factors.mood * 100).toFixed(0)}%</span>
                </div>
                <div className="px-3 py-1 bg-gray-800/50 rounded-lg text-xs">
                  <span className="text-gray-400">Platform Rate: </span>
                  <span className="text-amber-400 font-semibold">{formatDYO(earningEstimate.factors.platform)}/stream</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Content Performance Predictions */}
          {performancePrediction && (
            <motion.div
              className="bg-gray-800 p-6 rounded-xl border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">AI-Powered Performance Predictions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">First Month Streams</p>
                  <p className="text-2xl font-bold text-white">{performancePrediction.firstMonthStreams}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Target Audience</p>
                  <p className="text-lg font-semibold text-amber-400">{performancePrediction.targetAudience}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Growth Potential</p>
                  <p className="text-2xl font-bold text-green-400">{performancePrediction.growthPotential}%</p>
                </div>
              </div>
              {performancePrediction.factors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Positive Factors:</p>
                  <div className="flex flex-wrap gap-2">
                    {performancePrediction.factors.map((factor, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="bg-gray-800 p-6 rounded-xl space-y-6">
            <h3 className="text-xl font-bold text-white">Song Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  placeholder="Enter song title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Artist *</label>
                <input
                  type="text"
                  value={metadata.artist}
                  onChange={(e) => setMetadata(prev => ({ ...prev, artist: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  placeholder="Enter artist name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Album</label>
                <input
                  type="text"
                  value={metadata.album}
                  onChange={(e) => setMetadata(prev => ({ ...prev, album: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  placeholder="Enter album name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                <select
                  value={metadata.genre}
                  onChange={(e) => setMetadata(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                >
                  <option value="">Select genre</option>
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mood</label>
                <select
                  value={metadata.mood}
                  onChange={(e) => setMetadata(prev => ({ ...prev, mood: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                >
                  <option value="">Select mood</option>
                  {moods.map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">BPM</label>
                <input
                  type="number"
                  value={metadata.bpm}
                  onChange={(e) => setMetadata(prev => ({ ...prev, bpm: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  placeholder="120"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Release Date</label>
                <input
                  type="date"
                  value={metadata.releaseDate}
                  onChange={(e) => setMetadata(prev => ({ ...prev, releaseDate: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
                placeholder="Describe your song..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  placeholder="Add a tag"
                />
                <button
                  onClick={addTag}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 3: Royalties */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Royalty Configuration</h3>
            
            {/* DYO Token Integration */}
            {earningEstimate && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h4 className="font-semibold text-white">Your Estimated Monthly Earnings</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Your Share ({metadata.royaltyRate}%)</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {formatDYO(calculateRoyaltyInDYO(metadata.royaltyRate, monthlyEarnings))}
                    </p>
                  </div>
                  {metadata.collaborators.map((collab, idx) => (
                    <div key={idx}>
                      <p className="text-sm text-gray-400 mb-1">{collab.name} ({collab.percentage}%)</p>
                      <p className="text-xl font-semibold text-white">
                        {formatDYO(calculateRoyaltyInDYO(collab.percentage, monthlyEarnings))}
                      </p>
                    </div>
                  ))}
                  {remainingPercentage > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Remaining ({remainingPercentage}%)</p>
                      <p className="text-xl font-semibold text-gray-500">
                        {formatDYO(calculateRoyaltyInDYO(remainingPercentage, monthlyEarnings))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Royalty Rate: {metadata.royaltyRate}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={metadata.royaltyRate}
                onChange={(e) => setMetadata(prev => ({ ...prev, royaltyRate: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-4">Collaborators</h4>
              <div className="space-y-3">
                {metadata.collaborators.map((collaborator, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{collaborator.name}</p>
                      <p className="text-gray-400 text-sm font-mono">{collaborator.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-400 font-semibold">{collaborator.percentage}%</span>
                      {earningEstimate && (
                        <p className="text-xs text-gray-400">
                          {formatDYO(calculateRoyaltyInDYO(collaborator.percentage, monthlyEarnings))}/mo
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeCollaborator(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    value={newCollaborator.name}
                    onChange={(e) => setNewCollaborator(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500 focus:border-amber-500 focus:outline-none min-h-[44px]"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={newCollaborator.address}
                    onChange={(e) => setNewCollaborator(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500 focus:border-amber-500 focus:outline-none min-h-[44px]"
                    placeholder="Wallet Address"
                  />
                  <input
                    type="number"
                    value={newCollaborator.percentage}
                    onChange={(e) => setNewCollaborator(prev => ({ ...prev, percentage: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500 focus:border-amber-500 focus:outline-none min-h-[44px]"
                    placeholder="Percentage"
                  />
                </div>
                <button
                  onClick={addCollaborator}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Collaborator</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Review & Publish</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Song Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-400">Title:</span> <span className="text-white">{metadata.title}</span></p>
                  <p><span className="text-gray-400">Artist:</span> <span className="text-white">{metadata.artist}</span></p>
                  <p><span className="text-gray-400">Album:</span> <span className="text-white">{metadata.album || 'Single'}</span></p>
                  <p><span className="text-gray-400">Genre:</span> <span className="text-white">{metadata.genre}</span></p>
                  <p><span className="text-gray-400">Mood:</span> <span className="text-white">{metadata.mood}</span></p>
                  <p><span className="text-gray-400">BPM:</span> <span className="text-white">{metadata.bpm}</span></p>
                  <p><span className="text-gray-400">Release Date:</span> <span className="text-white">{metadata.releaseDate}</span></p>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Royalty Split (DYO Tokens)</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-400">Your Share:</span> 
                    <span className="text-amber-400 font-semibold ml-2">
                      {metadata.royaltyRate}% 
                      {earningEstimate && (
                        <span className="text-white ml-1">
                          ({formatDYO(calculateRoyaltyInDYO(metadata.royaltyRate, monthlyEarnings))}/mo)
                        </span>
                      )}
                    </span>
                  </p>
                  {metadata.collaborators.map((collaborator, index) => (
                    <p key={index}>
                      <span className="text-gray-400">{collaborator.name}:</span> 
                      <span className="text-white font-semibold ml-2">
                        {collaborator.percentage}%
                        {earningEstimate && (
                          <span className="text-gray-400 ml-1">
                            ({formatDYO(calculateRoyaltyInDYO(collaborator.percentage, monthlyEarnings))}/mo)
                          </span>
                        )}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
            
            {metadata.description && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-2">Description</h4>
                <p className="text-gray-300">{metadata.description}</p>
              </div>
            )}
            
            {metadata.tags.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map((tag, index) => (
                    <span key={index} className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-gray-800 p-6 rounded-xl space-y-6">
              <h4 className="text-lg font-semibold text-white mb-4">Upload Progress</h4>
              
              {/* File Upload Progress */}
              <div className="space-y-4">
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{progress.file}</span>
                      <span className="text-sm text-gray-400">{progress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress.status === 'completed' ? 'bg-green-500' :
                          progress.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    {progress.message && (
                      <p className="text-sm text-gray-400">{progress.message}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Blockchain Registration Progress */}
              {blockchainProgress.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h5 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Blockchain Registration
                  </h5>
                  <div className="space-y-4">
                    {blockchainProgress.map((progress, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{progress.step}</span>
                          <div className="flex items-center gap-2">
                            {progress.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                            {progress.status === 'processing' && (
                              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            {progress.status === 'pending' && (
                              <Clock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {progress.message && (
                          <p className="text-sm text-gray-400">{progress.message}</p>
                        )}
                        {progress.txHash && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">TX Hash:</span>
                            <code className="text-amber-400 font-mono">{progress.txHash.substring(0, 20)}...</code>
                            <button
                              onClick={() => window.open(`https://explorer.dujyo.com/tx/${progress.txHash}`, '_blank')}
                              className="text-amber-400 hover:text-amber-300"
                            >
                              View
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white px-6 py-2 rounded-lg transition-colors min-h-[44px]"
        >
          Previous
        </button>
        
        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={currentStep === 1 && (!audioFile || !metadata.title)}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-800 disabled:text-gray-500 text-white px-6 py-2 rounded-lg transition-colors min-h-[44px]"
          >
            Next
          </button>
        ) : (
          <button
            onClick={simulateUpload}
            disabled={isUploading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-500 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isUploading ? 'Publishing...' : 'Publish Song'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadMusic;
