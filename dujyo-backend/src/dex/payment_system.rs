use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaymentTier {
    MegaStar,  // Bad Bunny, The Weeknd - 60% stable, 30% DYO, 10% bonus
    MidTier,   // 70% stable, 30% DYO
    Emerging,  // 80% stable, 20% DYO
    Community, // 90% stable, 10% DYO
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridPayment {
    pub stablecoin_amount: f64,
    pub token_amount: f64,
    pub loyalty_bonus: f64,
    pub tier: PaymentTier,
}

impl HybridPayment {
    pub fn calculate_payment(total_revenue: f64, artist_share: f64, tier: PaymentTier) -> Self {
        let (stable_percent, token_percent, bonus_percent) = match tier {
            PaymentTier::MegaStar => (0.6, 0.3, 0.1),
            PaymentTier::MidTier => (0.7, 0.3, 0.0),
            PaymentTier::Emerging => (0.8, 0.2, 0.0),
            PaymentTier::Community => (0.9, 0.1, 0.0),
        };

        let total_payment = total_revenue * artist_share;

        HybridPayment {
            stablecoin_amount: total_payment * stable_percent,
            token_amount: total_payment * token_percent,
            loyalty_bonus: total_payment * bonus_percent,
            tier,
        }
    }

    pub fn get_total_amount(&self) -> f64 {
        self.stablecoin_amount + self.token_amount + self.loyalty_bonus
    }
}

#[derive(Debug, Clone)]
pub struct PaymentManager {
    payments: std::collections::HashMap<String, Vec<HybridPayment>>,
}

impl PaymentManager {
    pub fn new() -> Self {
        Self {
            payments: std::collections::HashMap::new(),
        }
    }

    pub fn process_payment(
        &mut self,
        artist_address: String,
        total_revenue: f64,
        artist_share: f64,
        tier: PaymentTier,
    ) -> HybridPayment {
        let payment = HybridPayment::calculate_payment(total_revenue, artist_share, tier);

        self.payments
            .entry(artist_address)
            .or_insert_with(Vec::new)
            .push(payment.clone());

        payment
    }

    pub fn get_payment_history(&self, artist_address: &str) -> Option<&Vec<HybridPayment>> {
        self.payments.get(artist_address)
    }
}
