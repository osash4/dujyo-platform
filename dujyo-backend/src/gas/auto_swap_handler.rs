// Auto-Swap Handler - Mecanismo de conversión automática DYS → DYO
// UX Brillante: Si el usuario no tiene DYO pero tiene DYS, hace swap automático

use serde::{Deserialize, Serialize};
use crate::gas::creative_gas_engine::{CreativeGasEngine, GasQuote, TransactionType, UserTier};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub transaction_type: TransactionType,
    pub user_id: String,
    pub amount: Option<f64>, // Para transacciones con monto (ej: transfers, swaps)
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    pub success: bool,
    pub transaction_id: String,
    pub gas_paid_dyo: f64,
    pub gas_paid_dys: f64,
    pub auto_swapped: bool,
    pub swap_amount_dys: Option<f64>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GasError {
    InsufficientBalance,
    SwapFailed,
    InvalidTransaction,
    GasCalculationFailed,
    Other(String),
}

/// Maneja una transacción con auto-swap automático si es necesario
pub async fn handle_transaction_with_auto_swap(
    tx: Transaction,
    user_id: &str,
    user_tier: &UserTier,
    user_dyo_balance: f64,
    user_dys_balance: f64,
    transaction_count_last_hour: u64,
    gas_engine: &mut CreativeGasEngine,
    // Callback para ejecutar el swap real (en producción, esto llamaría al DEX)
    swap_callback: Option<Box<dyn Fn(f64) -> Result<f64, String> + Send + Sync>>,
) -> Result<TransactionResult, GasError> {
    // 1. Calcular gas en USD → convertir a DYO
    let gas_quote = gas_engine.calculate_gas(
        tx.transaction_type.clone(),
        user_id,
        user_tier,
        transaction_count_last_hour,
    );
    
    let required_dyo = gas_quote.final_price_dyo;
    
    // 2. Si el gas es gratis (sponsored o StreamEarn), ejecutar directamente
    if required_dyo == 0.0 || gas_quote.is_sponsored {
        return Ok(TransactionResult {
            success: true,
            transaction_id: tx.id.clone(),
            gas_paid_dyo: 0.0,
            gas_paid_dys: 0.0,
            auto_swapped: false,
            swap_amount_dys: None,
            message: "Transaction executed with sponsored gas".to_string(),
        });
    }
    
    // 3. Verificar si el usuario tiene suficiente DYO
    if user_dyo_balance >= required_dyo {
        // Tiene suficiente DYO, ejecutar directamente
        return Ok(TransactionResult {
            success: true,
            transaction_id: tx.id.clone(),
            gas_paid_dyo: required_dyo,
            gas_paid_dys: 0.0,
            auto_swapped: false,
            swap_amount_dys: None,
            message: "Transaction executed with DYO".to_string(),
        });
    }
    
    // 4. No tiene suficiente DYO, verificar si tiene DYS para auto-swap
    if user_dys_balance == 0.0 {
        return Err(GasError::InsufficientBalance);
    }
    
    // 5. Calcular cuánto DYS necesitamos para obtener el DYO requerido
    // DYS está pegado a USD (1 DYS = $1 USD), DYO tiene precio variable
    // Necesitamos calcular: required_dyo * dyo_price_usd = dys_needed
    let dyo_price_usd = gas_engine.get_dyo_price_usd();
    let dys_needed = required_dyo * dyo_price_usd; // DYS = DYO * precio_DYO_en_USD
    
    // 6. Verificar si tiene suficiente DYS
    if user_dys_balance < dys_needed {
        return Err(GasError::InsufficientBalance);
    }
    
    // 7. Ejecutar auto-swap DYS → DYO
    let swap_result = if let Some(callback) = swap_callback {
        callback(dys_needed)
    } else {
        // Simulación: en producción esto llamaría al DEX real
        Ok(dys_needed) // Swap exitoso
    };
    
    match swap_result {
        Ok(swapped_dyo) => {
            if swapped_dyo < required_dyo {
                return Err(GasError::SwapFailed);
            }
            
            // 8. Ejecutar la transacción con el DYO obtenido
            Ok(TransactionResult {
                success: true,
                transaction_id: tx.id.clone(),
                gas_paid_dyo: required_dyo,
                gas_paid_dys: dys_needed,
                auto_swapped: true,
                swap_amount_dys: Some(dys_needed),
                message: format!(
                    "Transaction executed with auto-swap: {} DYS → {} DYO",
                    dys_needed, swapped_dyo
                ),
            })
        }
        Err(_e) => Err(GasError::SwapFailed),
    }
}

/// Obtiene un quote de gas sin ejecutar la transacción
pub fn get_gas_quote(
    tx_type: TransactionType,
    user_id: &str,
    user_tier: &UserTier,
    transaction_count_last_hour: u64,
    gas_engine: &mut CreativeGasEngine,
) -> GasQuote {
    gas_engine.calculate_gas(tx_type, user_id, user_tier, transaction_count_last_hour)
}

/// Verifica si una transacción puede ser ejecutada con el balance actual
pub fn can_execute_transaction(
    required_dyo: f64,
    user_dyo_balance: f64,
    user_dys_balance: f64,
) -> (bool, bool) {
    // (can_execute, needs_swap)
    if user_dyo_balance >= required_dyo {
        (true, false) // Tiene suficiente DYO
    } else if user_dys_balance >= required_dyo {
        (true, true) // Necesita swap pero tiene suficiente DYS
    } else {
        (false, false) // No tiene suficiente de ninguno
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_can_execute_with_dyo() {
        let (can_execute, needs_swap) = can_execute_transaction(10.0, 20.0, 0.0);
        assert!(can_execute);
        assert!(!needs_swap);
    }
    
    #[test]
    fn test_can_execute_with_dys_swap() {
        let (can_execute, needs_swap) = can_execute_transaction(10.0, 5.0, 20.0);
        assert!(can_execute);
        assert!(needs_swap);
    }
    
    #[test]
    fn test_cannot_execute_insufficient_balance() {
        let (can_execute, needs_swap) = can_execute_transaction(10.0, 5.0, 2.0);
        assert!(!can_execute);
        assert!(!needs_swap);
    }
}

