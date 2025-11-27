use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, NaiveDate};
use std::collections::HashMap;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxReport {
    pub user_id: String,
    pub year: i32,
    pub total_earnings: f64,
    pub total_withdrawals: f64,
    pub tax_withheld: f64,
    pub transactions: Vec<TaxTransaction>,
    pub form_type: TaxFormType,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaxFormType {
    Form1099, // US independent contractor
    FormW8,   // Foreign entity
    FormW9,   // US entity
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxTransaction {
    pub transaction_id: String,
    pub date: NaiveDate,
    pub description: String,
    pub amount: f64,
    pub currency: String,
    pub transaction_type: TransactionType,
    pub tax_category: TaxCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionType {
    Royalty,
    Streaming,
    NFT,
    Staking,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaxCategory {
    Income,
    CapitalGains,
    Interest,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxWithholding {
    pub user_id: String,
    pub year: i32,
    pub total_income: f64,
    pub withholding_rate: f64,
    pub amount_withheld: f64,
}

// ============================================================================
// TAX REPORTING SERVICE
// ============================================================================

pub struct TaxReportingService {
    // In production, this would integrate with TaxJar or similar service
    withholding_records: std::sync::Arc<tokio::sync::RwLock<HashMap<String, TaxWithholding>>>,
}

impl TaxReportingService {
    pub fn new() -> Self {
        Self {
            withholding_records: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// Generate tax report for user for a given year
    pub async fn generate_tax_report(
        &self,
        user_id: &str,
        year: i32,
        transactions: Vec<TaxTransaction>,
    ) -> TaxReport {
        let total_earnings: f64 = transactions.iter().map(|t| t.amount).sum();
        
        // Get withholding information
        let withholding_key = format!("{}:{}", user_id, year);
        let tax_withheld = {
            let records = self.withholding_records.read().await;
            records
                .get(&withholding_key)
                .map(|w| w.amount_withheld)
                .unwrap_or(0.0)
        };

        // Calculate total withdrawals (simplified - in production would query withdrawal service)
        let total_withdrawals = 0.0; // TODO: Query from withdrawal service

        // Determine form type based on user location/status
        let form_type = self.determine_form_type(user_id).await;

        TaxReport {
            user_id: user_id.to_string(),
            year,
            total_earnings,
            total_withdrawals,
            tax_withheld,
            transactions,
            form_type,
            generated_at: Utc::now(),
        }
    }

    /// Determine appropriate tax form type
    async fn determine_form_type(&self, user_id: &str) -> TaxFormType {
        // TODO: Query user profile to determine location/tax status
        // For now, default to 1099
        TaxFormType::Form1099
    }

    /// Calculate tax withholding for income
    pub async fn calculate_withholding(
        &self,
        user_id: &str,
        income: f64,
        year: i32,
    ) -> TaxWithholding {
        // Default withholding rate (can be customized based on user location)
        let withholding_rate = 0.24; // 24% default for US independent contractors
        
        let amount_withheld = income * withholding_rate;

        let withholding = TaxWithholding {
            user_id: user_id.to_string(),
            year,
            total_income: income,
            withholding_rate,
            amount_withheld,
        };

        // Store withholding record
        {
            let withholding_key = format!("{}:{}", user_id, year);
            let mut records = self.withholding_records.write().await;
            if let Some(existing) = records.get_mut(&withholding_key) {
                existing.total_income += income;
                existing.amount_withheld += amount_withheld;
            } else {
                records.insert(withholding_key, withholding.clone());
            }
        }

        withholding
    }

    /// Export tax report to PDF/CSV
    pub fn export_report(&self, report: &TaxReport, format: ExportFormat) -> Vec<u8> {
        match format {
            ExportFormat::PDF => {
                // TODO: Integrate with PDF generation library
                // For now, return JSON representation
                serde_json::to_vec(report).map_err(|e| {
                    tracing::error!(error = %e, "CRITICAL: Failed to serialize tax report to JSON");
                    format!("Serialization error: {}", e)
                })?
            }
            ExportFormat::CSV => {
                // Generate CSV
                let mut csv = String::from("Date,Description,Amount,Currency,Type\n");
                for transaction in &report.transactions {
                    csv.push_str(&format!(
                        "{},{},{},{},{}\n",
                        transaction.date,
                        transaction.description,
                        transaction.amount,
                        transaction.currency,
                        format!("{:?}", transaction.transaction_type)
                    ));
                }
                csv.into_bytes()
            }
            ExportFormat::JSON => {
                serde_json::to_vec(report).map_err(|e| {
                    tracing::error!(error = %e, "CRITICAL: Failed to serialize tax report to JSON");
                    format!("Serialization error: {}", e)
                })?
            }
        }
    }

    /// Submit tax report to TaxJar or similar service
    pub async fn submit_to_tax_authority(&self, report: &TaxReport) -> Result<String, String> {
        // TODO: Integrate with TaxJar API
        // Example: taxjar_client.create_transaction(&transaction)
        
        println!("Submitting tax report for user {} year {} to tax authority", report.user_id, report.year);
        
        // Simulate submission
        Ok(format!("tax_report_{}_{}", report.user_id, report.year))
    }

    /// Get withholding summary for user
    pub async fn get_withholding_summary(&self, user_id: &str, year: i32) -> Option<TaxWithholding> {
        let withholding_key = format!("{}:{}", user_id, year);
        let records = self.withholding_records.read().await;
        records.get(&withholding_key).cloned()
    }
}

#[derive(Debug, Clone)]
pub enum ExportFormat {
    PDF,
    CSV,
    JSON,
}

impl Default for TaxReportingService {
    fn default() -> Self {
        Self::new()
    }
}

