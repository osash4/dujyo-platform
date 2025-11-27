// Creative Weight System - Sistema de descuentos basado en tipo de contenido
// Ventaja competitiva: contenido cultural tiene descuentos significativos

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ContentType {
    /// Contenido cultural (música, arte, NFTs artísticos) - 50% descuento
    Cultural,
    /// Transacciones normales (transfers, staking) - precio normal
    Normal,
    /// Actividad potencialmente abusiva (bulk uploads, bot activity) - 500% aumento
    PotentialAbuse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeWeightRules {
    /// Multiplicador para contenido cultural (0.5 = 50% descuento)
    pub cultural_content_multiplier: f64,
    /// Multiplicador para transacciones normales (1.0 = precio normal)
    pub normal_transactions_multiplier: f64,
    /// Multiplicador para actividad potencialmente abusiva (5.0 = 500% aumento)
    pub anti_abuse_multiplier: f64,
    /// Mapeo de tipos de transacción a tipo de contenido
    pub transaction_content_map: HashMap<String, ContentType>,
}

impl Default for CreativeWeightRules {
    fn default() -> Self {
        let mut transaction_content_map = HashMap::new();
        
        // Contenido cultural - descuentos
        transaction_content_map.insert("UploadContent".to_string(), ContentType::Cultural);
        transaction_content_map.insert("MintNFT".to_string(), ContentType::Cultural);
        transaction_content_map.insert("StreamEarn".to_string(), ContentType::Cultural);
        transaction_content_map.insert("Comment".to_string(), ContentType::Cultural);
        transaction_content_map.insert("Review".to_string(), ContentType::Cultural);
        
        // Transacciones normales
        transaction_content_map.insert("SimpleTransfer".to_string(), ContentType::Normal);
        transaction_content_map.insert("DexSwap".to_string(), ContentType::Normal);
        transaction_content_map.insert("StakingDeposit".to_string(), ContentType::Normal);
        transaction_content_map.insert("StakingWithdraw".to_string(), ContentType::Normal);
        
        Self {
            cultural_content_multiplier: 0.5, // 50% descuento
            normal_transactions_multiplier: 1.0, // Precio normal
            anti_abuse_multiplier: 5.0, // 500% aumento
            transaction_content_map,
        }
    }
}

impl CreativeWeightRules {
    /// Aplica el multiplicador de creative weight a un precio base
    pub fn apply_creative_weight(&self, base_price: f64, transaction_type: &str) -> f64 {
        let content_type = self.transaction_content_map
            .get(transaction_type)
            .unwrap_or(&ContentType::Normal);
        
        let multiplier = match content_type {
            ContentType::Cultural => self.cultural_content_multiplier,
            ContentType::Normal => self.normal_transactions_multiplier,
            ContentType::PotentialAbuse => self.anti_abuse_multiplier,
        };
        
        base_price * multiplier
    }
    
    /// Detecta si una transacción es potencialmente abusiva
    pub fn detect_potential_abuse(&self, transaction_type: &str, count_last_hour: u64) -> bool {
        // Si hay más de 100 transacciones del mismo tipo en la última hora, es potencial abuso
        if count_last_hour > 100 {
            return true;
        }
        
        // Transacciones específicas que son más propensas a abuso
        matches!(
            transaction_type,
            "UploadContent" | "MintNFT" | "SimpleTransfer"
        ) && count_last_hour > 50
    }
    
    /// Obtiene el tipo de contenido para una transacción
    pub fn get_content_type(&self, transaction_type: &str) -> &ContentType {
        self.transaction_content_map
            .get(transaction_type)
            .unwrap_or(&ContentType::Normal)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_cultural_content_discount() {
        let rules = CreativeWeightRules::default();
        let base_price = 1.0;
        let adjusted = rules.apply_creative_weight(base_price, "UploadContent");
        assert_eq!(adjusted, 0.5); // 50% descuento
    }
    
    #[test]
    fn test_normal_transaction_no_discount() {
        let rules = CreativeWeightRules::default();
        let base_price = 1.0;
        let adjusted = rules.apply_creative_weight(base_price, "SimpleTransfer");
        assert_eq!(adjusted, 1.0); // Sin descuento
    }
}


