use crate::rpc_client_http::HttpRpcClient;
use tokio;

// Migrado a usar cliente HTTP en lugar de JSON-RPC
// URL del nuevo servidor HTTP
fn get_api_url() -> String {
    std::env::var("HTTP_API_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string())
}

// Obtener balance usando cliente HTTP
async fn get_balance(address: &str) -> Result<u64, Box<dyn std::error::Error>> {
    let client = HttpRpcClient::new(get_api_url());
    let balance = client.get_balance(address).await?;
    Ok(balance)
}

// Transferir tokens usando cliente HTTP
async fn transfer_tokens(from: &str, to: &str, amount: u64) -> Result<String, Box<dyn std::error::Error>> {
    let client = HttpRpcClient::new(get_api_url());
    let response = client.send_transaction(
        from.to_string(),
        to.to_string(),
        amount,
        None, // nft_id
    ).await?;
    
    if response.success {
        Ok(response.transaction_id.unwrap_or_else(|| "unknown".to_string()))
    } else {
        Err(format!("Transaction failed: {}", response.message).into())
    }
}

#[tokio::main]
async fn main() {
    // Ejemplo de uso
    let address = "user_address";

    match get_balance(address).await {
        Ok(balance) => println!("Balance: {}", balance),
        Err(err) => eprintln!("Error al obtener balance: {}", err),
    }

    let from = "user_from_address";
    let to = "user_to_address";
    let amount = 100;

    match transfer_tokens(from, to, amount).await {
        Ok(tx_hash) => println!("Transacción realizada, hash: {}", tx_hash),
        Err(err) => eprintln!("Error al transferir tokens: {}", err),
    }
}
