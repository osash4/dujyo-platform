use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Cliente HTTP para reemplazar JSON-RPC
pub struct HttpRpcClient {
    client: Client,
    base_url: String,
}

#[derive(Serialize)]
struct SendTransactionRequest {
    from: String,
    to: String,
    amount: u64,
    nft_id: Option<String>,
}

#[derive(Deserialize)]
struct SendTransactionResponse {
    success: bool,
    message: String,
    transaction_id: Option<String>,
}

#[derive(Deserialize)]
struct GetBalanceResponse {
    address: String,
    balance: u64,
}

#[derive(Deserialize)]
struct GetBlockResponse {
    block: Option<serde_json::Value>,
    message: String,
}

impl HttpRpcClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    // Enviar transacción
    pub async fn send_transaction(
        &self,
        from: String,
        to: String,
        amount: u64,
        nft_id: Option<String>,
    ) -> Result<SendTransactionResponse, Box<dyn std::error::Error>> {
        let request = SendTransactionRequest {
            from,
            to,
            amount,
            nft_id,
        };

        let response = self
            .client
            .post(&format!("{}/rpc/sendTransaction", self.base_url))
            .json(&request)
            .send()
            .await?
            .json::<SendTransactionResponse>()
            .await?;

        Ok(response)
    }

    // Obtener balance
    pub async fn get_balance(&self, address: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let mut params = HashMap::new();
        params.insert("address", address);

        let response = self
            .client
            .get(&format!("{}/rpc/getBalance", self.base_url))
            .query(&params)
            .send()
            .await?
            .json::<GetBalanceResponse>()
            .await?;

        Ok(response.balance)
    }

    // Obtener bloque
    pub async fn get_block(&self, height: u64) -> Result<Option<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut params = HashMap::new();
        params.insert("height", height.to_string());

        let response = self
            .client
            .get(&format!("{}/rpc/getBlock", self.base_url))
            .query(&params)
            .send()
            .await?
            .json::<GetBlockResponse>()
            .await?;

        Ok(response.block)
    }

    // Obtener cadena completa
    pub async fn get_chain(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get(&format!("{}/rpc/getChain", self.base_url))
            .send()
            .await?
            .json::<Vec<serde_json::Value>>()
            .await?;

        Ok(response)
    }

    // Obtener mempool
    pub async fn get_mempool(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get(&format!("{}/rpc/getMempool", self.base_url))
            .send()
            .await?
            .json::<Vec<serde_json::Value>>()
            .await?;

        Ok(response)
    }

    // Obtener dirección genesis
    pub async fn get_genesis_address(&self) -> Result<String, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get(&format!("{}/rpc/getGenesisAddress", self.base_url))
            .send()
            .await?
            .text()
            .await?;

        Ok(response)
    }

    // Obtener dirección validador
    pub async fn get_validator_address(&self) -> Result<String, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get(&format!("{}/rpc/getValidatorAddress", self.base_url))
            .send()
            .await?
            .text()
            .await?;

        Ok(response)
    }
}

// Función de compatibilidad para migración gradual
pub async fn migrate_from_jsonrpc_to_http() -> Result<(), Box<dyn std::error::Error>> {
    println!("Migrando de JSON-RPC a HTTP...");
    
    let client = HttpRpcClient::new("http://127.0.0.1:3000".to_string());
    
    // Ejemplo de uso del nuevo cliente HTTP
    let balance = client.get_balance("test_address").await?;
    println!("Balance obtenido via HTTP: {}", balance);
    
    let chain = client.get_chain().await?;
    println!("Cadena obtenida via HTTP: {} bloques", chain.len());
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_http_client_creation() {
        let client = HttpRpcClient::new("http://127.0.0.1:3000".to_string());
        assert_eq!(client.base_url, "http://127.0.0.1:3000");
    }

    #[tokio::test]
    async fn test_send_transaction_request() {
        let request = SendTransactionRequest {
            from: "sender".to_string(),
            to: "receiver".to_string(),
            amount: 100,
            nft_id: None,
        };
        
        assert_eq!(request.from, "sender");
        assert_eq!(request.to, "receiver");
        assert_eq!(request.amount, 100);
        assert_eq!(request.nft_id, None);
    }
}
