import React from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Star } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  players: number;
  price: number;
}

interface GamingCardProps {
  game: Game;
  onPlay: () => void;
  isSelected?: boolean;
}

const GamingCard: React.FC<GamingCardProps> = ({ game, onPlay, isSelected = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`bg-gray-800 bg-opacity-50 rounded-lg overflow-hidden border border-gray-600 hover:border-green-400 transition-all duration-300 cursor-pointer hover-glow-gaming ${
        isSelected ? 'ring-2 ring-green-400 bg-green-900 bg-opacity-20' : ''
      }`}
      onClick={onPlay}
    >
      {/* Game Thumbnail */}
      <div className="relative">
        <img 
          src={game.image} 
          alt={game.title} 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
          <motion.div 
            className="bg-black bg-opacity-50 rounded-full p-4"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Play className="w-8 h-8 text-white" />
          </motion.div>
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {game.category}
        </div>
        
        {/* Price Badge */}
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
          {game.price === 0 ? 'FREE' : `$${game.price}`}
        </div>
      </div>
      
      {/* Game Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
          {game.title}
        </h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {game.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{game.players.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{game.rating}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GamingCard;
