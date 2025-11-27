use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc, Datelike};
use uuid::Uuid;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalRequest {
    pub user_id: String,
    pub amount: f64,
    pub currency: WithdrawalCurrency,
    pub destination: WithdrawalDestination,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WithdrawalCurrency {
    DYO,
    DYS,
    USD,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WithdrawalDestination {
    Crypto { address: String, network: String },
    BankAccount { account_number: String, routing_number: String, account_type: String },
    StripeConnect { account_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalResponse {
    pub withdrawal_id: String,
    pub status: WithdrawalStatus,
    pub amount: f64,
    pub currency: String,
    pub fee: f64,
    pub net_amount: f64,
    pub estimated_completion: Option<DateTime<Utc>>,
    pub transaction_hash: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WithdrawalStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalLimit {
    pub daily_limit: f64,
    pub monthly_limit: f64,
    pub min_amount: f64,
    pub max_amount: f64,
    pub kyc_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalHistory {
    pub withdrawals: Vec<WithdrawalRecord>,
    pub total_withdrawn: f64,
    pub pending_withdrawals: Vec<WithdrawalRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalRecord {
    pub withdrawal_id: String,
    pub user_id: String,
    pub amount: f64,
    pub currency: String,
    pub fee: f64,
    pub net_amount: f64,
    pub status: WithdrawalStatus,
    pub destination: String,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub transaction_hash: Option<String>,
}

// ============================================================================
// WITHDRAWAL SERVICE
// ============================================================================

pub struct WithdrawalService {
    // In production, these would be database connections
    // For now, using in-memory storage
    withdrawals: std::sync::Arc<tokio::sync::RwLock<HashMap<String, WithdrawalRecord>>>,
    limits: WithdrawalLimit,
}

impl WithdrawalService {
    pub fn new() -> Self {
        Self {
            withdrawals: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            limits: WithdrawalLimit {
                daily_limit: 10000.0, // $10,000 per day
                monthly_limit: 100000.0, // $100,000 per month
                min_amount: 10.0, // Minimum $10
                max_amount: 50000.0, // Maximum $50,000 per withdrawal
                kyc_required: true, // KYC required for withdrawals
            },
        }
    }

    /// Calculate withdrawal fee based on currency and amount
    pub fn calculate_fee(&self, currency: &WithdrawalCurrency, amount: f64) -> f64 {
        match currency {
            WithdrawalCurrency::DYO => {
                // Fixed fee for crypto withdrawals
                0.001 * amount // 0.1% fee
            }
            WithdrawalCurrency::DYS => {
                // Fixed fee for stablecoin withdrawals
                0.0015 * amount // 0.15% fee
            }
            WithdrawalCurrency::USD => {
                // Higher fee for fiat withdrawals (bank processing)
                0.025 * amount + 2.0 // 2.5% + $2 fixed
            }
        }
    }

    /// Check if withdrawal is within limits
    pub async fn check_limits(&self, user_id: &str, amount: f64) -> Result<(), String> {
        // Check minimum amount
        if amount < self.limits.min_amount {
            return Err(format!("Minimum withdrawal amount is ${}", self.limits.min_amount));
        }

        // Check maximum amount
        if amount > self.limits.max_amount {
            return Err(format!("Maximum withdrawal amount is ${}", self.limits.max_amount));
        }

        // Check daily limit
        let daily_total = self.get_daily_total(user_id).await;
        if daily_total + amount > self.limits.daily_limit {
            return Err(format!(
                "Daily withdrawal limit exceeded. Available: ${:.2}",
                self.limits.daily_limit - daily_total
            ));
        }

        // Check monthly limit
        let monthly_total = self.get_monthly_total(user_id).await;
        if monthly_total + amount > self.limits.monthly_limit {
            return Err(format!(
                "Monthly withdrawal limit exceeded. Available: ${:.2}",
                self.limits.monthly_limit - monthly_total
            ));
        }

        Ok(())
    }

    /// Get daily withdrawal total for user
    async fn get_daily_total(&self, user_id: &str) -> f64 {
        let withdrawals = self.withdrawals.read().await;
        let today = Utc::now().date_naive();
        
        withdrawals
            .values()
            .filter(|w| {
                w.user_id == user_id
                    && w.created_at.date_naive() == today
                    && matches!(w.status, WithdrawalStatus::Completed)
            })
            .map(|w| w.amount)
            .sum()
    }

    /// Get monthly withdrawal total for user
    async fn get_monthly_total(&self, user_id: &str) -> f64 {
        let withdrawals = self.withdrawals.read().await;
        let now = Utc::now().date_naive();
        let month_start = match chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1) {
            Some(date) => date,
            None => {
                tracing::error!("CRITICAL: Invalid date in monthly withdrawal calculation");
                return 0.0; // Return 0 if date is invalid
            }
        };
        
        withdrawals
            .values()
            .filter(|w| {
                w.user_id == user_id
                    && w.created_at.date_naive() >= month_start
                    && matches!(w.status, WithdrawalStatus::Completed)
            })
            .map(|w| w.amount)
            .sum()
    }

    /// Process withdrawal request
    pub async fn process_withdrawal(
        &self,
        request: WithdrawalRequest,
        kyc_verified: bool,
    ) -> Result<WithdrawalResponse, String> {
        // Check KYC requirement
        if self.limits.kyc_required && !kyc_verified {
            return Err("KYC verification required for withdrawals".to_string());
        }

        // Check limits
        self.check_limits(&request.user_id, request.amount).await?;

        // Calculate fee
        let fee = self.calculate_fee(&request.currency, request.amount);
        let net_amount = request.amount - fee;

        // Create withdrawal record
        let withdrawal_id = Uuid::new_v4().to_string();
        let withdrawal_record = WithdrawalRecord {
            withdrawal_id: withdrawal_id.clone(),
            user_id: request.user_id.clone(),
            amount: request.amount,
            currency: format!("{:?}", request.currency),
            fee,
            net_amount,
            status: WithdrawalStatus::Pending,
            destination: format!("{:?}", request.destination),
            created_at: Utc::now(),
            completed_at: None,
            transaction_hash: None,
        };

        // Store withdrawal
        {
            let mut withdrawals = self.withdrawals.write().await;
            withdrawals.insert(withdrawal_id.clone(), withdrawal_record);
        }

        // Process withdrawal based on destination
        let status = match request.destination {
            WithdrawalDestination::Crypto { address, network } => {
                self.process_crypto_withdrawal(&withdrawal_id, address, network, net_amount).await
            }
            WithdrawalDestination::BankAccount { account_number, routing_number, account_type } => {
                self.process_bank_withdrawal(&withdrawal_id, account_number, routing_number, account_type, net_amount).await
            }
            WithdrawalDestination::StripeConnect { account_id } => {
                self.process_stripe_withdrawal(&withdrawal_id, account_id, net_amount).await
            }
        };

        Ok(WithdrawalResponse {
            withdrawal_id,
            status,
            amount: request.amount,
            currency: format!("{:?}", request.currency),
            fee,
            net_amount,
            estimated_completion: Some(Utc::now() + chrono::Duration::hours(24)),
            transaction_hash: None,
            error_message: None,
        })
    }

    /// Process crypto withdrawal
    async fn process_crypto_withdrawal(
        &self,
        withdrawal_id: &str,
        address: String,
        network: String,
        amount: f64,
    ) -> WithdrawalStatus {
        // TODO: Integrate with Circle USDC or other crypto payment provider
        // For now, simulate processing
        println!("Processing crypto withdrawal: {} {} to {} on {}", amount, withdrawal_id, address, network);
        
        // Simulate async processing
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        
        WithdrawalStatus::Processing
    }

    /// Process bank withdrawal
    async fn process_bank_withdrawal(
        &self,
        withdrawal_id: &str,
        account_number: String,
        routing_number: String,
        account_type: String,
        amount: f64,
    ) -> WithdrawalStatus {
        // TODO: Integrate with Stripe Connect for ACH transfers
        println!("Processing bank withdrawal: {} {} to {} ({})", amount, withdrawal_id, account_number, account_type);
        
        // Simulate async processing
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        
        WithdrawalStatus::Processing
    }

    /// Process Stripe Connect withdrawal
    async fn process_stripe_withdrawal(
        &self,
        withdrawal_id: &str,
        account_id: String,
        amount: f64,
    ) -> WithdrawalStatus {
        // TODO: Integrate with Stripe Connect API
        // Example: stripe::Transfer::create(&stripe_client, &stripe::TransferCreateParams {
        //     amount: (amount * 100.0) as i64, // Convert to cents
        //     currency: "usd",
        //     destination: account_id,
        // })
        println!("Processing Stripe withdrawal: {} {} to account {}", amount, withdrawal_id, account_id);
        
        WithdrawalStatus::Processing
    }

    /// Get withdrawal history for user
    pub async fn get_withdrawal_history(&self, user_id: &str) -> WithdrawalHistory {
        let withdrawals = self.withdrawals.read().await;
        
        let user_withdrawals: Vec<WithdrawalRecord> = withdrawals
            .values()
            .filter(|w| w.user_id == user_id)
            .cloned()
            .collect();

        let total_withdrawn = user_withdrawals
            .iter()
            .filter(|w| matches!(w.status, WithdrawalStatus::Completed))
            .map(|w| w.amount)
            .sum();

        let pending_withdrawals: Vec<WithdrawalRecord> = user_withdrawals
            .iter()
            .filter(|w| matches!(w.status, WithdrawalStatus::Pending | WithdrawalStatus::Processing))
            .cloned()
            .collect();

        WithdrawalHistory {
            withdrawals: user_withdrawals,
            total_withdrawn,
            pending_withdrawals,
        }
    }

    /// Get withdrawal limits
    pub fn get_limits(&self) -> &WithdrawalLimit {
        &self.limits
    }

    /// Update withdrawal status
    pub async fn update_withdrawal_status(
        &self,
        withdrawal_id: &str,
        status: WithdrawalStatus,
        transaction_hash: Option<String>,
    ) -> Result<(), String> {
        let mut withdrawals = self.withdrawals.write().await;
        
        if let Some(withdrawal) = withdrawals.get_mut(withdrawal_id) {
            let status_clone = status.clone();
            withdrawal.status = status;
            if let Some(hash) = transaction_hash {
                withdrawal.transaction_hash = Some(hash);
            }
            if matches!(status_clone, WithdrawalStatus::Completed | WithdrawalStatus::Failed) {
                withdrawal.completed_at = Some(Utc::now());
            }
            Ok(())
        } else {
            Err("Withdrawal not found".to_string())
        }
    }
}

impl Default for WithdrawalService {
    fn default() -> Self {
        Self::new()
    }
}

