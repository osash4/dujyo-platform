use jsonrpc_http_server::jsonrpc_core::{Error as JsonRpcError, IoHandler, Params, Value};
use jsonrpc_http_server::ServerBuilder;
use std::sync::{Arc, Mutex};
use serde_json;
use futures::future::FutureExt;

use crate::blockchain::blockchain::{Blockchain, Transaction}; // Se importa la blockchain y la transacción

// Función para iniciar el servidor RPC
pub fn start_rpc_server(blockchain: Blockchain) -> std::io::Result<()> {
    let blockchain = Arc::new(Mutex::new(blockchain)); // Envolvemos la blockchain con Arc y Mutex para el acceso concurrente

    let mut io = IoHandler::new();

    // Añadimos el método "add_transaction" al servidor RPC
    {
        let blockchain = Arc::clone(&blockchain);
        io.add_method("add_transaction", move |params: Params| {
            let blockchain = Arc::clone(&blockchain); // Clonamos el Arc para usarlo dentro de la función asincrónica
            async move {
                // Procesamos los parámetros que llegan al servidor RPC
                let value: Value = params.parse().map_err(|_| JsonRpcError::invalid_params("Invalid parameters"))?;

                // Convertimos el parámetro recibido a una transacción
                let transaction: Transaction = serde_json::from_value(value).map_err(|_| JsonRpcError::invalid_params("Invalid transaction data"))?;

                // Bloqueamos la blockchain para agregar la transacción
                let mut blockchain = blockchain.lock().unwrap();
                let result = blockchain.add_transaction(transaction); // Llamamos al método de la blockchain para agregar la transacción

                // Si hubo algún error, devolvemos un error interno
                if let Err(_e) = result {
                    return Err(JsonRpcError::internal_error());
                }

                // Devolvemos un mensaje indicando que la transacción se ha agregado con éxito
                Ok(Value::String("Transaction added".to_string()))
            }.boxed() // Convertimos la futura en un objeto que puede ser manejado por el servidor RPC
        });
    }

    let rpc_host = std::env::var("RPC_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let rpc_port = std::env::var("RPC_PORT").unwrap_or_else(|_| "3030".to_string());
    let rpc_addr = format!("{}:{}", rpc_host, rpc_port);
    let server = ServerBuilder::new(io)
        .start_http(&rpc_addr.parse().unwrap()) // Iniciar servidor RPC en la dirección configurada
        .expect("Unable to start RPC server");

    // Esperamos a que el servidor termine su ejecución
    server.wait();
    Ok(())
}
