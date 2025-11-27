use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserTier {
    Free,
    Premium,
    Pro,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRewards {
    pub user_address: String,
    pub music_listening_rewards: f64,
    pub gaming_rewards: f64,
    pub content_creation_rewards: f64,
    pub referral_rewards: f64,
    pub total_earned: f64,
    pub tier: UserTier,
}

impl UserRewards {
    pub fn new(user_address: String, tier: UserTier) -> Self {
        Self {
            user_address,
            music_listening_rewards: 0.0,
            gaming_rewards: 0.0,
            content_creation_rewards: 0.0,
            referral_rewards: 0.0,
            total_earned: 0.0,
            tier,
        }
    }

    pub fn calculate_hourly_listening_rewards(hours: f64, user_tier: &UserTier) -> f64 {
        let base_rate = match user_tier {
            UserTier::Free => 1.0,
            UserTier::Premium => 2.0,
            UserTier::Pro => 5.0,
        };

        hours * base_rate
    }

    pub fn calculate_gaming_rewards(score: u64, game_difficulty: f64) -> f64 {
        (score as f64 * game_difficulty) / 1000.0
    }

    pub fn add_listening_rewards(&mut self, hours: f64) {
        let rewards = Self::calculate_hourly_listening_rewards(hours, &self.tier);
        self.music_listening_rewards += rewards;
        self.total_earned += rewards;
    }

    pub fn add_gaming_rewards(&mut self, score: u64, difficulty: f64) {
        let rewards = Self::calculate_gaming_rewards(score, difficulty);
        self.gaming_rewards += rewards;
        self.total_earned += rewards;
    }

    pub fn add_content_creation_rewards(&mut self, amount: f64) {
        self.content_creation_rewards += amount;
        self.total_earned += amount;
    }

    pub fn add_referral_rewards(&mut self, amount: f64) {
        self.referral_rewards += amount;
        self.total_earned += amount;
    }

    pub fn get_total_rewards(&self) -> f64 {
        self.total_earned
    }
}

#[derive(Debug, Clone)]
pub struct RewardsManager {
    user_rewards: std::collections::HashMap<String, UserRewards>,
}

impl RewardsManager {
    pub fn new() -> Self {
        Self {
            user_rewards: std::collections::HashMap::new(),
        }
    }

    pub fn get_or_create_user(&mut self, user_address: String, tier: UserTier) -> &mut UserRewards {
        self.user_rewards
            .entry(user_address.clone())
            .or_insert_with(|| UserRewards::new(user_address, tier))
    }

    pub fn get_user_rewards(&self, user_address: &str) -> Option<&UserRewards> {
        self.user_rewards.get(user_address)
    }
}
