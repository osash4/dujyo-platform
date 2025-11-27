// Gas Sponsorship Pool - Onboarding sin fricción
// Permite que ciertas transacciones sean patrocinadas (gratis) para nuevos usuarios

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SponsoredTxType {
    /// Primer NFT de un artista - 100% gratis
    FirstNFTArtist,
    /// Primer Stream-to-Earn - 100% gratis
    FirstStreamEarn,
    /// Primer perfil minteado - 100% gratis
    FirstProfileMint,
    /// Auto-claim de recompensas - 100% gratis
    AutoClaimRewards,
    /// Primer upload de contenido - 100% gratis
    FirstContentUpload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SponsorshipRules {
    /// Pool de fondos disponibles para sponsorship (en USD)
    pub pool_balance: f64,
    /// Transacciones que pueden ser patrocinadas
    pub sponsored_transactions: HashSet<SponsoredTxType>,
    /// Límite máximo por usuario (en USD)
    pub max_per_user: f64,
    /// Límite diario del pool (en USD)
    pub daily_limit: f64,
    /// Registro de usuarios que ya usaron sponsorship
    pub used_sponsorships: HashMap<String, Vec<SponsoredTxType>>,
    /// Registro de uso diario
    pub daily_usage: HashMap<String, f64>, // fecha -> cantidad usada
}

impl Default for SponsorshipRules {
    fn default() -> Self {
        let mut sponsored_transactions = HashSet::new();
        sponsored_transactions.insert(SponsoredTxType::FirstNFTArtist);
        sponsored_transactions.insert(SponsoredTxType::FirstStreamEarn);
        sponsored_transactions.insert(SponsoredTxType::FirstProfileMint);
        sponsored_transactions.insert(SponsoredTxType::AutoClaimRewards);
        sponsored_transactions.insert(SponsoredTxType::FirstContentUpload);
        
        Self {
            pool_balance: 10000.0, // $10,000 USD inicial
            sponsored_transactions,
            max_per_user: 50.0, // $50 USD máximo por usuario
            daily_limit: 1000.0, // $1,000 USD diario
            used_sponsorships: HashMap::new(),
            daily_usage: HashMap::new(),
        }
    }
}

impl SponsorshipRules {
    /// Verifica si una transacción puede ser patrocinada
    pub fn can_sponsor(
        &self,
        user_id: &str,
        tx_type: &SponsoredTxType,
        amount_usd: f64,
    ) -> bool {
        // Verificar que el tipo de transacción está en la lista de patrocinadas
        if !self.sponsored_transactions.contains(tx_type) {
            return false;
        }
        
        // Verificar que el usuario no haya usado este tipo de sponsorship antes
        if let Some(used) = self.used_sponsorships.get(user_id) {
            if used.contains(tx_type) {
                return false; // Ya usó este tipo de sponsorship
            }
        }
        
        // Verificar límite por usuario
        let user_total = self.get_user_total_sponsored(user_id);
        if user_total + amount_usd > self.max_per_user {
            return false;
        }
        
        // Verificar límite diario
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let daily_total = self.daily_usage.get(&today).copied().unwrap_or(0.0);
        if daily_total + amount_usd > self.daily_limit {
            return false;
        }
        
        // Verificar que hay fondos en el pool
        if amount_usd > self.pool_balance {
            return false;
        }
        
        true
    }
    
    /// Aplica sponsorship a una transacción
    pub fn apply_sponsorship(
        &mut self,
        user_id: &str,
        tx_type: &SponsoredTxType,
        amount_usd: f64,
    ) -> Result<f64, String> {
        if !self.can_sponsor(user_id, tx_type, amount_usd) {
            return Err("Cannot sponsor this transaction".to_string());
        }
        
        // Reducir balance del pool
        self.pool_balance -= amount_usd;
        
        // Registrar uso del usuario
        self.used_sponsorships
            .entry(user_id.to_string())
            .or_insert_with(Vec::new)
            .push(tx_type.clone());
        
        // Registrar uso diario
        let today = Utc::now().format("%Y-%m-%d").to_string();
        *self.daily_usage.entry(today).or_insert(0.0) += amount_usd;
        
        Ok(0.0) // Retorna 0 USD (gratis)
    }
    
    /// Obtiene el total patrocinado para un usuario
    pub fn get_user_total_sponsored(&self, user_id: &str) -> f64 {
        // En una implementación real, esto consultaría la base de datos
        // Por ahora, retornamos 0.0
        0.0
    }
    
    /// Recarga el pool con fondos adicionales
    pub fn top_up_pool(&mut self, amount: f64) {
        self.pool_balance += amount;
    }
    
    /// Resetea el uso diario (llamar al inicio de cada día)
    pub fn reset_daily_usage(&mut self) {
        self.daily_usage.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_first_nft_sponsorship() {
        let mut rules = SponsorshipRules::default();
        let user_id = "user123";
        let tx_type = SponsoredTxType::FirstNFTArtist;
        let amount = 0.05; // $0.05 USD
        
        assert!(rules.can_sponsor(user_id, &tx_type, amount));
        let result = rules.apply_sponsorship(user_id, &tx_type, amount);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0.0); // Gratis
    }
    
    #[test]
    fn test_cannot_sponsor_twice() {
        let mut rules = SponsorshipRules::default();
        let user_id = "user123";
        let tx_type = SponsoredTxType::FirstNFTArtist;
        let amount = 0.05;
        
        // Primera vez - OK
        assert!(rules.apply_sponsorship(user_id, &tx_type, amount).is_ok());
        
        // Segunda vez - NO
        assert!(!rules.can_sponsor(user_id, &tx_type, amount));
    }
}


