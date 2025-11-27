use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KycRequest {
    pub user_id: String,
    pub verification_level: VerificationLevel,
    pub personal_info: PersonalInfo,
    pub documents: Vec<DocumentInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VerificationLevel {
    Basic,      // Email/Phone verification
    Standard,   // ID verification
    Enhanced,   // Full KYC/AML
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalInfo {
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: String,
    pub nationality: String,
    pub address: Address,
    pub phone: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    pub street: String,
    pub city: String,
    pub state: String,
    pub zip_code: String,
    pub country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentInfo {
    pub document_type: DocumentType,
    pub document_number: String,
    pub country: String,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DocumentType {
    Passport,
    DriversLicense,
    NationalId,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KycStatus {
    pub user_id: String,
    pub verification_id: String,
    pub status: KycStatusType,
    pub level: VerificationLevel,
    pub verified_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub aml_check: AmlCheckResult,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KycStatusType {
    Pending,
    Processing,
    Verified,
    Rejected,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmlCheckResult {
    pub checked: bool,
    pub passed: bool,
    pub checked_at: Option<DateTime<Utc>>,
    pub risk_level: RiskLevel,
    pub sanctions_match: bool,
    pub pep_match: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

// ============================================================================
// KYC SERVICE
// ============================================================================

pub struct KycService {
    // In production, this would integrate with Sumsub or similar KYC provider
    verifications: std::sync::Arc<tokio::sync::RwLock<std::collections::HashMap<String, KycStatus>>>,
}

impl KycService {
    pub fn new() -> Self {
        Self {
            verifications: std::sync::Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Initiate KYC verification
    pub async fn initiate_verification(&self, request: KycRequest) -> Result<String, String> {
        // Validate request
        self.validate_request(&request)?;

        // Create verification ID
        let verification_id = Uuid::new_v4().to_string();

        // Create initial status
        let status = KycStatus {
            user_id: request.user_id.clone(),
            verification_id: verification_id.clone(),
            status: KycStatusType::Pending,
            level: request.verification_level.clone(),
            verified_at: None,
            expires_at: Some(Utc::now() + chrono::Duration::days(365)), // 1 year validity
            rejection_reason: None,
            aml_check: AmlCheckResult {
                checked: false,
                passed: false,
                checked_at: None,
                risk_level: RiskLevel::Low,
                sanctions_match: false,
                pep_match: false,
            },
        };

        // Store verification
        {
            let mut verifications = self.verifications.write().await;
            verifications.insert(request.user_id.clone(), status);
        }

        // TODO: Submit to Sumsub API
        // Example: sumsub_client.create_applicant(&applicant_data)
        println!("Initiating KYC verification for user {}", request.user_id);

        // Process verification
        self.process_verification(&verification_id, &request).await;

        Ok(verification_id)
    }

    /// Validate KYC request
    fn validate_request(&self, request: &KycRequest) -> Result<(), String> {
        // Validate email
        if !request.personal_info.email.contains('@') {
            return Err("Invalid email address".to_string());
        }

        // Validate phone
        if request.personal_info.phone.len() < 10 {
            return Err("Invalid phone number".to_string());
        }

        // Validate required documents
        if request.documents.is_empty() {
            return Err("At least one document is required".to_string());
        }

        Ok(())
    }

    /// Process KYC verification
    async fn process_verification(&self, verification_id: &str, request: &KycRequest) {
        // Simulate async processing
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Update status to processing
        {
            let mut verifications = self.verifications.write().await;
            if let Some(status) = verifications.get_mut(&request.user_id) {
                status.status = KycStatusType::Processing;
            }
        }

        // Perform AML check
        let aml_result = self.perform_aml_check(&request.personal_info).await;

        // Simulate verification processing
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

        // Update final status
        {
            let mut verifications = self.verifications.write().await;
            if let Some(status) = verifications.get_mut(&request.user_id) {
                if aml_result.passed && !aml_result.sanctions_match && !aml_result.pep_match {
                    status.status = KycStatusType::Verified;
                    status.verified_at = Some(Utc::now());
                } else {
                    status.status = KycStatusType::Rejected;
                    status.rejection_reason = Some("AML check failed or sanctions match".to_string());
                }
                status.aml_check = aml_result;
            }
        }
    }

    /// Perform AML (Anti-Money Laundering) check
    async fn perform_aml_check(&self, personal_info: &PersonalInfo) -> AmlCheckResult {
        // TODO: Integrate with AML service provider
        // Check against sanctions lists, PEP lists, etc.
        
        println!("Performing AML check for {} {}", personal_info.first_name, personal_info.last_name);

        // Simulate check
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

        // For demo purposes, assume check passes
        AmlCheckResult {
            checked: true,
            passed: true,
            checked_at: Some(Utc::now()),
            risk_level: RiskLevel::Low,
            sanctions_match: false,
            pep_match: false,
        }
    }

    /// Get KYC status for user
    pub async fn get_verification_status(&self, user_id: &str) -> Option<KycStatus> {
        let verifications = self.verifications.read().await;
        verifications.get(user_id).cloned()
    }

    /// Check if user is verified
    pub async fn is_verified(&self, user_id: &str) -> bool {
        if let Some(status) = self.get_verification_status(user_id).await {
            matches!(status.status, KycStatusType::Verified)
                && status.expires_at.map_or(false, |expires| expires > Utc::now())
        } else {
            false
        }
    }

    /// Update verification status (called by webhook from KYC provider)
    pub async fn update_verification_status(
        &self,
        verification_id: &str,
        status: KycStatusType,
        rejection_reason: Option<String>,
    ) -> Result<(), String> {
        let mut verifications = self.verifications.write().await;
        
        // Find verification by ID
        for (_user_id, verification) in verifications.iter_mut() {
            if verification.verification_id == verification_id {
                let new_status = status.clone();
                verification.status = new_status.clone();
                if matches!(new_status, KycStatusType::Verified) {
                    verification.verified_at = Some(Utc::now());
                }
                verification.rejection_reason = rejection_reason;
                return Ok(());
            }
        }

        Err("Verification not found".to_string())
    }

    /// Get verification level required for operation
    pub fn get_required_level(&self, operation: &str) -> VerificationLevel {
        match operation {
            "withdrawal" => VerificationLevel::Enhanced,
            "large_transaction" => VerificationLevel::Standard,
            _ => VerificationLevel::Basic,
        }
    }
}

impl Default for KycService {
    fn default() -> Self {
        Self::new()
    }
}

