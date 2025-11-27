import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon_url: string;
  earned_at: string;
  is_soulbound: boolean;
}

export interface DiscovererProfile {
  user_id: string;
  username: string;
  discovery_score: number;
  total_discoveries: number;
  successful_predictions: number;
  taste_maker_score: number;
  rank: number;
  badges: Badge[];
  avatar_url?: string;
  level: number;
  xp: number;
}

export interface DiscoveryLeaderboard {
  top_discoverers: DiscovererProfile[];
  time_period: string;
  total_participants: number;
  timestamp: number;
}

export interface RecentDiscovery {
  artist_id: string;
  artist_name: string;
  track_id: string;
  track_name: string;
  discovered_at: string;
  followers_then: number;
  followers_now: number;
  streams_then: number;
  streams_now: number;
  growth_multiplier: number;
  xp_earned: number;
  tokens_earned: number;
}

export interface GenreStats {
  genre: string;
  discoveries: number;
  accuracy: number;
}

export interface ClaimableReward {
  reward_id: string;
  reward_type: string;
  amount: number;
  description: string;
  expires_at?: string;
}

export interface RewardsSummary {
  total_dyo_earned: number;
  pending_dyo: number;
  total_nfts_earned: number;
  claimable_rewards: ClaimableReward[];
}

export interface UserDiscoveryStats {
  user_id: string;
  username: string;
  total_discoveries: number;
  early_adopter_discoveries: number;
  successful_predictions: number;
  taste_maker_score: number;
  discovery_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  badges: Badge[];
  recent_discoveries: RecentDiscovery[];
  top_genres_discovered: GenreStats[];
  rewards: RewardsSummary;
}

export interface RecordListeningRequest {
  user_id: string;
  artist_id: string;
  track_id: string;
}

export interface RecordListeningResponse {
  success: boolean;
  message: string;
  xp_earned: number;
  tokens_earned: number;
  new_badges: Badge[];
  is_early_discovery: boolean;
  early_adopter_multiplier: number;
}

export interface ClaimRewardsRequest {
  user_id: string;
  reward_ids: string[];
}

export interface ClaimRewardsResponse {
  success: boolean;
  message: string;
  dyo_claimed: number;
  nfts_claimed: string[];
  transaction_hash?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get the discovery leaderboard
 */
export async function getDiscoveryLeaderboard(): Promise<DiscoveryLeaderboard> {
  const response = await axios.get(`${API_BASE_URL}/api/v1/discovery/leaderboard`);
  return response.data;
}

/**
 * Get discovery stats for a specific user
 */
export async function getUserDiscoveryStats(userId: string): Promise<UserDiscoveryStats> {
  const response = await axios.get(`${API_BASE_URL}/api/v1/discovery/user-stats/${userId}`);
  return response.data;
}

/**
 * Record that a user listened to an artist/track for discovery tracking
 */
export async function recordListening(request: RecordListeningRequest): Promise<RecordListeningResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/v1/discovery/record-listening`, request);
  return response.data;
}

/**
 * Claim pending rewards
 */
export async function claimRewards(request: ClaimRewardsRequest): Promise<ClaimRewardsResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/v1/discovery/claim-rewards`, request);
  return response.data;
}

