// src/components/Music/MusicCard.tsx
import React from 'react';

interface MusicCardProps {
  title: string;
  artist: string;
  coverImage: string;
  artistAvatarUrl?: string | null; // ✅ Avatar del artista
  onClick: () => void; // Función para manejar la acción al hacer clic (reproducir la canción)
}

const MusicCard: React.FC<MusicCardProps> = ({ title, artist, coverImage, artistAvatarUrl, onClick }) => {
  // ✅ FIX: Fallback para avatar del artista
  const artistAvatar = artistAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist)}&background=3ecadd&color=fff&size=64`;
  
  return (
    <div
      style={{
        backgroundColor: '#2a2a2a',
        padding: '15px',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.3s',
        position: 'relative',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* ✅ Cover Image */}
      <div style={{ position: 'relative', width: '150px', height: '150px', marginBottom: '15px' }}>
        <img
          src={coverImage}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '10px',
            backgroundColor: '#1a1a1a', // ✅ Background mientras carga
          }}
          onLoad={() => {
            console.log('✅ [MusicCard] Image loaded successfully:', coverImage);
          }}
          onError={(e) => {
            // ✅ FIX: Fallback to generated image if cover fails to load
            const target = e.target as HTMLImageElement;
            console.error('❌ [MusicCard] Image failed to load:', coverImage);
            if (!target.src.includes('ui-avatars.com')) {
              const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=F59E0B&color=fff&size=400`;
              console.log('🔄 [MusicCard] Using fallback image:', fallbackUrl);
              target.src = fallbackUrl;
            }
          }}
        />
        {/* ✅ Play Button Overlay (similar to Spotify) */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#3ecadd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="white"
            style={{ marginLeft: '2px' }}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      
      {/* ✅ Title */}
      <h4 style={{ color: '#fff', textAlign: 'center', fontSize: '16px', marginBottom: '8px', fontWeight: '600' }}>
        {title}
      </h4>
      
      {/* ✅ Artist with Avatar (similar to Spotify) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
        <img
          src={artistAvatar}
          alt={artist}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('ui-avatars.com')) {
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist)}&background=3ecadd&color=fff&size=64`;
            }
          }}
        />
        <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>{artist}</p>
      </div>
    </div>
  );
};

export default MusicCard;
