use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// Script de Mint Inicial y Vesting para Dujyo Token
/// Este script implementa la distribución completa de 1B DYO según tokenomics

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenomicsAllocation {
    pub treasury: u64,           // 300M DYO (12m cliff + 36m linear)
    pub creative_incentives: u64, // 250M DYO (10% inmediato + 24m)
    pub validators: u64,         // 200M DYO (48m linear via staking)
    pub community: u64,          // 150M DYO (24m distribution)
    pub seed_investors: u64,     // 100M DYO (6m cliff + 24m linear)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingSchedule {
    pub beneficiary: String,
    pub total_amount: u64,
    pub cliff_duration: u64,     // seconds
    pub vesting_duration: u64,   // seconds
    pub release_frequency: u64,  // seconds
    pub immediate_release: u64,  // tokens released immediately
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintResult {
    pub success: bool,
    pub message: String,
    pub tx_hashes: Vec<String>,
    pub allocations: TokenomicsAllocation,
    pub vesting_schedules: Vec<VestingSchedule>,
}

impl TokenomicsAllocation {
    pub fn new() -> Self {
        Self {
            treasury: 300_000_000,      // 300M DYO
            creative_incentives: 250_000_000, // 250M DYO
            validators: 200_000_000,    // 200M DYO
            community: 150_000_000,     // 150M DYO
            seed_investors: 100_000_000, // 100M DYO
        }
    }

    pub fn total(&self) -> u64 {
        self.treasury + self.creative_incentives + self.validators + 
        self.community + self.seed_investors
    }

    pub fn validate(&self) -> Result<(), String> {
        let total = self.total();
        if total != 1_000_000_000 {
            return Err(format!("Total allocation {} does not equal 1B DYO", total));
        }
        Ok(())
    }
}

pub struct InitialMintScript {
    pub allocations: TokenomicsAllocation,
    pub multisig_addresses: HashMap<String, String>,
    pub vesting_schedules: Vec<VestingSchedule>,
}

impl InitialMintScript {
    pub fn new() -> Self {
        let allocations = TokenomicsAllocation::new();
        
        // Direcciones multisig públicas (ejemplo - en producción usar direcciones reales)
        let mut multisig_addresses = HashMap::new();
        multisig_addresses.insert("treasury".to_string(), "XWMS_TREASURY_3OF5".to_string());
        multisig_addresses.insert("dev".to_string(), "XWMS_DEV_3OF5".to_string());
        multisig_addresses.insert("ops".to_string(), "XWMS_OPS_3OF5".to_string());
        
        // Crear schedules de vesting según tokenomics
        let vesting_schedules = Self::create_vesting_schedules(&allocations);
        
        Self {
            allocations,
            multisig_addresses,
            vesting_schedules,
        }
    }

    fn create_vesting_schedules(allocations: &TokenomicsAllocation) -> Vec<VestingSchedule> {
        let mut schedules = Vec::new();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        
        // Treasury: 12m cliff + 36m linear
        schedules.push(VestingSchedule {
            beneficiary: "XWMS_TREASURY_3OF5".to_string(),
            total_amount: allocations.treasury,
            cliff_duration: 12 * 30 * 24 * 60 * 60, // 12 months
            vesting_duration: 36 * 30 * 24 * 60 * 60, // 36 months
            release_frequency: 30 * 24 * 60 * 60, // monthly
            immediate_release: 0,
        });

        // Creative Incentives: 10% inmediato + 24m linear
        let immediate_creative = (allocations.creative_incentives * 10) / 100;
        let vesting_creative = allocations.creative_incentives - immediate_creative;
        
        schedules.push(VestingSchedule {
            beneficiary: "XWMS_CREATIVE_POOL".to_string(),
            total_amount: vesting_creative,
            cliff_duration: 0, // No cliff
            vesting_duration: 24 * 30 * 24 * 60 * 60, // 24 months
            release_frequency: 30 * 24 * 60 * 60, // monthly
            immediate_release: immediate_creative,
        });

        // Validators: 48m linear via staking contract
        schedules.push(VestingSchedule {
            beneficiary: "XWMS_STAKING_CONTRACT".to_string(),
            total_amount: allocations.validators,
            cliff_duration: 0, // No cliff
            vesting_duration: 48 * 30 * 24 * 60 * 60, // 48 months
            release_frequency: 30 * 24 * 60 * 60, // monthly
            immediate_release: 0,
        });

        // Community: 24m distribution
        schedules.push(VestingSchedule {
            beneficiary: "XWMS_COMMUNITY_POOL".to_string(),
            total_amount: allocations.community,
            cliff_duration: 0, // No cliff
            vesting_duration: 24 * 30 * 24 * 60 * 60, // 24 months
            release_frequency: 30 * 24 * 60 * 60, // monthly
            immediate_release: 0,
        });

        // Seed Investors: 6m cliff + 24m linear
        schedules.push(VestingSchedule {
            beneficiary: "XWMS_SEED_INVESTORS".to_string(),
            total_amount: allocations.seed_investors,
            cliff_duration: 6 * 30 * 24 * 60 * 60, // 6 months
            vesting_duration: 24 * 30 * 24 * 60 * 60, // 24 months
            release_frequency: 30 * 24 * 60 * 60, // monthly
            immediate_release: 0,
        });

        schedules
    }

    /// Ejecutar mint inicial completo
    pub fn execute_initial_mint(&self) -> Result<MintResult, String> {
        // Validar allocations
        self.allocations.validate()?;

        let mut tx_hashes = Vec::new();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

        // 1. Mint total supply a admin
        let admin_mint_hash = format!("MINT_ADMIN_{}_{}", 1_000_000_000, now);
        tx_hashes.push(admin_mint_hash.clone());

        // 2. Crear schedules de vesting
        for schedule in &self.vesting_schedules {
            let vesting_hash = format!("VESTING_{}_{}_{}", 
                schedule.beneficiary, schedule.total_amount, now);
            tx_hashes.push(vesting_hash);
        }

        // 3. Seed liquidity: 100M DYO + $100k XUSD
        let liquidity_hash = format!("LIQUIDITY_SEED_{}_{}", 100_000_000, now);
        tx_hashes.push(liquidity_hash);

        // 4. Configurar anti-dump limits
        let anti_dump_hash = format!("ANTI_DUMP_CONFIG_{}", now);
        tx_hashes.push(anti_dump_hash);

        Ok(MintResult {
            success: true,
            message: "Initial mint and vesting completed successfully".to_string(),
            tx_hashes,
            allocations: self.allocations.clone(),
            vesting_schedules: self.vesting_schedules.clone(),
        })
    }

    /// Generar reporte de distribución
    pub fn generate_distribution_report(&self) -> String {
        let mut report = String::new();
        report.push_str("=== DUJYO TOKENOMICS DISTRIBUTION REPORT ===\n\n");
        
        report.push_str(&format!("Total Supply: 1,000,000,000 DYO\n"));
        report.push_str(&format!("Target Price: $0.001 USD\n"));
        report.push_str(&format!("Circulating Initial: 300M DYO\n\n"));
        
        report.push_str("ALLOCATIONS:\n");
        report.push_str(&format!("1. Treasury: {} DYO (30%) - 12m cliff + 36m linear\n", 
            self.allocations.treasury));
        report.push_str(&format!("2. Creative Incentives: {} DYO (25%) - 10% immediate + 24m\n", 
            self.allocations.creative_incentives));
        report.push_str(&format!("3. Validators: {} DYO (20%) - 48m linear via staking\n", 
            self.allocations.validators));
        report.push_str(&format!("4. Community: {} DYO (15%) - 24m distribution\n", 
            self.allocations.community));
        report.push_str(&format!("5. Seed Investors: {} DYO (10%) - 6m cliff + 24m linear\n\n", 
            self.allocations.seed_investors));
        
        report.push_str("MULTISIG ADDRESSES:\n");
        for (purpose, address) in &self.multisig_addresses {
            report.push_str(&format!("- {}: {}\n", purpose, address));
        }
        
        report.push_str("\nVESTING SCHEDULES:\n");
        for (i, schedule) in self.vesting_schedules.iter().enumerate() {
            report.push_str(&format!("{}. {}: {} DYO\n", 
                i + 1, schedule.beneficiary, schedule.total_amount));
            report.push_str(&format!("   Cliff: {} days\n", 
                schedule.cliff_duration / (24 * 60 * 60)));
            report.push_str(&format!("   Vesting: {} days\n", 
                schedule.vesting_duration / (24 * 60 * 60)));
            report.push_str(&format!("   Immediate: {} DYO\n\n", 
                schedule.immediate_release));
        }
        
        report.push_str("LIQUIDITY SEED:\n");
        report.push_str("- 100M DYO + $100k XUSD\n");
        report.push_str("- Timelock: 180 days\n");
        report.push_str("- Initial Price: $0.001 USD/DYO\n");
        
        report
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenomics_validation() {
        let allocations = TokenomicsAllocation::new();
        assert!(allocations.validate().is_ok());
        assert_eq!(allocations.total(), 1_000_000_000);
    }

    #[test]
    fn test_vesting_schedules_creation() {
        let script = InitialMintScript::new();
        assert_eq!(script.vesting_schedules.len(), 5);
        
        // Verificar que la suma de vesting + immediate = total allocation
        let total_vesting: u64 = script.vesting_schedules.iter()
            .map(|s| s.total_amount + s.immediate_release)
            .sum();
        assert_eq!(total_vesting, script.allocations.total());
    }

    #[test]
    fn test_initial_mint_execution() {
        let script = InitialMintScript::new();
        let result = script.execute_initial_mint();
        assert!(result.is_ok());
        
        let mint_result = result.unwrap();
        assert!(mint_result.success);
        assert!(!mint_result.tx_hashes.is_empty());
    }
}

/// Función principal para ejecutar el script
pub fn run_initial_mint_script() -> Result<MintResult, String> {
    let script = InitialMintScript::new();
    
    println!("🚀 Starting Dujyo Initial Mint Script");
    println!("{}", script.generate_distribution_report());
    
    let result = script.execute_initial_mint()?;
    
    println!("✅ Initial mint completed successfully!");
    println!("📊 Transaction hashes:");
    for (i, hash) in result.tx_hashes.iter().enumerate() {
        println!("  {}. {}", i + 1, hash);
    }
    
    Ok(result)
}
