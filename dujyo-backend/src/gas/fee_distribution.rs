// Fee Distribution - Distribución inteligente de gas fees recaudados
// 40% Validators | 30% Treasury | 20% LPs | 10% Burn

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeDistribution {
    /// Porcentaje para validators (40%)
    pub validators_share: f64,
    /// Porcentaje para treasury (30%)
    pub treasury_share: f64,
    /// Porcentaje para liquidity pools (20%)
    pub liquidity_pools_share: f64,
    /// Porcentaje para burn (10%)
    pub burn_share: f64,
    /// Bonus adicional para validators creativos (sobre el share base)
    pub creative_validator_bonus: f64,
}

impl Default for FeeDistribution {
    fn default() -> Self {
        Self {
            validators_share: 0.40, // 40%
            treasury_share: 0.30,    // 30%
            liquidity_pools_share: 0.20, // 20%
            burn_share: 0.10,       // 10%
            creative_validator_bonus: 0.05, // 5% bonus adicional
        }
    }
}

impl FeeDistribution {
    /// Distribuye un fee recaudado según los porcentajes configurados
    pub fn distribute(&self, total_fee: f64) -> DistributionResult {
        let validators = total_fee * self.validators_share;
        let treasury = total_fee * self.treasury_share;
        let liquidity_pools = total_fee * self.liquidity_pools_share;
        let burn = total_fee * self.burn_share;
        
        DistributionResult {
            validators,
            treasury,
            liquidity_pools,
            burn,
            total: total_fee,
        }
    }
    
    /// Distribuye con bonus para validators creativos
    pub fn distribute_with_creative_bonus(
        &self,
        total_fee: f64,
        is_creative_validator: bool,
    ) -> DistributionResult {
        let mut result = self.distribute(total_fee);
        
        if is_creative_validator {
            // El bonus viene del share de treasury
            let bonus = total_fee * self.creative_validator_bonus;
            result.validators += bonus;
            result.treasury -= bonus;
        }
        
        result
    }
    
    /// Valida que los porcentajes sumen 100%
    pub fn validate(&self) -> Result<(), String> {
        let total = self.validators_share
            + self.treasury_share
            + self.liquidity_pools_share
            + self.burn_share;
        
        if (total - 1.0).abs() > 0.001 {
            return Err(format!(
                "Fee distribution percentages must sum to 1.0, got: {}",
                total
            ));
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionResult {
    pub validators: f64,
    pub treasury: f64,
    pub liquidity_pools: f64,
    pub burn: f64,
    pub total: f64,
}

impl DistributionResult {
    /// Verifica que la distribución sea correcta
    pub fn verify(&self) -> bool {
        let sum = self.validators
            + self.treasury
            + self.liquidity_pools
            + self.burn;
        
        (sum - self.total).abs() < 0.001
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_fee_distribution() {
        let dist = FeeDistribution::default();
        let result = dist.distribute(100.0);
        
        assert_eq!(result.validators, 40.0);
        assert_eq!(result.treasury, 30.0);
        assert_eq!(result.liquidity_pools, 20.0);
        assert_eq!(result.burn, 10.0);
        assert!(result.verify());
    }
    
    #[test]
    fn test_creative_validator_bonus() {
        let dist = FeeDistribution::default();
        let result = dist.distribute_with_creative_bonus(100.0, true);
        
        // Validators deberían tener 40 + 5 = 45
        assert_eq!(result.validators, 45.0);
        // Treasury debería tener 30 - 5 = 25
        assert_eq!(result.treasury, 25.0);
        assert!(result.verify());
    }
    
    #[test]
    fn test_validate_percentages() {
        let dist = FeeDistribution::default();
        assert!(dist.validate().is_ok());
    }
}


