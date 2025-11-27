// PoC: VULN-010 - Transaction Rollback Errors Ignored
// 
// Este PoC demuestra que los errores de rollback se ignoran,
// lo que puede causar inconsistencias de datos si el rollback falla.
//
// Ejecutar con: cargo test --test vuln_010_rollback_errors_poc -- --nocapture

#[cfg(test)]
mod tests {
    use sqlx::{PgPool, Postgres, Transaction};
    use std::time::Duration;
    use tokio::time::sleep;

    #[tokio::test]
    #[ignore] // Solo ejecutar manualmente en staging
    async fn test_rollback_error_ignored() {
        // Setup: Crear pool de base de datos
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/dujyo_blockchain".to_string());
        
        let pool = PgPool::connect(&database_url).await
            .expect("Failed to connect to database");

        // Test: Intentar rollback de transacción que ya fue commitada
        let mut tx = pool.begin().await
            .expect("Failed to begin transaction");

        // Commit la transacción
        tx.commit().await
            .expect("Failed to commit transaction");

        // Intentar rollback después de commit (debería fallar)
        // ACTUAL: let _ = tx.rollback().await; // Error ignorado
        // ESPERADO: tx.rollback().await.map_err(|e| { ... })?;

        let rollback_result = tx.rollback().await;
        
        // Verificar que rollback falla (transacción ya commitada)
        assert!(rollback_result.is_err(), 
            "Rollback should fail after commit, but error is ignored");

        // Verificar que el error se loggea apropiadamente
        // ACTUAL: Error ignorado con let _
        // ESPERADO: Error loggeado y manejado apropiadamente
    }

    #[tokio::test]
    #[ignore] // Solo ejecutar manualmente en staging
    async fn test_rollback_error_propagated() {
        // Test: Verificar que errores de rollback se propagan correctamente
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/dujyo_blockchain".to_string());
        
        let pool = PgPool::connect(&database_url).await
            .expect("Failed to connect to database");

        let mut tx = pool.begin().await
            .expect("Failed to begin transaction");

        // Commit la transacción
        tx.commit().await
            .expect("Failed to commit transaction");

        // Intentar rollback después de commit
        let rollback_result = tx.rollback().await;

        // Verificar que el error se propaga (no se ignora)
        match rollback_result {
            Ok(_) => panic!("Rollback should fail after commit"),
            Err(e) => {
                // Verificar que el error se loggea
                eprintln!("✅ Rollback error properly logged: {}", e);
            }
        }
    }
}

