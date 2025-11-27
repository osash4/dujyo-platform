import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

interface TrendingItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  type: 'music' | 'video' | 'gaming';
  views?: string;
  likes?: string;
  trend?: 'up' | 'down' | 'new';
}

interface TrendingSectionProps {
  title?: string;
  items: TrendingItem[];
  onItemClick?: (item: TrendingItem) => void;
  className?: string;
}

const TrendingSection: React.FC<TrendingSectionProps> = ({
  title = "Trending Now",
  items,
  onItemClick,
  className = ''
}) => {
  const typeColors = {
    music: { bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
    video: { bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
    gaming: { bg: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/50', text: 'text-orange-400' }
  };

  return (
    <section className={`py-8 ${className}`}>
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg border border-amber-500/50">
          <Flame size={24} className="text-amber-400" />
        </div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          {title}
          <TrendingUp size={28} className="text-amber-400" />
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => {
          const colors = typeColors[item.type];
          return (
            <motion.div
              key={item.id}
              className={`bg-gradient-to-br ${colors.bg} backdrop-blur-sm rounded-xl p-4 border ${colors.border} cursor-pointer group relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => onItemClick?.(item)}
            >
              {/* Trend badge */}
              {item.trend && (
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
                  item.trend === 'new' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                  item.trend === 'up' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
                  'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}>
                  {item.trend === 'new' ? 'NEW' : item.trend === 'up' ? '↑' : '↓'}
                </div>
              )}

              {item.image && (
                <div className="relative mb-3 rounded-lg overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              <h3 className={`font-bold text-white mb-1 group-hover:${colors.text} transition-colors`}>
                {item.title}
              </h3>
              {item.subtitle && (
                <p className="text-sm text-gray-400 mb-2">{item.subtitle}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                {item.views && <span>👁 {item.views}</span>}
                {item.likes && <span>❤️ {item.likes}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default TrendingSection;

