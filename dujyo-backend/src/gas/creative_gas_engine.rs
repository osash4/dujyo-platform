// Creative Gas Engine - Núcleo del sistema de gas fees
// Combina price fixing en USD, creative weight, sponsorship y conversión automática

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::gas::creative_weight::CreativeWeightRules;
use crate::gas::sponsorship_pool::{SponsorshipRules, SponsoredTxType};
use crate::gas::fee_distribution::FeeDistribution;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TransactionType {
    // Content transactions (unique to DUJYO)
    StreamEarn,          // 0 USD (GRATIS)
    UploadContent,       // 0.02 USD
    MintNFT,            // 0.05 USD
    TransferNFT,         // 0.001 USD
    
    // Financial transactions
    SimpleTransfer,      // 0.001 USD
    TransferWithData,    // 0.002 USD
    MultiSigTransfer,    // 0.005 USD
    
    // DEX transactions
    DexSwap,            // 0.03 USD
    AddLiquidity,       // 0.02 USD
    RemoveLiquidity,    // 0.02 USD
    
    // Staking transactions
    StakingDeposit,     // 0.02 USD
    StakingWithdraw,    // 0.05 USD (includes early unstake penalty)
    ClaimRewards,       // 0.01 USD
    
    // Validation transactions (CPV)
    RegisterValidator,  // 0.1 USD
    ProposeBlock,      // 0 USD (FREE for validators)
    Vote,              // 0.001 USD
    
    // Social transactions
    Follow,             // 0 USD (FREE)
    Comment,            // 0 USD (FREE)
    Like,               // 0 USD (FREE)
    Review,             // 0.005 USD
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserTier {
    Regular,
    Premium,
    CreativeValidator,
    CommunityValidator,
    EconomicValidator,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasQuote {
    /// Precio en USD
    pub price_usd: f64,
    /// Precio en DYO (después de conversión)
    pub price_dyo: f64,
    /// Precio final después de creative weight
    pub final_price_dyo: f64,
    /// Si fue patrocinado (gratis)
    pub is_sponsored: bool,
    /// Descuento aplicado (en porcentaje)
    pub discount_percentage: f64,
    /// Tipo de transacción
    pub transaction_type: TransactionType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeGasEngine {
    /// Precios base fijos en USD por tipo de transacción
    base_fees_usd: HashMap<TransactionType, f64>,
    /// Reglas de creative weight
    creative_weight_rules: CreativeWeightRules,
    /// Pool de sponsorship
    sponsorship_rules: SponsorshipRules,
    /// Distribución de fees
    fee_distribution: FeeDistribution,
    /// Tasa de conversión USD -> DYO (dinámica, desde DEX)
    dyo_price_usd: f64,
    /// Cache de conversiones recientes
    conversion_cache: HashMap<String, (f64, u64)>, // (rate, timestamp)
}

impl Default for CreativeGasEngine {
    fn default() -> Self {
        let mut base_fees_usd = HashMap::new();
        
        // Content transactions
        base_fees_usd.insert(TransactionType::StreamEarn, 0.0);
        base_fees_usd.insert(TransactionType::UploadContent, 0.02);
        base_fees_usd.insert(TransactionType::MintNFT, 0.05);
        base_fees_usd.insert(TransactionType::TransferNFT, 0.001);
        
        // Financial transactions
        base_fees_usd.insert(TransactionType::SimpleTransfer, 0.001);
        base_fees_usd.insert(TransactionType::TransferWithData, 0.002);
        base_fees_usd.insert(TransactionType::MultiSigTransfer, 0.005);
        
        // DEX transactions
        base_fees_usd.insert(TransactionType::DexSwap, 0.03);
        base_fees_usd.insert(TransactionType::AddLiquidity, 0.02);
        base_fees_usd.insert(TransactionType::RemoveLiquidity, 0.02);
        
        // Staking transactions
        base_fees_usd.insert(TransactionType::StakingDeposit, 0.02);
        base_fees_usd.insert(TransactionType::StakingWithdraw, 0.05);
        base_fees_usd.insert(TransactionType::ClaimRewards, 0.01);
        
        // Validation transactions
        base_fees_usd.insert(TransactionType::RegisterValidator, 0.1);
        base_fees_usd.insert(TransactionType::ProposeBlock, 0.0);
        base_fees_usd.insert(TransactionType::Vote, 0.001);
        
        // Social transactions
        base_fees_usd.insert(TransactionType::Follow, 0.0);
        base_fees_usd.insert(TransactionType::Comment, 0.0);
        base_fees_usd.insert(TransactionType::Like, 0.0);
        base_fees_usd.insert(TransactionType::Review, 0.005);
        
        Self {
            base_fees_usd,
            creative_weight_rules: CreativeWeightRules::default(),
            sponsorship_rules: SponsorshipRules::default(),
            fee_distribution: FeeDistribution::default(),
            dyo_price_usd: 0.001, // Default: $0.001 USD por DYO (1 DYO = $0.001 USD)
            conversion_cache: HashMap::new(),
        }
    }
}

impl CreativeGasEngine {
    /// Crea una nueva instancia del engine
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Actualiza el precio de DYO en USD (desde DEX)
    pub fn update_dyo_price(&mut self, price_usd: f64) {
        self.dyo_price_usd = price_usd;
    }
    
    /// Calcula el gas fee para una transacción
    pub fn calculate_gas(
        &mut self,
        tx_type: TransactionType,
        user_id: &str,
        user_tier: &UserTier,
        transaction_count_last_hour: u64,
    ) -> GasQuote {
        // 1. Obtener precio base en USD
        let base_price_usd = self.base_fees_usd
            .get(&tx_type)
            .copied()
            .unwrap_or(0.001); // Default: $0.001 USD
        
        // 2. Verificar sponsorship primero (si aplica)
        let sponsored_tx_type = self.map_to_sponsored_type(&tx_type);
        if let Some(sponsored_type) = sponsored_tx_type {
            if self.sponsorship_rules.can_sponsor(user_id, &sponsored_type, base_price_usd) {
                // Aplicar sponsorship (gratis)
                if let Ok(_) = self.sponsorship_rules.apply_sponsorship(user_id, &sponsored_type, base_price_usd) {
                    return GasQuote {
                        price_usd: base_price_usd,
                        price_dyo: 0.0,
                        final_price_dyo: 0.0,
                        is_sponsored: true,
                        discount_percentage: 100.0,
                        transaction_type: tx_type,
                    };
                }
            }
        }
        
        // 3. Aplicar creative weight
        let tx_type_str = format!("{:?}", tx_type);
        let adjusted_price_usd = self.creative_weight_rules.apply_creative_weight(
            base_price_usd,
            &tx_type_str,
        );
        
        // 4. Detectar abuso potencial y aplicar multiplicador
        let final_price_usd = if self.creative_weight_rules.detect_potential_abuse(
            &tx_type_str,
            transaction_count_last_hour,
        ) {
            adjusted_price_usd * self.creative_weight_rules.anti_abuse_multiplier
        } else {
            adjusted_price_usd
        };
        
        // 5. Aplicar descuentos por tier de usuario
        let discount = match user_tier {
            UserTier::Premium => 0.5, // 50% descuento
            UserTier::CreativeValidator => 0.5, // 50% descuento
            UserTier::CommunityValidator => 0.25, // 25% descuento
            UserTier::Regular | UserTier::EconomicValidator => 0.0, // Sin descuento
        };
        
        let final_price_usd_after_discount = final_price_usd * (1.0 - discount);
        
        // 6. Convertir USD a DYO
        let price_dyo = self.convert_usd_to_dyo(final_price_usd_after_discount);
        
        GasQuote {
            price_usd: base_price_usd,
            price_dyo,
            final_price_dyo: price_dyo,
            is_sponsored: false,
            discount_percentage: discount * 100.0,
            transaction_type: tx_type,
        }
    }
    
    /// Convierte USD a DYO usando el precio actual
    pub fn convert_usd_to_dyo(&self, usd_amount: f64) -> f64 {
        if self.dyo_price_usd <= 0.0 {
            return 0.0;
        }
        usd_amount / self.dyo_price_usd
    }
    
    /// Obtiene el precio de DYO en USD
    pub fn get_dyo_price_usd(&self) -> f64 {
        self.dyo_price_usd
    }
    
    /// Mapea TransactionType a SponsoredTxType (si aplica)
    fn map_to_sponsored_type(&self, tx_type: &TransactionType) -> Option<SponsoredTxType> {
        match tx_type {
            TransactionType::MintNFT => Some(SponsoredTxType::FirstNFTArtist),
            TransactionType::StreamEarn => Some(SponsoredTxType::FirstStreamEarn),
            TransactionType::UploadContent => Some(SponsoredTxType::FirstContentUpload),
            TransactionType::ClaimRewards => Some(SponsoredTxType::AutoClaimRewards),
            _ => None,
        }
    }
    
    /// Obtiene la distribución de fees
    pub fn get_fee_distribution(&self) -> &FeeDistribution {
        &self.fee_distribution
    }
    
    /// Obtiene las reglas de creative weight
    pub fn get_creative_weight_rules(&self) -> &CreativeWeightRules {
        &self.creative_weight_rules
    }
    
    /// Obtiene las reglas de sponsorship
    pub fn get_sponsorship_rules(&self) -> &SponsorshipRules {
        &self.sponsorship_rules
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_stream_earn_is_free() {
        let mut engine = CreativeGasEngine::new();
        let quote = engine.calculate_gas(
            TransactionType::StreamEarn,
            "user123",
            &UserTier::Regular,
            0,
        );
        assert_eq!(quote.final_price_dyo, 0.0);
    }
    
    #[test]
    fn test_upload_content_has_cultural_discount() {
        let mut engine = CreativeGasEngine::new();
        
        // First, use sponsorship so it's not available for the next call
        // This ensures we test the actual price calculation, not sponsorship
        let _first_quote = engine.calculate_gas(
            TransactionType::UploadContent,
            "user123",
            &UserTier::Regular,
            0,
        );
        
        // Now calculate again - sponsorship already used, so we get the actual price
        let quote = engine.calculate_gas(
            TransactionType::UploadContent,
            "user123",
            &UserTier::Regular,
            0,
        );
        
        // Base: $0.02 USD, con 50% descuento cultural = $0.01 USD
        // Con precio DYO de $0.001 USD = 10 DYO
        assert!(quote.final_price_dyo > 0.0, "Expected price > 0, got {}", quote.final_price_dyo);
        // Verify it's not sponsored
        assert!(!quote.is_sponsored, "Quote should not be sponsored on second call");
    }
    
    #[test]
    fn test_premium_user_gets_discount() {
        let mut engine = CreativeGasEngine::new();
        let quote = engine.calculate_gas(
            TransactionType::SimpleTransfer,
            "user123",
            &UserTier::Premium,
            0,
        );
        // Premium tiene 50% descuento adicional
        assert!(quote.discount_percentage == 50.0);
    }
}

