import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, X, Maximize2, Minimize2, FastForward, Rewind, Shuffle, Repeat, Heart, Share2, Fullscreen, Settings, Gamepad2, Trophy, Users, Zap, Coins } from 'lucide-react';
import { Track } from '../../contexts/PlayerContext';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import StreamEarnNotification from './StreamEarnNotification';
import StreamEarnDisplay from './StreamEarnDisplay';

interface GlobalPlayerProps {
  track: Track;
  position: 'top' | 'bottom';
}

const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ track, position }) => {
  const { 
    isPlaying, 
    setPlaying, 
    stopTrack,
    currentPlaylist,
    nextTrack: contextNextTrack,
    previousTrack: contextPreviousTrack,
    isShuffled: contextIsShuffled,
    toggleShuffle: contextToggleShuffle,
    repeatMode: contextRepeatMode,
    setRepeatMode: contextSetRepeatMode
  } = usePlayerContext();
  
  // ✅ HOOK UNIFICADO - Un solo polling, sin blinking
  const { 
    available_dyo, 
    dys, 
    isUpdating: isBalanceUpdating
  } = useUnifiedBalance();
  
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // 🎯 NUEVO: Estados para visibilidad y hover
  const [isHovered, setIsHovered] = useState(false);
  const [isProximityHovered, setIsProximityHovered] = useState(false); // Hover en zona de proximidad
  const [shouldShow, setShouldShow] = useState(false);
  
  // Stream-to-Earn notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData] = useState<{
    type: 'artist' | 'listener';
    amount: number;
    currency: string;
  }>({ type: 'listener', amount: 0, currency: 'DYO' });
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 🎯 Control de visibilidad: mostrar solo cuando está reproduciendo o hay hover (incluyendo proximidad)
  useEffect(() => {
    // Si está reproduciendo, siempre mostrar inmediatamente
    if (isPlaying) {
      setShouldShow(true);
      return;
    }
    
    // Si hay hover en el player o en la zona de proximidad, mostrar
    if (isHovered || isProximityHovered) {
      setShouldShow(true);
      return;
    }
    
    // Si no está reproduciendo ni hay hover, ocultar después de un delay
    const timer = setTimeout(() => {
      if (!isPlaying && !isHovered && !isProximityHovered) {
        setShouldShow(false);
      }
    }, 3500); // 3.5 segundos de delay - tiempo suficiente para que el usuario decida interactuar
    
    return () => clearTimeout(timer);
  }, [isPlaying, isHovered, isProximityHovered]);

  // Track previous track URL to detect actual changes - persist in localStorage
  const [previousTrackUrl, setPreviousTrackUrl] = useState<string | null>(() => {
    return localStorage.getItem('dujyo_previous_track_url');
  });

  // ✅ MEJORAR SINCRONIZACIÓN CON EVENT LISTENERS REALES
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;

    const handleMediaPlay = () => {
      console.log("🎵 [DEBUG] Media ACTUALLY playing - setting isPlaying: true");
      setPlaying(true);
    };

    const handleMediaPause = () => {
      console.log("🎵 [DEBUG] Media ACTUALLY paused - setting isPlaying: false");
      setPlaying(false);
    };

    const handleMediaEnded = () => {
      console.log("🎵 [DEBUG] Media ACTUALLY ended - setting isPlaying: false");
      setPlaying(false);
    };

    // Audio event listeners
    if (audio) {
      audio.addEventListener('play', handleMediaPlay);
      audio.addEventListener('pause', handleMediaPause);
      audio.addEventListener('ended', handleMediaEnded);
    }

    // Video event listeners  
    if (video) {
      video.addEventListener('play', handleMediaPlay);
      video.addEventListener('pause', handleMediaPause);
      video.addEventListener('ended', handleMediaEnded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('play', handleMediaPlay);
        audio.removeEventListener('pause', handleMediaPause);
        audio.removeEventListener('ended', handleMediaEnded);
      }
      if (video) {
        video.removeEventListener('play', handleMediaPlay);
        video.removeEventListener('pause', handleMediaPause);
        video.removeEventListener('ended', handleMediaEnded);
      }
    };
  }, [setPlaying]);

  // Log when track changes - PERSIST playback state across page navigation
  useEffect(() => {
    console.log('GlobalPlayer: Track changed', { 
      track: track.url, 
      playerMode: track.playerMode, 
      title: track.title,
      isPlaying,
      previousTrackUrl
    });
    
    const isNewTrack = previousTrackUrl !== track.url;
    
    // ✅ Si es el MISMO track y estaba reproduciéndose, continuar reproduciendo
    if (!isNewTrack && isPlaying) {
      console.log('🎵 Same track, resuming playback...');
      if (track.playerMode === 'music' && audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error('Auto-resume failed:', err);
        });
      } else if (track.playerMode === 'video' && videoRef.current) {
        videoRef.current.play().catch(err => {
          console.error('Auto-resume failed:', err);
        });
      }
    } 
    // ✅ Track nuevo: pausar y esperar que el usuario haga clic en play
    else if (isNewTrack) {
      console.log('🎵 New track loaded - waiting for user to press play');
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
    }
    
    // Update previous track URL and persist
    if (track.url !== previousTrackUrl) {
      setPreviousTrackUrl(track.url);
      localStorage.setItem('dujyo_previous_track_url', track.url);
    }
  }, [track.url, track.playerMode, track.title, isPlaying, previousTrackUrl, setPlaying]);

  // Handle initial load with existing track - RESPECT isPlaying state
  useEffect(() => {
    if (audioRef.current && track.playerMode === 'music') {
      // Get current time from localStorage to preserve playback position
      const savedTime = localStorage.getItem(`dujyo_playback_time_${track.id}`);
      const currentTime = savedTime ? parseFloat(savedTime) : 0;
      audioRef.current.currentTime = currentTime;
      
      // ✅ Respetar el estado isPlaying del context (persistido en localStorage)
      // Si estaba reproduciendo, lo dejamos reproducir (el useEffect anterior lo maneja)
      // Si estaba pausado, lo dejamos pausado
      console.log('🎵 Initial load - isPlaying:', isPlaying);
    }
  }, []); // Only run on mount

  // Save playback position every 5 seconds
  useEffect(() => {
    if (!audioRef.current || track.playerMode !== 'music') return;

    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        localStorage.setItem(`dujyo_playback_time_${track.id}`, audioRef.current.currentTime.toString());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [track.id, track.playerMode]);

  const getSectionStyles = () => {
    switch (track.playerMode) {
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
  const togglePlayPause = () => {
    console.log('Toggle play/pause clicked', { isPlaying, track: track.url, playerMode: track.playerMode });
    
    if (track.playerMode === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error('Video play error:', err);
        });
      }
    } else if (track.playerMode === 'music' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Audio play error:', err);
        });
      }
    }
    setPlaying(!isPlaying);
  };

  // Handle volume
  const toggleMute = () => {
    if (track.playerMode === 'video' && videoRef.current) {
      videoRef.current.muted = !isMuted;
    } else if (track.playerMode === 'music' && audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (track.playerMode === 'video' && videoRef.current) {
      videoRef.current.volume = newVolume;
    } else if (track.playerMode === 'music' && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Handle time updates
  useEffect(() => {
    const updateTime = () => {
      if (track.playerMode === 'video' && videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        setDuration(videoRef.current.duration);
      } else if (track.playerMode === 'music' && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration);
      }
    };

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [track.playerMode]);

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click - MEJORADO
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (duration === 0 || !duration) {
      console.warn('🎵 Cannot seek: duration is 0 or undefined');
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(clickX / rect.width, 1));
    const newTime = percentage * duration;
    
    console.log('🎵 Progress click:', { clickX, rectWidth: rect.width, percentage, newTime, duration });
    
    if (track.playerMode === 'video' && videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else if (track.playerMode === 'music' && audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  // Handle like button
  const handleLike = () => {
    setIsLiked(!isLiked);
    console.log('❤️ Like toggled:', !isLiked);
    // TODO: Implementar API call para guardar like
  };
  
  // Handle share button
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: track.title,
          text: `Check out "${track.title}" by ${track.artist || 'Unknown'} on DUJYO`,
          url: window.location.href
        });
      } else {
        // Fallback: copiar al clipboard
        await navigator.clipboard.writeText(window.location.href);
        console.log('📋 Link copied to clipboard');
        // TODO: Mostrar notificación de éxito
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Handle shuffle toggle
  const handleShuffle = () => {
    contextToggleShuffle();
  };

  // Handle repeat toggle
  const handleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(contextRepeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    contextSetRepeatMode(nextMode);
  };

  // ✅ HANDLERS PARA CONTROLES CON PLAYLIST
  const handleNext = () => {
    if (currentPlaylist.length > 0) {
      contextNextTrack();
    } else {
      console.log('No playlist loaded');
    }
  };

  const handlePrevious = () => {
    const mediaRef = track.playerMode === 'video' ? videoRef.current : audioRef.current;
    if (mediaRef) {
      if (mediaRef.currentTime > 3) {
        // Si pasaron más de 3 segundos, volver al inicio
        mediaRef.currentTime = 0;
      } else if (currentPlaylist.length > 0) {
        // Si hay playlist, ir al track anterior
        contextPreviousTrack();
      }
    }
  };

  const handleFastForward = () => {
    const mediaRef = track.playerMode === 'video' ? videoRef.current : audioRef.current;
    if (mediaRef) {
      mediaRef.currentTime = Math.min(mediaRef.currentTime + 10, duration);
    }
  };

  const handleRewind = () => {
    const mediaRef = track.playerMode === 'video' ? videoRef.current : audioRef.current;
    if (mediaRef) {
      mediaRef.currentTime = Math.max(mediaRef.currentTime - 10, 0);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 🎯 Zona de detección de proximidad (invisible) - Edge Reveal
  // SIEMPRE presente cuando hay un track, incluso si el player está oculto
  const proximityZone = (
    <div
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-40`}
      style={{
        height: '100px', // Zona de detección generosa (100px) para facilitar la interacción
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'opacity 0.2s ease'
      }}
      onMouseEnter={() => setIsProximityHovered(true)}
      onMouseLeave={() => setIsProximityHovered(false)}
    />
  );

  // 🎯 Si no debe mostrarse, solo renderizar la zona de detección
  if (!shouldShow) {
    return proximityZone;
  }

  // 🎯 Renderizar elementos de media SIEMPRE (necesarios para que funcione el play/pause)
  const mediaElements = (
    <>
      {track.playerMode === 'video' && (
        <video
          ref={videoRef}
          src={track.url}
          className="hidden"
          onPlay={() => {
            console.log('🎵 GlobalPlayer: Video onPlay event, setting isPlaying to true');
            setPlaying(true);
          }}
          onPause={() => {
            console.log('🎵 GlobalPlayer: Video onPause event, setting isPlaying to false');
            setPlaying(false);
          }}
          onEnded={() => {
            setPlaying(false);
            if (contextRepeatMode === 'one') {
              // Si está en modo repeat one, volver a reproducir
              setTimeout(() => {
                if (videoRef.current) videoRef.current.play();
              }, 100);
            } else if (contextRepeatMode === 'all' && currentPlaylist.length > 0) {
              // Si está en modo repeat all, ir al siguiente
              contextNextTrack();
            } else if (currentPlaylist.length > 0) {
              // Si hay playlist, ir al siguiente
              contextNextTrack();
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              videoRef.current.volume = volume;
              videoRef.current.muted = isMuted;
            }
          }}
        />
      )}
      
      {track.playerMode === 'music' && (
        <audio
          ref={audioRef}
          src={track.url}
          onPlay={() => {
            console.log('🎵 GlobalPlayer: Audio onPlay event, setting isPlaying to true');
            setPlaying(true);
          }}
          onPause={() => {
            console.log('🎵 GlobalPlayer: Audio onPause event, setting isPlaying to false');
            setPlaying(false);
          }}
          onEnded={() => {
            setPlaying(false);
            if (contextRepeatMode === 'one') {
              // Si está en modo repeat one, volver a reproducir
              setTimeout(() => {
                if (audioRef.current) audioRef.current.play();
              }, 100);
            } else if (contextRepeatMode === 'all' && currentPlaylist.length > 0) {
              // Si está en modo repeat all, ir al siguiente
              contextNextTrack();
            } else if (currentPlaylist.length > 0) {
              // Si hay playlist, ir al siguiente
              contextNextTrack();
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              audioRef.current.volume = volume;
              audioRef.current.muted = isMuted;
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onError={(e) => {
            console.error('Error loading audio:', e);
            console.error('Audio src:', track.url);
          }}
          onCanPlay={() => {
            console.log('Audio can play:', track.url);
            if (isPlaying && audioRef.current) {
              console.log('GlobalPlayer: Audio ready, starting playback');
              audioRef.current.play().catch(err => {
                console.error('Auto-play on canPlay failed:', err);
              });
            }
          }}
        />
      )}
    </>
  );

  if (isMinimized) {
    return (
      <>
        {proximityZone}
        {mediaElements}
        <motion.div
          initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          onMouseEnter={() => {
            setIsHovered(true);
            setIsProximityHovered(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsProximityHovered(false);
          }}
          className={`fixed ${position === 'top' ? 'top-4' : 'bottom-20'} right-4 z-50 ${styles.glowClass} bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-700`}
        >
          <div className="flex items-center space-x-2">
            <img 
              src={track.cover || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'} 
              alt={track.title}
              className="w-10 h-10 rounded-lg object-cover cursor-pointer"
              onClick={() => setIsMinimized(false)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{track.title}</p>
              {track.artist && (
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              )}
            </div>
            
            {/* Botones específicos por modo en versión minimizada */}
            {track.playerMode === 'music' && (
              <>
                <button 
                  onClick={handlePrevious}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Previous"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
              </>
            )}
            
            {track.playerMode === 'video' && (
              <>
                <button 
                  onClick={handleRewind}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Rewind 10s"
                >
                  <Rewind className="w-3 h-3" />
                </button>
              </>
            )}
            
            {track.playerMode === 'gaming' && (
              <>
                <button 
                  onClick={() => {
                    console.log('Gaming controls - TODO: Implement gaming control panel');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Gaming Controls"
                >
                  <Gamepad2 className="w-3 h-3" />
                </button>
              </>
            )}
            
            <button
              onClick={togglePlayPause}
              className={`p-1.5 rounded-full ${styles.gradientClass} text-white hover:scale-110 transition-transform`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            
            {track.playerMode === 'music' && (
              <>
                <button 
                  onClick={handleNext}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Next"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
              </>
            )}
            
            {track.playerMode === 'video' && (
              <>
                <button 
                  onClick={handleFastForward}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Forward 10s"
                >
                  <FastForward className="w-3 h-3" />
                </button>
              </>
            )}
            
            <button
              onClick={handleLike}
              className={`transition-colors ${isLiked ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'}`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="text-gray-400 hover:text-white transition-colors"
              title="Share"
            >
              <Share2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Expand"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {/* 🎯 Zona de detección de proximidad (invisible) - Edge Reveal - SIEMPRE presente */}
      {proximityZone}
      
      {/* 🎯 Elementos de media SIEMPRE presentes para que funcionen los controles */}
      {mediaElements}

      <AnimatePresence>
        <motion.div
          initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          animate={{ 
            y: 0, 
            opacity: shouldShow ? 1 : 0,
            scale: shouldShow ? 1 : 0.95
          }}
          exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onMouseEnter={() => {
            setIsHovered(true);
            setIsProximityHovered(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsProximityHovered(false);
          }}
          className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-50 ${styles.glowClass} bg-gray-800 border-t border-gray-700 transition-all duration-300 ${
            isHovered || isProximityHovered ? 'shadow-2xl' : 'shadow-lg'
          }`}
          style={{
            transform: shouldShow ? 'translateY(0)' : position === 'top' ? 'translateY(-100%)' : 'translateY(100%)',
            pointerEvents: shouldShow ? 'auto' : 'none'
          }}
        >
        <div className="p-4">
          <div className="flex items-center space-x-4">
            {/* Track Info */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <img 
                src={track.cover || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'} 
                alt={track.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h3 className={`text-sm font-semibold ${styles.textClass} truncate`}>
                  {track.title}
                </h3>
                {track.artist && (
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {track.playerMode === 'music' && (
                <>
                  <button 
                    onClick={handleShuffle}
                    className={`transition-colors ${contextIsShuffled ? 'text-amber-400' : 'text-gray-400 hover:text-white'}`}
                    title="Shuffle"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handlePrevious}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Previous"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                </>
              )}
              
              {track.playerMode === 'video' && (
                <>
                  <button 
                    onClick={handleRewind}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>
                </>
              )}
              
              {track.playerMode === 'gaming' && (
                <>
                  <button 
                    onClick={() => {
                      console.log('Gaming controls - TODO: Implement gaming control panel');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Gaming Controls"
                  >
                    <Gamepad2 className="w-4 h-4" />
                  </button>
                </>
              )}
              
              <button
                onClick={togglePlayPause}
                className={`p-3 rounded-full ${styles.gradientClass} text-white hover:scale-110 transition-all duration-200 shadow-lg`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              {track.playerMode === 'music' && (
                <>
                  <button 
                    onClick={handleNext}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Next"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleRepeat}
                    className={`transition-colors ${
                      contextRepeatMode === 'off' ? 'text-gray-400 hover:text-white' :
                      contextRepeatMode === 'all' ? 'text-amber-400' : 'text-amber-500'
                    }`}
                    title={`Repeat: ${contextRepeatMode === 'off' ? 'Off' : contextRepeatMode === 'all' ? 'All' : 'One'}`}
                  >
                    <Repeat className={`w-4 h-4 ${contextRepeatMode === 'one' ? 'fill-current' : ''}`} />
                  </button>
                </>
              )}
              
              {track.playerMode === 'video' && (
                <>
                  <button 
                    onClick={handleFastForward}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Forward 10s"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const video = videoRef.current;
                      if (video) {
                        if (video.requestFullscreen) {
                          video.requestFullscreen();
                        } else if ((video as any).webkitRequestFullscreen) {
                          (video as any).webkitRequestFullscreen();
                        } else if ((video as any).mozRequestFullScreen) {
                          (video as any).mozRequestFullScreen();
                        }
                      }
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Fullscreen"
                  >
                    <Fullscreen className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Video settings - TODO: Implement settings panel');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              )}
              
              {track.playerMode === 'gaming' && (
                <>
                  <button 
                    onClick={() => {
                      console.log('Leaderboard - TODO: Show gaming leaderboard');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Leaderboard"
                  >
                    <Trophy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Multiplayer - TODO: Show multiplayer options');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Multiplayer"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Power-ups - TODO: Show power-ups/boosts');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Power-ups"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <div 
                  className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                  onClick={handleProgressClick}
                  onMouseMove={(e) => {
                    // Visual feedback on hover
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                    e.currentTarget.style.setProperty('--hover-percentage', `${percentage}%`);
                  }}
                  style={{ 
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                >
                  <div 
                    className={`h-full ${styles.gradientClass} rounded-full transition-all duration-300 pointer-events-none`}
                    style={{ width: `${progress}%` }}
                  />
                  {/* Hover indicator */}
                  <div 
                    className="absolute top-0 left-0 h-full w-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ width: 'var(--hover-percentage, 0%)' }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10">
                  {formatTime(duration)}
                </span>
              </div>
            </div>


            {/* Volume and Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              
              {/* Real-time Balance Display */}
              {track.playerMode === 'music' && (
                <div className="flex flex-col items-end gap-1">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all duration-300 ${
                    isBalanceUpdating 
                      ? 'bg-blue-500/20 border-blue-500/30' 
                      : 'bg-gradient-to-r from-green-500/20 to-orange-500/20 border-green-500/30'
                  }`}>
                    <Coins size={14} className={`${isBalanceUpdating ? 'text-blue-400 animate-pulse' : 'text-green-400'}`} />
                    <span className={`text-sm font-semibold ${isBalanceUpdating ? 'text-blue-400' : 'text-green-400'}`}>
                      {available_dyo.toFixed(2)} DYO
                    </span>
                    {isBalanceUpdating && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  {dys > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>DYS: {dys.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleLike}
                className={`transition-colors ${isLiked ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'}`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              
              <button 
                onClick={handleShare}
                className="text-gray-400 hover:text-white transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={stopTrack}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Elements ya están renderizados arriba para que funcionen siempre */}

        {/* Stream-to-Earn Notification */}
        <StreamEarnNotification
          type={notificationData.type}
          amount={notificationData.amount}
          currency={notificationData.currency}
          isVisible={showNotification}
          onClose={() => setShowNotification(false)}
        />
      </motion.div>
    </AnimatePresence>

      {/* Stream Earn Display - Only show for music */}
      {track.playerMode === 'music' && (
        <StreamEarnDisplay />
      )}
    </>
  );
};

// ✅ Optimizar para evitar re-renders innecesarios
export default React.memo(GlobalPlayer, (prevProps, nextProps) => {
  // Solo re-renderizar si el track URL o la posición cambian
  return (
    prevProps.track.url === nextProps.track.url &&
    prevProps.track.playerMode === nextProps.track.playerMode &&
    prevProps.position === nextProps.position
  );
});
