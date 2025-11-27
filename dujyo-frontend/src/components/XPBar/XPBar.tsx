import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface XPBarProps {
  level: number;
  currentXP: number;
  maxXP: number;
  section: string;
}

const XPBar: React.FC<XPBarProps> = ({ level, currentXP, maxXP, section }) => {
  const progress = (currentXP / maxXP) * 100;

  return (
    <motion.div
      className="bg-gray-800/50 backdrop-blur-sm rounded-full p-2 flex items-center gap-4 border border-gray-700/50 shadow-lg max-w-2xl mx-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full flex-shrink-0 shadow-md">
        <Star size={24} className="text-white" fill="currentColor" />
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-300">{section} Level {level}</span>
          <span className="text-xs text-gray-400">{currentXP}/{maxXP} XP</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <motion.div
            className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          ></motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default XPBar;