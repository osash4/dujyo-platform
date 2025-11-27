import React from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy, Zap } from 'lucide-react';

interface XPBarProps {
  currentXP: number;
  maxXP: number;
  level: number;
  section?: 'music' | 'video' | 'gaming' | 'marketplace' | 'profile';
  showLevel?: boolean;
  compact?: boolean;
}

const XPBar: React.FC<XPBarProps> = ({
  currentXP,
  maxXP,
  level,
  section = 'profile',
  showLevel = true,
  compact = false
}) => {
  const progress = Math.min((currentXP / maxXP) * 100, 100);
  const nextLevelXP = maxXP - currentXP;

  const getSectionStyles = () => {
    switch (section) {
      case 'music':
        return {
          gradientClass: 'bg-gradient-music',
          glowClass: 'neon-glow-music',
          textClass: 'neon-text-music',
          accentColor: '#F59E0B'
        };
      case 'video':
        return {
          gradientClass: 'bg-gradient-video',
          glowClass: 'neon-glow-video',
          textClass: 'neon-text-video',
          accentColor: '#00F5FF'
        };
      case 'gaming':
        return {
          gradientClass: 'bg-gradient-gaming',
          glowClass: 'neon-glow-gaming',
          textClass: 'neon-text-gaming',
          accentColor: '#EA580C'
        };
      case 'marketplace':
        return {
          gradientClass: 'bg-gradient-marketplace',
          glowClass: 'neon-glow-marketplace',
          textClass: 'neon-text-marketplace',
          accentColor: '#8B5CF6'
        };
      case 'profile':
      default:
        return {
          gradientClass: 'bg-gradient-profile',
          glowClass: 'neon-glow-profile',
          textClass: 'neon-text-profile',
          accentColor: '#8B5CF6'
        };
    }
  };

  const getLevelIcon = () => {
    if (level >= 50) return <Trophy className="w-4 h-4" />;
    if (level >= 25) return <Star className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  const getLevelTitle = () => {
    if (level >= 50) return 'Legend';
    if (level >= 25) return 'Expert';
    if (level >= 10) return 'Advanced';
    if (level >= 5) return 'Intermediate';
    return 'Beginner';
  };

  const styles = getSectionStyles();

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {showLevel && (
          <div className="flex items-center space-x-1">
            {getLevelIcon()}
            <span className="text-sm font-semibold text-white">Lv.{level}</span>
          </div>
        )}
        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full ${styles.gradientClass} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${styles.glowClass} bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-lg p-4 border border-gray-700`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getLevelIcon()}
          <div>
            <h3 className="text-white font-semibold">
              Level {level} - {getLevelTitle()}
            </h3>
            <p className="text-gray-400 text-sm">
              {currentXP.toLocaleString()} / {maxXP.toLocaleString()} XP
            </p>
          </div>
        </div>
        
        {showLevel && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${styles.textClass}`}>
              {level}
            </div>
            <div className="text-xs text-gray-400">Level</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-full ${styles.gradientClass} rounded-full relative`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-white bg-opacity-30"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }}
            />
          </motion.div>
        </div>
        
        {/* Progress percentage */}
        <div className="absolute top-0 right-0 transform -translate-y-6">
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Next level info */}
      {nextLevelXP > 0 && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-400">
            <span className={styles.textClass}>{nextLevelXP.toLocaleString()} XP</span> to next level
          </p>
        </div>
      )}

      {/* Level up animation trigger */}
      {progress >= 100 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg"
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 360]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`text-4xl ${styles.textClass}`}
            >
              ⭐
            </motion.div>
            <p className={`text-xl font-bold ${styles.textClass}`}>
              Level Up!
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default XPBar;
