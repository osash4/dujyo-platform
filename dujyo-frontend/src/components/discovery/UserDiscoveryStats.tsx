import React, { useState } from 'react';
import { useUserDiscoveryStats, useClaimRewards } from '../../hooks/useDiscovery';
import './UserDiscoveryStats.css';

interface UserDiscoveryStatsProps {
  userId: string;
}

const UserDiscoveryStats: React.FC<UserDiscoveryStatsProps> = ({ userId }) => {
  const { stats, loading, error, refetch } = useUserDiscoveryStats(userId, true, 30000);
  const { claimRewards, claiming, response: claimResponse } = useClaimRewards();
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);

  const handleClaimRewards = async () => {
    if (!stats || stats.rewards.claimable_rewards.length === 0) return;

    try {
      const rewardIds = stats.rewards.claimable_rewards.map(r => r.reward_id);
      await claimRewards({ user_id: userId, reward_ids: rewardIds });
      setShowClaimSuccess(true);
      setTimeout(() => setShowClaimSuccess(false), 5000);
      refetch();
    } catch (err) {
      console.error('Error claiming rewards:', err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="user-stats-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your discovery stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-stats-container">
        <div className="error-message">
          <h3>❌ Error Loading Stats</h3>
          <p>{error}</p>
          <button onClick={refetch} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const progressPercentage = (stats.total_xp / (stats.total_xp + stats.xp_to_next_level)) * 100;

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return '#ff9500';
      case 'epic': return '#9b59b6';
      case 'rare': return '#3498db';
      case 'common': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  return (
    <div className="user-stats-container">
      {showClaimSuccess && claimResponse && (
        <div className="claim-success-banner">
          🎉 {claimResponse.message}
          {claimResponse.transaction_hash && (
            <span className="tx-hash">TX: {claimResponse.transaction_hash.slice(0, 10)}...</span>
          )}
        </div>
      )}

      <div className="stats-header">
        <div className="user-profile">
          <div className="profile-avatar">
            {stats.username.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h1>{stats.username}</h1>
            <p className="user-id">{stats.user_id}</p>
          </div>
        </div>

        <div className="level-card">
          <div className="level-badge-large">Level {stats.level}</div>
          <div className="xp-progress">
            <div className="xp-bar-large">
              <div className="xp-fill-large" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <p className="xp-text-large">
              {stats.total_xp.toLocaleString()} / {(stats.total_xp + stats.xp_to_next_level).toLocaleString()} XP
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card highlight">
          <div className="stat-icon">🎵</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_discoveries}</div>
            <div className="stat-label">Total Discoveries</div>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.early_adopter_discoveries}</div>
            <div className="stat-label">Early Adoptions</div>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{stats.successful_predictions}</div>
            <div className="stat-label">Successful Predictions</div>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.taste_maker_score.toFixed(1)}</div>
            <div className="stat-label">Taste Maker Score</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.discovery_streak}</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{stats.longest_streak}</div>
            <div className="stat-label">Longest Streak</div>
          </div>
        </div>
      </div>

      <div className="rewards-section">
        <h2>💰 Rewards Summary</h2>
        <div className="rewards-grid">
          <div className="reward-card">
            <div className="reward-icon">💎</div>
            <div className="reward-value">{stats.rewards.total_dyo_earned.toFixed(2)} DYO</div>
            <div className="reward-label">Total Earned</div>
          </div>
          <div className="reward-card pending">
            <div className="reward-icon">⏳</div>
            <div className="reward-value">{stats.rewards.pending_dyo.toFixed(2)} DYO</div>
            <div className="reward-label">Pending</div>
          </div>
          <div className="reward-card">
            <div className="reward-icon">🎨</div>
            <div className="reward-value">{stats.rewards.total_nfts_earned}</div>
            <div className="reward-label">NFT Badges</div>
          </div>
        </div>

        {stats.rewards.claimable_rewards.length > 0 && (
          <div className="claimable-rewards">
            <h3>Claimable Rewards</h3>
            {stats.rewards.claimable_rewards.map((reward) => (
              <div key={reward.reward_id} className="claimable-reward-item">
                <div className="reward-info">
                  <span className="reward-type">{reward.reward_type.replace('_', ' ')}</span>
                  <span className="reward-description">{reward.description}</span>
                  {reward.expires_at && (
                    <span className="reward-expiry">Expires: {new Date(reward.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="reward-amount">{reward.amount} DYO</div>
              </div>
            ))}
            <button 
              onClick={handleClaimRewards} 
              disabled={claiming}
              className="claim-button"
            >
              {claiming ? '⏳ Claiming...' : '🎁 Claim All Rewards'}
            </button>
          </div>
        )}
      </div>

      <div className="badges-section">
        <h2>🏅 Earned Badges</h2>
        <div className="badges-grid">
          {stats.badges.map((badge) => (
            <div 
              key={badge.badge_id} 
              className="badge-card"
              style={{ borderColor: getRarityColor(badge.rarity) }}
            >
              <div className="badge-rarity" style={{ color: getRarityColor(badge.rarity) }}>
                {badge.rarity.toUpperCase()}
              </div>
              {badge.is_soulbound && <div className="soulbound-tag">🔗 Soulbound</div>}
              <div className="badge-icon-large">{badge.name.split(' ')[0]}</div>
              <h3 className="badge-name">{badge.name}</h3>
              <p className="badge-description">{badge.description}</p>
              <p className="badge-earned">Earned: {new Date(badge.earned_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="discoveries-section">
        <h2>🎧 Recent Discoveries</h2>
        <div className="discoveries-list">
          {stats.recent_discoveries.map((discovery, index) => (
            <div key={`${discovery.track_id}-${index}`} className="discovery-item">
              <div className="discovery-info">
                <h3>{discovery.track_name}</h3>
                <p className="artist-name">{discovery.artist_name}</p>
                <p className="discovery-date">{new Date(discovery.discovered_at).toLocaleDateString()}</p>
              </div>
              <div className="discovery-growth">
                <div className="growth-stat">
                  <span className="growth-label">Followers</span>
                  <span className="growth-value">
                    {discovery.followers_then.toLocaleString()} → {discovery.followers_now.toLocaleString()}
                  </span>
                  <span className="growth-multiplier">📈 {discovery.growth_multiplier.toFixed(1)}x</span>
                </div>
                <div className="growth-stat">
                  <span className="growth-label">Streams</span>
                  <span className="growth-value">
                    {discovery.streams_then.toLocaleString()} → {discovery.streams_now.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="discovery-rewards">
                <div className="reward-earned">
                  <span className="reward-icon">⭐</span>
                  <span>{discovery.xp_earned} XP</span>
                </div>
                <div className="reward-earned">
                  <span className="reward-icon">💎</span>
                  <span>{discovery.tokens_earned.toFixed(2)} DYO</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="genres-section">
        <h2>🎼 Top Genres Discovered</h2>
        <div className="genres-list">
          {stats.top_genres_discovered.map((genre) => (
            <div key={genre.genre} className="genre-item">
              <div className="genre-name">{genre.genre}</div>
              <div className="genre-stats">
                <span className="genre-discoveries">{genre.discoveries} discoveries</span>
                <span className="genre-accuracy">{genre.accuracy.toFixed(1)}% accuracy</span>
              </div>
              <div className="genre-bar">
                <div className="genre-fill" style={{ width: `${genre.accuracy}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDiscoveryStats;

