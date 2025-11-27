use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::error;

/// ✅ SECURITY FIX: Safe timestamp helper
fn get_current_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in multisig");
            format!("System time error: {}", e)
        })
}

/// Multisig Wallet - Sistema de wallets multisig 3/5 para Treasury/Dev/Ops
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultisigWallet {
    pub address: String,
    pub name: String,
    pub purpose: String, // "TREASURY", "DEV", "OPS"
    pub owners: Vec<String>,
    pub threshold: u8, // Número de firmas requeridas (3 para 3/5)
    pub nonce: u64,
    pub pending_transactions: HashMap<String, PendingTransaction>,
    pub executed_transactions: Vec<ExecutedTransaction>,
    pub daily_limit: u64,
    pub daily_used: u64,
    pub last_reset: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingTransaction {
    pub tx_hash: String,
    pub to: String,
    pub amount: u64,
    pub data: Option<String>,
    pub created_by: String,
    pub created_at: u64,
    pub signatures: HashMap<String, Signature>,
    pub executed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub signer: String,
    pub signature: String,
    pub signed_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutedTransaction {
    pub tx_hash: String,
    pub to: String,
    pub amount: u64,
    pub data: Option<String>,
    pub executed_at: u64,
    pub executed_by: String,
    pub signatures: Vec<Signature>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultisigRequest {
    pub to: String,
    pub amount: u64,
    pub data: Option<String>,
    pub requester: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultisigResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignRequest {
    pub tx_hash: String,
    pub signer: String,
    pub signature: String,
}

impl MultisigWallet {
    /// Crear nueva wallet multisig
    pub fn new(
        name: String,
        purpose: String,
        owners: Vec<String>,
        threshold: u8,
        daily_limit: u64,
    ) -> Result<Self, String> {
        if owners.len() < threshold as usize {
            return Err("Not enough owners for threshold".to_string());
        }

        if threshold == 0 {
            return Err("Threshold must be greater than 0".to_string());
        }

        // Generar dirección única para la multisig
        let address = Self::generate_multisig_address(&name, &purpose, &owners);

        Ok(Self {
            address,
            name,
            purpose,
            owners,
            threshold,
            nonce: 0,
            pending_transactions: HashMap::new(),
            executed_transactions: Vec::new(),
            daily_limit,
            daily_used: 0,
            last_reset: get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?,
        })
    }

    /// Generar dirección única para multisig
    fn generate_multisig_address(name: &str, purpose: &str, owners: &[String]) -> String {
        // Simplified hash generation without external dependencies
        let mut hash_input = String::new();
        hash_input.push_str(name);
        hash_input.push_str(purpose);
        for owner in owners {
            hash_input.push_str(owner);
        }

        // Simple hash using string length and character codes
        let hash_value = hash_input
            .chars()
            .fold(0u64, |acc, c| acc.wrapping_mul(31).wrapping_add(c as u64));

        format!("XWMS{:x}", hash_value)
    }

    /// Crear transacción pendiente
    pub fn create_transaction(
        &mut self,
        request: MultisigRequest,
    ) -> Result<MultisigResponse, String> {
        // Verificar que el requester es un owner
        if !self.owners.contains(&request.requester) {
            return Err("Only owners can create transactions".to_string());
        }

        // Verificar límite diario
        if request.amount > self.daily_limit {
            return Err("Transaction amount exceeds daily limit".to_string());
        }

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        // Reset diario si es necesario
        if now - self.last_reset > 86400 {
            // 24 horas
            self.daily_used = 0;
            self.last_reset = now;
        }

        if self.daily_used + request.amount > self.daily_limit {
            return Err("Daily limit would be exceeded".to_string());
        }

        // Generar hash de transacción
        let tx_hash = self.generate_tx_hash(&request);

        // Crear transacción pendiente
        let pending_tx = PendingTransaction {
            tx_hash: tx_hash.clone(),
            to: request.to,
            amount: request.amount,
            data: request.data,
            created_by: request.requester,
            created_at: now,
            signatures: HashMap::new(),
            executed: false,
        };

        self.pending_transactions
            .insert(tx_hash.clone(), pending_tx);

        Ok(MultisigResponse {
            success: true,
            message: "Transaction created, waiting for signatures".to_string(),
            tx_hash: Some(tx_hash),
            data: Some(serde_json::json!({
                "threshold": self.threshold,
                "required_signatures": self.threshold,
                "current_signatures": 0
            })),
        })
    }

    /// Firmar transacción pendiente
    pub fn sign_transaction(&mut self, request: SignRequest) -> Result<MultisigResponse, String> {
        // Verificar que el signer es un owner
        if !self.owners.contains(&request.signer) {
            return Err("Only owners can sign transactions".to_string());
        }

        // Obtener transacción pendiente
        let pending_tx = self
            .pending_transactions
            .get_mut(&request.tx_hash)
            .ok_or("Transaction not found")?;

        if pending_tx.executed {
            return Err("Transaction already executed".to_string());
        }

        // Verificar que no ha firmado antes
        if pending_tx.signatures.contains_key(&request.signer) {
            return Err("Already signed this transaction".to_string());
        }

        // Verificar firma (simplificado - en producción usar criptografía real)
        if !Self::verify_signature(&request.signer, &request.tx_hash, &request.signature) {
            return Err("Invalid signature".to_string());
        }

        // Agregar firma
        let signature = Signature {
            signer: request.signer.clone(),
            signature: request.signature,
            signed_at: get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?,
        };

        pending_tx
            .signatures
            .insert(request.signer.clone(), signature);

        let current_signatures = pending_tx.signatures.len() as u8;

        // Verificar si se puede ejecutar
        if current_signatures >= self.threshold {
            return self.execute_transaction(&request.tx_hash);
        }

        Ok(MultisigResponse {
            success: true,
            message: format!(
                "Transaction signed by {}. {}/{} signatures",
                request.signer, current_signatures, self.threshold
            ),
            tx_hash: Some(request.tx_hash),
            data: Some(serde_json::json!({
                "current_signatures": current_signatures,
                "required_signatures": self.threshold,
                "can_execute": current_signatures >= self.threshold
            })),
        })
    }

    /// Ejecutar transacción cuando se alcanza el threshold
    fn execute_transaction(&mut self, tx_hash: &str) -> Result<MultisigResponse, String> {
        let pending_tx = self
            .pending_transactions
            .remove(tx_hash)
            .ok_or("Transaction not found")?;

        if pending_tx.executed {
            return Err("Transaction already executed".to_string());
        }

        // Verificar que tiene suficientes firmas
        if pending_tx.signatures.len() < self.threshold as usize {
            return Err("Not enough signatures to execute".to_string());
        }

        // Actualizar límite diario
        self.daily_used += pending_tx.amount;
        self.nonce += 1;

        // Crear transacción ejecutada
        let executed_tx = ExecutedTransaction {
            tx_hash: tx_hash.to_string(),
            to: pending_tx.to.clone(),
            amount: pending_tx.amount,
            data: pending_tx.data.clone(),
            executed_at: get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?,
            executed_by: "multisig".to_string(),
            signatures: pending_tx.signatures.values().cloned().collect(),
        };

        self.executed_transactions.push(executed_tx);

        Ok(MultisigResponse {
            success: true,
            message: format!(
                "Transaction executed: {} DYO to {}",
                pending_tx.amount, pending_tx.to
            ),
            tx_hash: Some(tx_hash.to_string()),
            data: Some(serde_json::json!({
                "to": pending_tx.to,
                "amount": pending_tx.amount,
                "signatures_count": pending_tx.signatures.len(),
                "nonce": self.nonce
            })),
        })
    }

    /// Verificar firma (simplificado - en producción usar criptografía real)
    fn verify_signature(signer: &str, _tx_hash: &str, signature: &str) -> bool {
        // En producción, esto debería verificar una firma criptográfica real
        // Por ahora, solo verificamos que la firma tenga el formato correcto
        signature.len() > 10 && signature.contains(signer)
    }

    /// Generar hash de transacción
    fn generate_tx_hash(&self, request: &MultisigRequest) -> String {
        // Simplified hash generation
        let mut hash_input = String::new();
        hash_input.push_str(&self.address);
        hash_input.push_str(&request.to);
        hash_input.push_str(&request.amount.to_string());
        hash_input.push_str(&self.nonce.to_string());
        hash_input.push_str(&request.requester);

        let hash_value = hash_input
            .chars()
            .fold(0u64, |acc, c| acc.wrapping_mul(31).wrapping_add(c as u64));

        format!("MS{:x}", hash_value)
    }

    /// Obtener transacciones pendientes
    pub fn get_pending_transactions(&self) -> Vec<&PendingTransaction> {
        self.pending_transactions.values().collect()
    }

    /// Obtener historial de transacciones ejecutadas
    pub fn get_executed_transactions(&self, limit: Option<usize>) -> Vec<&ExecutedTransaction> {
        let limit = limit.unwrap_or(50);
        self.executed_transactions
            .iter()
            .rev()
            .take(limit)
            .collect()
    }

    /// Obtener información de la multisig
    pub fn get_info(&self) -> serde_json::Value {
        serde_json::json!({
            "address": self.address,
            "name": self.name,
            "purpose": self.purpose,
            "owners": self.owners,
            "threshold": self.threshold,
            "nonce": self.nonce,
            "daily_limit": self.daily_limit,
            "daily_used": self.daily_used,
            "pending_transactions": self.pending_transactions.len(),
            "executed_transactions": self.executed_transactions.len()
        })
    }

    /// Limpiar transacciones pendientes antiguas (más de 7 días)
    pub fn cleanup_old_transactions(&mut self) {
        let now = match get_current_timestamp() {
            Ok(timestamp) => timestamp,
            Err(e) => {
                tracing::error!(error = %e, "Failed to get timestamp in cleanup_old_transactions");
                return;
            }
        };
        let cutoff = now - (7 * 24 * 60 * 60); // 7 días

        self.pending_transactions
            .retain(|_, tx| tx.created_at > cutoff);
    }
}

/// Manager para múltiples wallets multisig
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultisigManager {
    pub wallets: HashMap<String, MultisigWallet>,
}

impl MultisigManager {
    pub fn new() -> Self {
        Self {
            wallets: HashMap::new(),
        }
    }

    /// Crear wallet multisig
    pub fn create_wallet(
        &mut self,
        name: String,
        purpose: String,
        owners: Vec<String>,
        threshold: u8,
        daily_limit: u64,
    ) -> Result<MultisigResponse, String> {
        let wallet = MultisigWallet::new(name.clone(), purpose, owners, threshold, daily_limit)?;
        let address = wallet.address.clone();

        self.wallets.insert(address.clone(), wallet);

        Ok(MultisigResponse {
            success: true,
            message: format!("Multisig wallet '{}' created", name),
            tx_hash: Some(address.clone()),
            data: Some(serde_json::json!({
                "address": address,
                "name": name
            })),
        })
    }

    /// Obtener wallet por dirección
    pub fn get_wallet(&self, address: &str) -> Option<&MultisigWallet> {
        self.wallets.get(address)
    }

    /// Obtener wallet mutable por dirección
    pub fn get_wallet_mut(&mut self, address: &str) -> Option<&mut MultisigWallet> {
        self.wallets.get_mut(address)
    }

    /// Listar todas las wallets
    pub fn list_wallets(&self) -> Vec<&MultisigWallet> {
        self.wallets.values().collect()
    }

    /// Limpiar transacciones antiguas en todas las wallets
    pub fn cleanup_all_wallets(&mut self) {
        for wallet in self.wallets.values_mut() {
            wallet.cleanup_old_transactions();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_multisig_creation() {
        let owners = vec![
            "owner1".to_string(),
            "owner2".to_string(),
            "owner3".to_string(),
            "owner4".to_string(),
            "owner5".to_string(),
        ];

        let wallet = MultisigWallet::new(
            "Treasury".to_string(),
            "TREASURY".to_string(),
            owners.clone(),
            3,
            1000000,
        )
        .unwrap();

        assert_eq!(wallet.name, "Treasury");
        assert_eq!(wallet.purpose, "TREASURY");
        assert_eq!(wallet.owners, owners);
        assert_eq!(wallet.threshold, 3);
        assert_eq!(wallet.daily_limit, 1000000);
    }

    #[test]
    fn test_transaction_creation_and_execution() {
        let owners = vec![
            "owner1".to_string(),
            "owner2".to_string(),
            "owner3".to_string(),
        ];

        let mut wallet = MultisigWallet::new(
            "Test".to_string(),
            "TEST".to_string(),
            owners,
            2, // 2/3 threshold
            1000000,
        )
        .unwrap();

        // Crear transacción
        let request = MultisigRequest {
            to: "recipient".to_string(),
            amount: 1000,
            data: None,
            requester: "owner1".to_string(),
        };

        let result = wallet.create_transaction(request);
        assert!(result.is_ok());

        let tx_hash = result.unwrap().tx_hash.unwrap();

        // Firmar con owner1
        let sign_request = SignRequest {
            tx_hash: tx_hash.clone(),
            signer: "owner1".to_string(),
            signature: "owner1_signature".to_string(),
        };

        let result = wallet.sign_transaction(sign_request);
        assert!(result.is_ok());

        // Firmar con owner2 (debería ejecutar)
        let sign_request = SignRequest {
            tx_hash: tx_hash.clone(),
            signer: "owner2".to_string(),
            signature: "owner2_signature".to_string(),
        };

        let result = wallet.sign_transaction(sign_request);
        assert!(result.is_ok());
        assert!(result.unwrap().success);

        // Verificar que la transacción fue ejecutada
        assert!(wallet.pending_transactions.is_empty());
        assert_eq!(wallet.executed_transactions.len(), 1);
    }
}
