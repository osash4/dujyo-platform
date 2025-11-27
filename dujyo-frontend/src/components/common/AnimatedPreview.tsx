import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AnimatedPreviewProps {
  type: 'music' | 'video' | 'gaming';
  src: string;
  title: string;
  isVisible: boolean;
  onClose: () => void;
}

const AnimatedPreview: React.FC<AnimatedPreviewProps> = ({
  type,
  src,
  title,
  isVisible,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const getSectionStyles = () => {
    switch (type) {
      case 'music':
        return {
          glowClass: 'neon-glow-music',
          textClass: 'neon-text-music',
          gradientClass: 'bg-gradient-music',
          accentColor: '#F59E0B'
        };
      case 'video':
        return {
          glowClass: 'neon-glow-video',
          textClass: 'neon-text-video',
          gradientClass: 'bg-gradient-video',
          accentColor: '#00F5FF'
        };
      case 'gaming':
        return {
          glowClass: 'neon-glow-gaming',
          textClass: 'neon-text-gaming',
          gradientClass: 'bg-gradient-gaming',
          accentColor: '#EA580C'
        };
      default:
        return {
          glowClass: 'neon-glow-music',
          textClass: 'neon-text-music',
          gradientClass: 'bg-gradient-music',
          accentColor: '#F59E0B'
        };
    }
  };

  const styles = getSectionStyles();

  // Handle play/pause
  const togglePlay = () => {
    if (type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    } else if (type === 'music' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (type === 'video' && videoRef.current) {
      videoRef.current.muted = !isMuted;
    } else if (type === 'music' && audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Update progress
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        if (type === 'video' && videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          const duration = videoRef.current.duration;
          setProgress((currentTime / duration) * 100);
        } else if (type === 'music' && audioRef.current) {
          const currentTime = audioRef.current.currentTime;
          const duration = audioRef.current.duration;
          setProgress((currentTime / duration) * 100);
        }
      }, 100);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, type]);

  // Auto-play when visible
  useEffect(() => {
    if (isVisible && type !== 'gaming') {
      const timer = setTimeout(() => {
        togglePlay();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, type]);

  // Render music preview with waveform animation
  const renderMusicPreview = () => (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background with pulse effect */}
      <motion.div
        className={`absolute inset-0 ${styles.gradientClass} opacity-20 rounded-lg`}
        animate={{
          scale: isPlaying ? [1, 1.1, 1] : 1,
          opacity: isPlaying ? [0.2, 0.4, 0.2] : 0.2,
        }}
        transition={{
          duration: 1,
          repeat: isPlaying ? Infinity : 0,
          ease: "easeInOut"
        }}
      />
      
      {/* Waveform animation */}
      <div className="flex items-center space-x-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-1 ${styles.gradientClass} rounded-full`}
            animate={{
              height: isPlaying ? [20, Math.random() * 60 + 20, 20] : 20,
            }}
            transition={{
              duration: 0.5,
              repeat: isPlaying ? Infinity : 0,
              delay: i * 0.05,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={src}
        muted={isMuted}
        loop
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );

  // Render video preview
  const renderVideoPreview = () => (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={src}
        muted={isMuted}
        loop
        className="w-full h-full object-cover rounded-lg"
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Video overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg" />
    </div>
  );

  // Render gaming preview with gameplay loop
  const renderGamingPreview = () => (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background with gaming pattern */}
      <motion.div
        className={`absolute inset-0 ${styles.gradientClass} opacity-30 rounded-lg`}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%),
            linear-gradient(-45deg, transparent 25%, rgba(255,255,255,0.1) 25%),
            linear-gradient(45deg, rgba(255,255,255,0.1) 75%, transparent 75%),
            linear-gradient(-45deg, rgba(255,255,255,0.1) 75%, transparent 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      />
      
      {/* Gaming elements animation */}
      <div className="relative">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 ${styles.gradientClass} rounded-full`}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut"
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            exit={{ y: 50 }}
            transition={{ duration: 0.3 }}
            className={`relative w-96 h-64 ${styles.glowClass} bg-gray-900 rounded-lg overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 backdrop-blur-sm p-3">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${styles.textClass} truncate`}>
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="w-full h-full pt-12">
              {type === 'music' && renderMusicPreview()}
              {type === 'video' && renderVideoPreview()}
              {type === 'gaming' && renderGamingPreview()}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-50 backdrop-blur-sm p-3">
              <div className="flex items-center justify-between">
                {/* Play/Pause button */}
                <button
                  onClick={togglePlay}
                  className={`p-2 rounded-full ${styles.gradientClass} text-white hover:scale-110 transition-transform`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                {/* Progress bar */}
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <motion.div
                      className={`h-full ${styles.gradientClass} rounded-full`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Mute button */}
                {type !== 'gaming' && (
                  <button
                    onClick={toggleMute}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnimatedPreview;
