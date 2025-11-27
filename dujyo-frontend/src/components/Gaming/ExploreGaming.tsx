import React, { useState } from 'react';
import GameCard from '../../components/Gaming/GamingCard'; // Componente para la tarjeta de juego
import { usePlayerContext, Track } from '../../contexts/PlayerContext'; // Usar el PlayerContext real

const ExploreGaming: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);  // To handle the game loading state
  const { playTrack } = usePlayerContext();  // Usar el PlayerContext real

  const gamingList = [
    { 
      id: '1', 
      title: 'DUJYO Battle Arena', 
      src: '/music/sample1.mp3', 
      thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=300&fit=crop',
      artist: 'DUJYO Games',
      duration: 360
    },
    { 
      id: '2', 
      title: 'Crypto Quest', 
      src: '/music/COMOPAMORA.wav', 
      thumbnail: 'https://images.unsplash.com/photo-1556438064-2d7646166914?w=300&h=300&fit=crop',
      artist: 'Blockchain Studios',
      duration: 280
    },
    { 
      id: '3', 
      title: 'Digital Warriors', 
      src: '/music/Dices.wav', 
      thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=300&fit=crop',
      artist: 'Tech Gaming',
      duration: 320
    },
  ];

  const playGameplay = (game: { id: string; title: string; src: string; artist: string; duration: number; thumbnail: string }) => {
    setIsLoading(true);
    console.log(`🎮 Reproduciendo Gameplay: ${game.title}`);
    
    // Convert game to Track for Global Player with type GAMING
    const track: Track = {
      id: game.id,
      title: game.title,
      url: game.src,
      playerMode: 'gaming',
      artist: game.artist,
      cover: game.thumbnail,
      duration: game.duration
    };
    
    console.log(' Track created for Global Player:', track);
    playTrack(track);
    console.log('playTrack() executed - GAMING mode activated');
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <h3 style={{ textAlign: 'center', color: '#3ecadd' }}>Explore Gaming</h3>
      
      {/* List of games */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {gamingList.map((game) => (
          <GameCard
            key={game.id}
            game={{
              id: game.id,
              title: game.title,
              description: `Gaming content: ${game.title}`,
              image: game.thumbnail,
              category: 'Action',
              rating: 4.5,
              players: 1250,
              price: 0
            }}
            onPlay={() => playGameplay(game)}  // When clicking on the card, the gameplay is played
          />
        ))}
      </div>

      {/* The Global Player is responsible for the playback */}
      {isLoading && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>Loading gameplay...</p>
        </div>
      )}
    </div>
  );
};

export default ExploreGaming;

