use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{error, info, warn};

use crate::server::AppState;

// WebSocket message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsMessage {
    // Balance updates
    BalanceUpdate {
        address: String,
        dyo_balance: f64,
        dys_balance: f64,
        staked_balance: f64,
    },
    // Transaction notifications
    TransactionNotification {
        tx_hash: String,
        from: String,
        to: String,
        amount: f64,
        token: String,
        status: String,
    },
    // Block notifications
    NewBlock {
        block_number: u64,
        block_hash: String,
        timestamp: i64,
        transactions: usize,
    },
    // DEX updates
    DexUpdate {
        pool: String,
        price: f64,
        liquidity: f64,
    },
    // Staking updates
    StakingUpdate {
        address: String,
        staked_amount: f64,
        rewards: f64,
    },
    // System notifications
    SystemNotification {
        message: String,
        level: String, // info, warning, error
    },
    // Ping/Pong for keepalive
    Ping,
    Pong,
    // Error messages
    Error {
        message: String,
    },
}

// WebSocket handler
pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    info!("WebSocket connection request received");
    ws.on_upgrade(|socket| handle_socket(socket, Arc::new(state)))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    info!("WebSocket connection established");

    // Split the socket into sender and receiver
    let (mut sender, mut receiver) = socket.split();

    // Create a broadcast channel for this connection
    // FIXME: ws_tx field not in AppState - commenting out broadcast functionality
    // // FIXME: ws_tx not in AppState - websocket broadcast disabled temporarily
    // let mut rx = state.ws_tx.subscribe();

    // Spawn a task to handle incoming messages from the client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    info!("Received text message: {}", text);
                    // Parse and handle client messages
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                        match ws_msg {
                            WsMessage::Ping => {
                                info!("Received Ping, will send Pong");
                                // Pong will be sent by the send_task
                            }
                            _ => {
                                info!("Received message: {:?}", ws_msg);
                            }
                        }
                    }
                }
                Message::Binary(data) => {
                    info!("Received binary message: {} bytes", data.len());
                }
                Message::Ping(data) => {
                    info!("Received ping");
                    // Axum handles pong automatically
                }
                Message::Pong(_) => {
                    info!("Received pong");
                }
                Message::Close(_) => {
                    info!("Client closed connection");
                    break;
                }
            }
        }
    });

    // Spawn a task to send messages to the client
    let mut send_task = tokio::spawn(async move {
        // Send initial connection message
        let welcome = WsMessage::SystemNotification {
            message: "Connected to Dujyo WebSocket".to_string(),
            level: "info".to_string(),
        };

        if let Ok(json) = serde_json::to_string(&welcome) {
            if sender.send(Message::Text(json.into())).await.is_err() {
                error!("Failed to send welcome message");
                return;
            }
        }

        // Listen for broadcast messages
        loop {
            // FIXME: Broadcast functionality commented out due to missing ws_tx in AppState
            // tokio::select! {
            //     // Receive broadcast messages
            //     result = rx.recv() => { ... }
            // }
            
            // Send periodic ping to keep connection alive
            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
            let ping = WsMessage::Ping;
            if let Ok(json) = serde_json::to_string(&ping) {
                if sender.send(Message::Text(json.into())).await.is_err() {
                    error!("Failed to send ping");
                    break;
                }
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => {
            info!("Send task completed");
            recv_task.abort();
        }
        _ = (&mut recv_task) => {
            info!("Receive task completed");
            send_task.abort();
        }
    }

    info!("WebSocket connection closed");
}

// Helper function to broadcast a message to all connected clients
pub async fn broadcast_message(tx: &broadcast::Sender<WsMessage>, msg: WsMessage) {
    if let Err(e) = tx.send(msg.clone()) {
        warn!("Failed to broadcast message: {} (no receivers)", e);
    } else {
        info!("Broadcasted message: {:?}", msg);
    }
}

// Helper functions for specific broadcasts
pub async fn broadcast_balance_update(
    tx: &broadcast::Sender<WsMessage>,
    address: String,
    dyo_balance: f64,
    dys_balance: f64,
    staked_balance: f64,
) {
    let msg = WsMessage::BalanceUpdate {
        address,
        dyo_balance,
        dys_balance,
        staked_balance,
    };
    broadcast_message(tx, msg).await;
}

pub async fn broadcast_transaction(
    tx: &broadcast::Sender<WsMessage>,
    tx_hash: String,
    from: String,
    to: String,
    amount: f64,
    token: String,
    status: String,
) {
    let msg = WsMessage::TransactionNotification {
        tx_hash,
        from,
        to,
        amount,
        token,
        status,
    };
    broadcast_message(tx, msg).await;
}

pub async fn broadcast_new_block(
    tx: &broadcast::Sender<WsMessage>,
    block_number: u64,
    block_hash: String,
    timestamp: i64,
    transactions: usize,
) {
    let msg = WsMessage::NewBlock {
        block_number,
        block_hash,
        timestamp,
        transactions,
    };
    broadcast_message(tx, msg).await;
}

pub async fn broadcast_dex_update(
    tx: &broadcast::Sender<WsMessage>,
    pool: String,
    price: f64,
    liquidity: f64,
) {
    let msg = WsMessage::DexUpdate {
        pool,
        price,
        liquidity,
    };
    broadcast_message(tx, msg).await;
}

pub async fn broadcast_staking_update(
    tx: &broadcast::Sender<WsMessage>,
    address: String,
    staked_amount: f64,
    rewards: f64,
) {
    let msg = WsMessage::StakingUpdate {
        address,
        staked_amount,
        rewards,
    };
    broadcast_message(tx, msg).await;
}

pub async fn broadcast_system_notification(
    tx: &broadcast::Sender<WsMessage>,
    message: String,
    level: String,
) {
    let msg = WsMessage::SystemNotification { message, level };
    broadcast_message(tx, msg).await;
}
