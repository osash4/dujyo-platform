use axum::{
    routing::{post},
    extract::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, Map};
use reqwest::Client;

#[derive(Deserialize, Debug)]
pub struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    params: Option<Value>,
    id: Value,
}

#[derive(Serialize, Debug)]
pub struct JsonRpcResponse {
    jsonrpc: String,
    result: Option<Value>,
    error: Option<JsonRpcError>,
    id: Value,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct JsonRpcError {
    code: i64,
    message: String,
    data: Option<Value>,
}

pub async fn legacy_rpc_proxy_handler(
    Json(request): Json<JsonRpcRequest>,
) -> Json<JsonRpcResponse> {
    let client = Client::new();
    let base_url = std::env::var("LEGACY_PROXY_URL").unwrap_or_else(|_| format!("http://{}:{}/api", std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()), std::env::var("PORT").unwrap_or_else(|_| "8083".to_string())));

    println!("Received legacy JSON-RPC request: {:?}", request);

    let (endpoint, http_method, body) = match request.method.as_str() {
        "add_transaction" => {
            let params: Vec<String> = serde_json::from_value(request.params.unwrap_or_default()).unwrap_or_default();
            let transaction_data = serde_json::json!({
                "from": params.get(0),
                "to": params.get(1),
                "amount": params.get(2).and_then(|s| s.parse::<u64>().ok()),
            });
            ("/transaction", "POST", Some(transaction_data))
        },
        "get_balance" => {
            let params: Vec<String> = serde_json::from_value(request.params.unwrap_or_default()).unwrap_or_default();
            let address = params.get(0).cloned().unwrap_or_default();
            (&format!("/balance/{}", address), "GET", None)
        },
        "system_health" => ("/system_health", "GET", None),
        "system_chain" => ("/chain", "GET", None),
        "add_validator" => {
            let params: Vec<String> = serde_json::from_value(request.params.unwrap_or_default()).unwrap_or_default();
            let validator_data = serde_json::json!({
                "address": params.get(0),
                "stake": params.get(1).and_then(|s| s.parse::<u64>().ok()),
            });
            ("/validator", "POST", Some(validator_data))
        },
        _ => {
            return Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: None,
                error: Some(JsonRpcError {
                    code: -32601,
                    message: "Method not found".to_string(),
                    data: None,
                }),
                id: request.id,
            });
        }
    };

    let response = if http_method == "POST" {
        client.post(&format!("{}{}", base_url, endpoint))
            .json(&body)
            .send()
            .await
    } else {
        client.get(&format!("{}{}", base_url, endpoint))
            .send()
            .await
    };

    match response {
        Ok(res) => {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            println!("Proxy response status: {}, body: {}", status, text);

            if status.is_success() {
                let mut map = Map::new();
                map.insert("message".to_string(), Value::String(text));
                Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: Some(Value::Object(map)),
                    error: None,
                    id: request.id,
                })
            } else {
                Json(JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: status.as_u16() as i64,
                        message: format!("HTTP error: {}", text),
                        data: None,
                    }),
                    id: request.id,
                })
            }
        },
        Err(e) => {
            println!("Proxy request failed: {:?}", e);
            Json(JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: None,
                error: Some(JsonRpcError {
                    code: -32000,
                    message: format!("Proxy request failed: {}", e),
                    data: None,
                }),
                id: request.id,
            })
        }
    }
}

pub fn legacy_rpc_router() -> Router {
    Router::new().route("/legacy/rpc-proxy", post(legacy_rpc_proxy_handler))
}