import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showText?: boolean;
  className?: string;
  variant?: 'icon' | 'text' | 'full'; // icon = solo logo, text = solo texto, full = logo + texto
  withBackground?: boolean; // true = usar logo con background, false = usar logo transparente (default)
}

const sizeMap = {
  sm: { width: 40, height: 40, fontSize: 'text-lg', iconSize: '40x40', logoSize: '120x30', completeSize: '160x40', completeScale: 1.0 },
  md: { width: 64, height: 64, fontSize: 'text-xl', iconSize: '64x64', logoSize: '160x40', completeSize: '240x60', completeScale: 1.0 },
  lg: { width: 120, height: 120, fontSize: 'text-2xl', iconSize: '120x120', logoSize: '240x60', completeSize: '320x80', completeScale: 1.0 },
  xl: { width: 180, height: 180, fontSize: 'text-4xl', iconSize: '120x120', logoSize: '240x60', completeSize: '480x120', completeScale: 1.0 },
  '2xl': { width: 240, height: 240, fontSize: 'text-5xl', iconSize: '120x120', logoSize: '240x60', completeSize: '480x120', completeScale: 1.0 },
  '3xl': { width: 320, height: 320, fontSize: 'text-6xl', iconSize: '512x512', logoSize: '512x128', completeSize: '800x200', completeScale: 1.0 },
  '4xl': { width: 400, height: 400, fontSize: 'text-7xl', iconSize: '512x512', logoSize: '512x128', completeSize: '960x240', completeScale: 1.0 },
  '5xl': { width: 500, height: 500, fontSize: 'text-8xl', iconSize: '512x512', logoSize: '512x128', completeSize: '1200x300', completeScale: 1.0 }
};

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true,
  className = '',
  variant = 'full',
  withBackground = false // Por defecto usar logo transparente (mejor para fondos oscuros)
}) => {
  const dimensions = sizeMap[size];

  // Determinar qué logo usar según el variant y withBackground
  const getLogoPath = () => {
    const suffix = withBackground ? '.svg' : '-transparent.svg';
    
    if (variant === 'icon') {
      // Para icon, usar el icon específico de DUJYO Icon/
      const iconFile = `${dimensions.iconSize}${suffix}`;
      // Codificar espacios en la URL
      return `/assets/brand/DUJYO Icon/${iconFile}`.replace(/ /g, '%20');
    }
    
    if (variant === 'text') {
      // Para text, usar el logo de texto de DUJYO Logo/
      const logoFile = `${dimensions.logoSize}${suffix}`;
      // Codificar espacios en la URL
      return `/assets/brand/DUJYO Logo/${logoFile}`.replace(/ /g, '%20');
    }
    
    // Para full, mapear a archivos disponibles (ahora tenemos más tamaños)
    const getAvailableCompleteSize = (requestedSize: string): string => {
      const requested = parseInt(requestedSize.split('x')[0]);
      if (requested <= 200) return '160x40';
      if (requested <= 360) return '240x60';
      if (requested <= 560) return '320x80';
      if (requested <= 720) return '480x120';
      if (requested <= 880) return '640x160';
      if (requested <= 1080) return '800x200';
      if (requested <= 1300) return '960x240';
      return '1200x300';
    };
    
    const availableSize = getAvailableCompleteSize(dimensions.completeSize);
    const completeFile = `${availableSize}${suffix}`;
    // Codificar espacios en la URL
    return `/assets/brand/DUJYO Logo-Complete/${completeFile}`.replace(/ /g, '%20');
  };

  const logoPath = getLogoPath();

  // Si variant es 'text', mostrar el logo de texto SVG
  if (variant === 'text') {
    // Para text, usar dimensiones apropiadas (ancho más ancho que alto)
    const textDimensions = {
      width: dimensions.logoSize.split('x')[0],
      height: dimensions.logoSize.split('x')[1]
    };
    
    return (
      <motion.div
        className={`flex items-center ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src={logoPath}
          alt="DUJYO Text Logo"
          width={textDimensions.width}
          height={textDimensions.height}
          className="object-contain"
          style={{ 
            filter: withBackground 
              ? 'none' 
              : 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.5)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.3))',
            width: `${textDimensions.width}px`,
            height: `${textDimensions.height}px`
          }}
        />
      </motion.div>
    );
  }

  // Si variant es 'icon', mostrar solo el logo SVG
  if (variant === 'icon') {
    const iconDimensions = {
      width: dimensions.iconSize.split('x')[0],
      height: dimensions.iconSize.split('x')[1]
    };
    
    return (
      <motion.div
        className={`flex items-center ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src={logoPath}
          alt="DUJYO Icon"
          width={iconDimensions.width}
          height={iconDimensions.height}
          className="object-contain"
          style={{ 
            filter: withBackground 
              ? 'none' 
              : 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.5)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.3))',
            width: `${iconDimensions.width}px`,
            height: `${iconDimensions.height}px`
          }}
        />
      </motion.div>
    );
  }

  // Variant 'full' - Logo completo (el SVG ya incluye el texto)
  // Extraer el tamaño del path para calcular dimensiones
  const extractSizeFromPath = (path: string): { width: number; height: number } => {
    const match = path.match(/(\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 240, height: 60 }; // Default
  };
  
  const completeDimensions = extractSizeFromPath(logoPath);
  
  return (
    <motion.div
      className={`flex items-center gap-3 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <img
        src={logoPath}
        alt="DUJYO Complete Logo"
        width={completeDimensions.width}
        height={completeDimensions.height}
        className="object-contain"
        style={{ 
          filter: withBackground 
            ? 'none' 
            : 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.5)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.3))',
          width: `${completeDimensions.width * dimensions.completeScale}px`,
          height: `${completeDimensions.height * dimensions.completeScale}px`,
          maxWidth: '100%',
          transform: 'none',
          fontStyle: 'normal',
          imageRendering: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      {/* Texto adicional solo se muestra si showText es true Y variant no es 'full' (porque full ya incluye el texto en el SVG) */}
      {showText && !withBackground && variant !== 'full' && (
        <div>
          <h1 className={`${dimensions.fontSize} font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent`}>
            DUJYO
          </h1>
          <p className="text-xs text-gray-400">Ecosystem</p>
        </div>
      )}
    </motion.div>
  );
};

export default Logo;



