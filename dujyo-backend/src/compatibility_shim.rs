// Shim de compatibilidad para permitir que JSON-RPC y HTTP funcionen simultáneamente
// durante la migración gradual

use std::sync::Arc;
use std::sync::Mutex;
use crate::blockchain::blockchain::Blockchain;
use crate::rpc_client_http::HttpRpcClient;

pub struct CompatibilityShim {
    blockchain: Arc<Mutex<Blockchain>>,
    http_client: HttpRpcClient,
    use_http: bool, // Flag para alternar entre JSON-RPC y HTTP
}

impl CompatibilityShim {
    pub fn new(blockchain: Arc<Mutex<Blockchain>>, http_base_url: String) -> Self {
        Self {
            blockchain,
            http_client: HttpRpcClient::new(http_base_url),
            use_http: false, // Por defecto usa JSON-RPC, cambiar a true para usar HTTP
        }
    }

    // Cambiar entre modos JSON-RPC y HTTP
    pub fn set_use_http(&mut self, use_http: bool) {
        self.use_http = use_http;
        println!("Compatibility shim switched to: {}", if use_http { "HTTP" } else { "JSON-RPC" });
    }

    // Método unificado para obtener balance
    pub async fn get_balance(&self, address: &str) -> Result<u64, Box<dyn std::error::Error>> {
        if self.use_http {
            // Usar cliente HTTP
            self.http_client.get_balance(address).await
        } else {
            // Usar lógica JSON-RPC existente (directamente desde blockchain)
            let blockchain = self.blockchain.lock().unwrap();
            Ok(blockchain.get_balance(address))
        }
    }

    // Método unificado para enviar transacción
    pub async fn send_transaction(
        &self,
        from: String,
        to: String,
        amount: u64,
        nft_id: Option<String>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        if self.use_http {
            // Usar cliente HTTP
            let response = self.http_client.send_transaction(from, to, amount, nft_id).await?;
            if response.success {
                Ok(response.transaction_id.unwrap_or_else(|| "unknown".to_string()))
            } else {
                Err(format!("Transaction failed: {}", response.message).into())
            }
        } else {
            // Usar lógica JSON-RPC existente (directamente desde blockchain)
            let mut blockchain = self.blockchain.lock().unwrap();
            let transaction = crate::blockchain::blockchain::Transaction {
                from,
                to,
                amount,
                nft_id,
            };
            
            blockchain.add_transaction(transaction)?;
            Ok("transaction_added_via_jsonrpc".to_string())
        }
    }

    // Método unificado para obtener cadena
    pub async fn get_chain(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        if self.use_http {
            // Usar cliente HTTP
            self.http_client.get_chain().await
        } else {
            // Usar lógica JSON-RPC existente (directamente desde blockchain)
            let blockchain = self.blockchain.lock().unwrap();
            let chain = blockchain.get_chain();
            let json_chain: Vec<serde_json::Value> = chain
                .iter()
                .map(|block| serde_json::to_value(block).unwrap_or_default())
                .collect();
            Ok(json_chain)
        }
    }

    // Método unificado para obtener mempool
    pub async fn get_mempool(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        if self.use_http {
            // Usar cliente HTTP
            self.http_client.get_mempool().await
        } else {
            // Usar lógica JSON-RPC existente (directamente desde blockchain)
            let blockchain = self.blockchain.lock().unwrap();
            let mempool = blockchain.get_mempool();
            let json_mempool: Vec<serde_json::Value> = mempool
                .iter()
                .map(|tx| serde_json::to_value(tx).unwrap_or_default())
                .collect();
            Ok(json_mempool)
        }
    }

    // Método para migración gradual - alternar entre modos
    pub async fn gradual_migration_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("Iniciando prueba de migración gradual...");
        
        // Probar con JSON-RPC
        self.set_use_http(false);
        let balance_jsonrpc = self.get_balance("test_address").await?;
        println!("Balance via JSON-RPC: {}", balance_jsonrpc);
        
        // Probar con HTTP
        self.set_use_http(true);
        let balance_http = self.get_balance("test_address").await?;
        println!("Balance via HTTP: {}", balance_http);
        
        // Verificar que los resultados sean consistentes
        if balance_jsonrpc == balance_http {
            println!("✅ Migración exitosa - resultados consistentes");
        } else {
            println!("⚠️  Advertencia - resultados inconsistentes entre JSON-RPC y HTTP");
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::Mutex;

    #[tokio::test]
    async fn test_compatibility_shim_creation() {
        let blockchain = Arc::new(Mutex::new(Blockchain::new()));
        let shim = CompatibilityShim::new(blockchain, "http://127.0.0.1:3000".to_string());
        
        assert_eq!(shim.use_http, false); // Por defecto usa JSON-RPC
    }

    #[tokio::test]
    async fn test_mode_switching() {
        let blockchain = Arc::new(Mutex::new(Blockchain::new()));
        let mut shim = CompatibilityShim::new(blockchain, "http://127.0.0.1:3000".to_string());
        
        assert_eq!(shim.use_http, false);
        
        shim.set_use_http(true);
        assert_eq!(shim.use_http, true);
        
        shim.set_use_http(false);
        assert_eq!(shim.use_http, false);
    }
}
