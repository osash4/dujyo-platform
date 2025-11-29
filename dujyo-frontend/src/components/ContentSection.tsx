import React from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Music, Video, Gamepad } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ContentSectionProps {
  title: string;
  items: string[]; // Lista de ítems (por ejemplo, canciones o contenidos)
  onItemClick: (trackTitle: string) => void; // Función para manejar el click en un ítem
}

export const ContentSection: React.FC<ContentSectionProps> = ({ title, items, onItemClick }) => {
  const { t } = useLanguage();
  const getIcon = (title: string) => {
    if (title.includes('Library') || title.includes('Recently')) return Music;
    if (title.includes('Liked')) return Heart;
    if (title.includes('Recommendation')) return Video;
    return Gamepad;
  };

  const getColor = (title: string) => {
    if (title.includes('Library') || title.includes('Recently')) return '#F59E0B';
    if (title.includes('Liked')) return '#FF6B6B';
    if (title.includes('Recommendation')) return '#00F5FF';
    return '#EA580C';
  };

  const Icon = getIcon(title);
  const color = getColor(title);

  return (
    <motion.section 
      className="card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {items.slice(0, 6).map((item, index) => (
          <motion.div 
            key={index} 
            className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300 cursor-pointer group"
            onClick={() => onItemClick(item)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: `${color}20` }}
              >
                <Play size={14} style={{ color }} />
              </div>
              <p className="text-white font-medium truncate">{item}</p>
            </div>
            <div className="text-gray-400 text-sm">
              {Math.floor(Math.random() * 3) + 1}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
            </div>
          </motion.div>
        ))}
      </div>
      
      {items.length > 6 && (
        <motion.button 
          className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors duration-300 text-sm"
          whileHover={{ scale: 1.02 }}
        >
          {t('common.viewMore', { count: items.length - 6 }).replace('{{count}}', (items.length - 6).toString())}
        </motion.button>
      )}
    </motion.section>
  );
};
