import React from 'react';
import { useDiscoveryLeaderboard } from '../../hooks/useDiscovery';
import './DiscoveryLeaderboard.css';

const DiscoveryLeaderboard: React.FC = () => {
  const { leaderboard, loading, error, refetch } = useDiscoveryLeaderboard(true, 60000);

  if (loading && !leaderboard) {
    return (
      <div className="discovery-leaderboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="discovery-leaderboard-container">
        <div className="error-message">
          <h3>❌ Error Loading Leaderboard</h3>
          <p>{error}</p>
          <button onClick={refetch} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.top_discoverers.length === 0) {
    return (
      <div className="discovery-leaderboard-container">
        <div className="empty-state">
          <p>🎵 No discoverers yet. Be the first!</p>
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return '#ff9500';
      case 'epic': return '#9b59b6';
      case 'rare': return '#3498db';
      case 'common': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="discovery-leaderboard-container">
      <div className="leaderboard-header">
        <h1>🏆 Discovery Leaderboard</h1>
        <p className="leaderboard-subtitle">
          Top music discoverers who found hits before they went mainstream
        </p>
        <div className="leaderboard-stats">
          <div className="stat-box">
            <span className="stat-label">Total Participants</span>
            <span className="stat-value">{leaderboard.total_participants.toLocaleString()}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Time Period</span>
            <span className="stat-value">{leaderboard.time_period.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="leaderboard-list">
        {leaderboard.top_discoverers.map((discoverer) => (
          <div key={discoverer.user_id} className={`discoverer-card rank-${discoverer.rank}`}>
            <div className="discoverer-rank">
              <span className="rank-badge">{getMedalEmoji(discoverer.rank)}</span>
            </div>
            
            <div className="discoverer-avatar">
              {discoverer.avatar_url ? (
                <img src={discoverer.avatar_url} alt={discoverer.username} />
              ) : (
                <div className="avatar-placeholder">
                  {discoverer.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="level-badge">Lvl {discoverer.level}</div>
            </div>

            <div className="discoverer-info">
              <h3 className="discoverer-name">{discoverer.username}</h3>
              <div className="discoverer-metrics">
                <div className="metric">
                  <span className="metric-icon">🎵</span>
                  <span className="metric-value">{discoverer.total_discoveries}</span>
                  <span className="metric-label">Discoveries</span>
                </div>
                <div className="metric">
                  <span className="metric-icon">🎯</span>
                  <span className="metric-value">{discoverer.successful_predictions}</span>
                  <span className="metric-label">Hits Predicted</span>
                </div>
                <div className="metric">
                  <span className="metric-icon">⭐</span>
                  <span className="metric-value">{discoverer.taste_maker_score.toFixed(1)}</span>
                  <span className="metric-label">Taste Score</span>
                </div>
              </div>
            </div>

            <div className="discoverer-score">
              <div className="score-label">Discovery Score</div>
              <div className="score-value">{discoverer.discovery_score.toLocaleString()}</div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: '75%' }}></div>
              </div>
              <div className="xp-text">{discoverer.xp.toLocaleString()} XP</div>
            </div>

            {discoverer.badges.length > 0 && (
              <div className="discoverer-badges">
                {discoverer.badges.slice(0, 3).map((badge) => (
                  <div 
                    key={badge.badge_id} 
                    className="badge-mini"
                    style={{ borderColor: getRarityColor(badge.rarity) }}
                    title={`${badge.name} - ${badge.description}`}
                  >
                    <span>{badge.name.split(' ')[0]}</span>
                  </div>
                ))}
                {discoverer.badges.length > 3 && (
                  <div className="badge-more">+{discoverer.badges.length - 3}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="leaderboard-footer">
        <p className="refresh-note">Auto-refreshes every 60 seconds</p>
        <button onClick={refetch} className="refresh-button">🔄 Refresh Now</button>
      </div>
    </div>
  );
};

export default DiscoveryLeaderboard;

