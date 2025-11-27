use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistVesting {
    pub artist_address: String,
    pub total_earned: f64,
    pub immediate_release: f64,
    pub vested_amount: f64,
    pub vesting_start: i64,
    pub vesting_duration: i64,
    pub claimed_amount: f64,
}

impl ArtistVesting {
    pub fn new(artist_address: String, total_amount: f64) -> Self {
        let immediate_release = total_amount * 0.2;
        let vested_amount = total_amount * 0.8;

        Self {
            artist_address,
            total_earned: total_amount,
            immediate_release,
            vested_amount,
            vesting_start: Utc::now().timestamp(),
            vesting_duration: 365 * 24 * 60 * 60, // 1 año en segundos
            claimed_amount: 0.0,
        }
    }

    pub fn calculate_available(&self, current_time: i64) -> f64 {
        if current_time >= self.vesting_start + self.vesting_duration {
            return self.vested_amount;
        }

        let elapsed = current_time - self.vesting_start;
        let vested_percentage = elapsed as f64 / self.vesting_duration as f64;
        let vested_amount = self.vested_amount * vested_percentage;

        self.immediate_release + vested_amount - self.claimed_amount
    }

    pub fn claim(&mut self, amount: f64, current_time: i64) -> Result<f64, String> {
        let available = self.calculate_available(current_time);

        if amount > available {
            return Err(format!(
                "Insufficient vested amount. Available: {}, Requested: {}",
                available, amount
            ));
        }

        self.claimed_amount += amount;
        Ok(amount)
    }
}

#[derive(Debug, Clone)]
pub struct ArtistVestingManager {
    vesting_schedules: std::collections::HashMap<String, ArtistVesting>,
}

impl ArtistVestingManager {
    pub fn new() -> Self {
        Self {
            vesting_schedules: std::collections::HashMap::new(),
        }
    }

    pub fn create_vesting_schedule(&mut self, artist_address: String, total_amount: f64) {
        let vesting = ArtistVesting::new(artist_address.clone(), total_amount);
        self.vesting_schedules.insert(artist_address, vesting);
    }

    pub fn get_available_amount(&self, artist_address: &str, current_time: i64) -> Option<f64> {
        self.vesting_schedules
            .get(artist_address)
            .map(|vesting| vesting.calculate_available(current_time))
    }

    pub fn claim_amount(
        &mut self,
        artist_address: &str,
        amount: f64,
        current_time: i64,
    ) -> Result<f64, String> {
        if let Some(vesting) = self.vesting_schedules.get_mut(artist_address) {
            vesting.claim(amount, current_time)
        } else {
            Err("No vesting schedule found for artist".to_string())
        }
    }
}
