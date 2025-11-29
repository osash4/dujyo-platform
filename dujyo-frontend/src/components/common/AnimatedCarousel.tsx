import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Video, Gamepad, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  image: string;
  type: 'music' | 'video' | 'gaming' | 'marketplace';
  url?: string;
  duration?: string;
  rating?: number;
}

interface AnimatedCarouselProps {
  items: CarouselItem[];
  section: 'music' | 'video' | 'gaming' | 'marketplace';
  onPlay?: (item: CarouselItem) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const AnimatedCarousel: React.FC<AnimatedCarouselProps> = ({
  items,
  section,
  onPlay,
  autoPlay = true,
  autoPlayInterval = 5000
}) => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isHovered || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, items.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const getSectionStyles = () => {
    switch (section) {
      case 'music':
        return {
          glowClass: 'neon-glow-music',
          textClass: 'neon-text-music',
          borderClass: 'neon-border-music',
          hoverClass: 'hover-glow-music',
          gradientClass: 'bg-gradient-music',
          accentColor: '#F59E0B'
        };
      case 'video':
        return {
          glowClass: 'neon-glow-video',
          textClass: 'neon-text-video',
          borderClass: 'neon-border-video',
          hoverClass: 'hover-glow-video',
          gradientClass: 'bg-gradient-video',
          accentColor: '#00F5FF'
        };
      case 'gaming':
        return {
          glowClass: 'neon-glow-gaming',
          textClass: 'neon-text-gaming',
          borderClass: 'neon-border-gaming',
          hoverClass: 'hover-glow-gaming',
          gradientClass: 'bg-gradient-gaming',
          accentColor: '#EA580C'
        };
      case 'marketplace':
        return {
          glowClass: 'neon-glow-marketplace',
          textClass: 'neon-text-marketplace',
          borderClass: 'neon-border-marketplace',
          hoverClass: 'hover-glow-marketplace',
          gradientClass: 'bg-gradient-marketplace',
          accentColor: '#8B5CF6'
        };
      default:
        return {
          glowClass: 'neon-glow-marketplace',
          textClass: 'neon-text-marketplace',
          borderClass: 'neon-border-marketplace',
          hoverClass: 'hover-glow-marketplace',
          gradientClass: 'bg-gradient-marketplace',
          accentColor: '#8B5CF6'
        };
    }
  };

  const getPlayIcon = (type: string) => {
    switch (type) {
      case 'music':
        return <Play className="w-6 h-6" />;
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'gaming':
        return <Gamepad className="w-6 h-6" />;
      case 'marketplace':
        return <TrendingUp className="w-6 h-6" />;
      default:
        return <Play className="w-6 h-6" />;
    }
  };

  const getPlayText = (type: string) => {
    switch (type) {
      case 'music':
        return t('common.playNow');
      case 'video':
        return t('video.watchNow');
      case 'gaming':
        return t('gaming.playNow');
      case 'marketplace':
        return t('common.explore');
      default:
        return t('common.playNow');
    }
  };

  const styles = getSectionStyles();

  if (!items || items.length === 0) {
    return (
      <div className="w-full h-80 bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No content available</p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-80 rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main carousel container */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <div className="relative w-full h-full">
              {/* Background image with parallax effect */}
              <motion.div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${items[currentIndex].image})` }}
                animate={{
                  scale: isHovered ? 1.05 : 1,
                }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Gradient overlay */}
              <div className={`absolute inset-0 ${styles.gradientClass} opacity-60`} />
              
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black bg-opacity-40" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="space-y-4"
                >
                  {/* Title */}
                  <h3 className={`text-3xl font-bold ${styles.textClass}`}>
                    {items[currentIndex].title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-white text-lg max-w-md">
                    {items[currentIndex].description}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-sm text-gray-300">
                    {items[currentIndex].duration && (
                      <span>{items[currentIndex].duration}</span>
                    )}
                    {items[currentIndex].rating && (
                      <span>⭐ {items[currentIndex].rating}</span>
                    )}
                  </div>
                  
                  {/* Play button */}
                  <motion.button
                    onClick={() => onPlay?.(items[currentIndex])}
                    className={`${styles.borderClass} ${styles.hoverClass} px-6 py-3 rounded-lg bg-black bg-opacity-50 backdrop-blur-sm flex items-center space-x-2 text-white font-semibold transition-all duration-300`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {getPlayIcon(items[currentIndex].type)}
                    <span>{getPlayText(items[currentIndex].type)}</span>
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <motion.button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          
          <motion.button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </>
      )}

      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {items.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white' 
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {autoPlay && items.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black bg-opacity-30">
          <motion.div
            className="h-full bg-white"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: autoPlayInterval / 1000, ease: "linear" }}
            key={currentIndex}
          />
        </div>
      )}
    </div>
  );
};

export default AnimatedCarousel;
