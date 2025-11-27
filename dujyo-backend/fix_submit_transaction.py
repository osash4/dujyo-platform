#!/usr/bin/env python3
import re

# Read the file
with open('src/server.rs', 'r') as f:
    content = f.read()

# Pattern to find submit_transaction function
old_impl = r'''    // Add transaction to blockchain \(release lock before async operations\)
    let add_result = \{
        let mut blockchain = state\.blockchain\.lock\(\)\.unwrap\(\);
        blockchain\.add_transaction\(transaction\.clone\(\)\)
    \};
    
    match add_result \{
        Ok\(_\) => \{
            // Save transaction to database
            match state\.storage\.save_transaction\(&transaction\)\.await \{
                Ok\(tx_hash\) => \{
                    Ok\(Json\(TransactionResponse \{
                        success: true,
                        message: "Transaction added successfully"\.to_string\(\),
                        transaction_id: Some\(tx_hash\),
                    \}\)\)
                \}
                Err\(e\) => \{
                    println!\("Error saving transaction to database: \{\}",e\);
                    Ok\(Json\(TransactionResponse \{
                        success: false,
                        message: format!\("Database error: \{\}", e\),
                        transaction_id: None,
                    \}\)\)
                \}
            \}
        \}
        Err\(e\) => \{
            Ok\(Json\(TransactionResponse \{
                success: false,
                message: e,
                transaction_id: None,
            \}\)\)
        \}
    \}'''

new_impl = '''    // Use real_blockchain for token transfers (unified with mint)
    let transfer_result = {
        let mut blockchain = state.real_blockchain.lock().unwrap();
        blockchain.transfer_tokens(
            &request.from,
            &request.to,
            request.amount as f64,
            "XWV"
        )
    };
    
    if transfer_result {
        // Save transaction to database
        match state.storage.save_transaction(&transaction).await {
            Ok(tx_hash) => {
                Ok(Json(TransactionResponse {
                    success: true,
                    message: "Transaction completed successfully".to_string(),
                    transaction_id: Some(tx_hash),
                }))
            }
            Err(e) => {
                println!("Error saving transaction to database: {}", e);
                Ok(Json(TransactionResponse {
                    success: true,
                    message: format!("Transaction completed but database save failed: {}", e),
                    transaction_id: None,
                }))
            }
        }
    } else {
        Ok(Json(TransactionResponse {
            success: false,
            message: "Saldo insuficiente o error en la transferencia".to_string(),
            transaction_id: None,
        }))
    }'''

# Replace
content = re.sub(old_impl, new_impl, content, flags=re.MULTILINE)

# Write back
with open('src/server.rs', 'w') as f:
    f.write(content)

print("✅ Función submit_transaction modificada correctamente")

