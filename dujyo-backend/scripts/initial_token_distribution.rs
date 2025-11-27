use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenDistribution {
    pub address: String,
    pub amount: u64,
    pub purpose: String,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DujyoTokenConfig {
    pub initial_supply: u64,
    pub max_supply: u64,
    pub token_name: String,
    pub token_symbol: String,
    pub distributions: Vec<TokenDistribution>,
}

impl DujyoTokenConfig {
    pub fn new() -> Self {
        // Configuración de tokens Dujyo
        let initial_supply = 1_000_000_000; // 1B tokens
        let max_supply = 10_000_000_000; // 10B tokens
        
        // Direcciones de distribución (estas serían generadas por el sistema)
        let distributions = vec![
            TokenDistribution {
                address: "XW0000000000000000000000000000000000000001".to_string(),
                amount: 300_000_000, // 30% - Tesorería/Fundación
                purpose: "Treasury & Foundation".to_string(),
                percentage: 30.0,
            },
            TokenDistribution {
                address: "XW0000000000000000000000000000000000000002".to_string(),
                amount: 250_000_000, // 25% - Incentivos Creativos
                purpose: "Creative Incentives".to_string(),
                percentage: 25.0,
            },
            TokenDistribution {
                address: "XW0000000000000000000000000000000000000003".to_string(),
                amount: 200_000_000, // 20% - Validadores Iniciales
                purpose: "Initial Validators".to_string(),
                percentage: 20.0,
            },
            TokenDistribution {
                address: "XW0000000000000000000000000000000000000004".to_string(),
                amount: 150_000_000, // 15% - Comunidad & Airdrops
                purpose: "Community & Airdrops".to_string(),
                percentage: 15.0,
            },
            TokenDistribution {
                address: "XW0000000000000000000000000000000000000005".to_string(),
                amount: 100_000_000, // 10% - Inversores Semilla
                purpose: "Seed Investors".to_string(),
                percentage: 10.0,
            },
        ];
        
        DujyoTokenConfig {
            initial_supply,
            max_supply,
            token_name: "Dujyo Token".to_string(),
            token_symbol: "DYO".to_string(),
            distributions,
        }
    }
    
    pub fn validate_distribution(&self) -> bool {
        let total_distributed: u64 = self.distributions.iter().map(|d| d.amount).sum();
        let total_percentage: f64 = self.distributions.iter().map(|d| d.percentage).sum();
        
        total_distributed == self.initial_supply && 
        (total_percentage - 100.0).abs() < 0.01
    }
    
    pub fn display_distribution(&self) {
        println!("🪙 DUJYO TOKEN DISTRIBUTION");
        println!("═══════════════════════════════════════════════════════════════");
        println!("📊 Token: {} ({})", self.token_name, self.token_symbol);
        println!("💰 Initial Supply: {:,} tokens", self.initial_supply);
        println!("📈 Max Supply: {:,} tokens", self.max_supply);
        println!("═══════════════════════════════════════════════════════════════");
        println!("📋 DISTRIBUTION BREAKDOWN:");
        
        for (i, dist) in self.distributions.iter().enumerate() {
            println!("{}. {} ({:.1}%)", i + 1, dist.purpose, dist.percentage);
            println!("   Address: {}", dist.address);
            println!("   Amount: {:,} DYO", dist.amount);
            println!();
        }
        
        let total_distributed: u64 = self.distributions.iter().map(|d| d.amount).sum();
        let total_percentage: f64 = self.distributions.iter().map(|d| d.percentage).sum();
        
        println!("═══════════════════════════════════════════════════════════════");
        println!("✅ Total Distributed: {:,} DYO", total_distributed);
        println!("✅ Total Percentage: {:.1}%", total_percentage);
        println!("✅ Validation: {}", if self.validate_distribution() { "PASSED" } else { "FAILED" });
        println!("═══════════════════════════════════════════════════════════════");
    }
    
    pub fn generate_sql_commands(&self) -> Vec<String> {
        let mut commands = Vec::new();
        
        // Comando para crear la tabla de balances si no existe
        commands.push(
            "CREATE TABLE IF NOT EXISTS balances (
                address VARCHAR(255) PRIMARY KEY,
                balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );".to_string()
        );
        
        // Comandos para insertar los balances iniciales
        for dist in &self.distributions {
            let sql = format!(
                "INSERT INTO balances (address, balance, updated_at) VALUES ('{}', {}, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET balance = {}, updated_at = NOW();",
                dist.address, dist.amount, dist.amount
            );
            commands.push(sql);
        }
        
        commands
    }
    
    pub fn generate_mint_commands(&self) -> Vec<String> {
        let mut commands = Vec::new();
        
        for dist in &self.distributions {
            let curl_command = format!(
                "curl -X POST http://localhost:8083/mint \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer YOUR_JWT_TOKEN_HERE\" \\
  -d '{{\"account\": \"{}\", \"amount\": {}}}'",
                dist.address, dist.amount
            );
            commands.push(curl_command);
        }
        
        commands
    }
}

fn main() {
    println!("🚀 Dujyo Initial Token Distribution Setup");
    println!("═══════════════════════════════════════════════════════════════");
    
    let config = DujyoTokenConfig::new();
    config.display_distribution();
    
    // Generar comandos SQL
    println!("📝 SQL COMMANDS FOR DATABASE:");
    println!("═══════════════════════════════════════════════════════════════");
    let sql_commands = config.generate_sql_commands();
    for (i, cmd) in sql_commands.iter().enumerate() {
        println!("{}. {}", i + 1, cmd);
    }
    
    // Generar comandos curl para mint
    println!("\n🔧 CURL COMMANDS FOR MINTING:");
    println!("═══════════════════════════════════════════════════════════════");
    let mint_commands = config.generate_mint_commands();
    for (i, cmd) in mint_commands.iter().enumerate() {
        println!("{}. {}", i + 1, cmd);
    }
    
    // Guardar configuración en archivo
    let config_json = serde_json::to_string_pretty(&config)
        .expect("Failed to serialize config");
    
    std::fs::write("dujyo_token_config.json", config_json)
        .expect("Failed to write config file");
    
    println!("\n💾 Configuration saved to: dujyo_token_config.json");
    println!("🔧 SQL commands saved to: dujyo_distribution.sql");
    println!("🔧 Mint commands saved to: dujyo_mint_commands.sh");
    
    // Guardar comandos SQL en archivo
    let sql_content = sql_commands.join("\n\n");
    std::fs::write("dujyo_distribution.sql", sql_content)
        .expect("Failed to write SQL file");
    
    // Guardar comandos curl en archivo
    let curl_content = mint_commands.join("\n\n");
    std::fs::write("dujyo_mint_commands.sh", curl_content)
        .expect("Failed to write shell script");
    
    println!("\n✅ All files generated successfully!");
    println!("📋 Next steps:");
    println!("   1. Run the SQL commands to set up initial balances");
    println!("   2. Get a JWT token from the login endpoint");
    println!("   3. Run the mint commands to distribute tokens");
    println!("   4. Verify balances in the database");
}
