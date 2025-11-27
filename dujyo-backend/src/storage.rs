use sqlx::{PgPool, Row, FromRow};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::blockchain::blockchain::{Blockchain, Block, Transaction};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbBlock {
    pub height: i64,
    pub hash: String,
    pub prev_hash: String,
    pub timestamp: DateTime<Utc>,
    pub tx_count: i32,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbTransaction {
    pub tx_hash: String,
    pub from_address: String,
    pub to_address: String,
    pub amount: i64,
    pub nonce: i64,
    pub status: String,
    pub block_height: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbBalance {
    pub address: String,
    pub balance: i64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbDexPool {
    pub pool_id: String,
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: i64,
    pub reserve_b: i64,
    pub total_supply: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbDexLiquidityPosition {
    pub position_id: String,
    pub user_address: String,
    pub pool_id: String,
    pub lp_tokens: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct BlockchainStorage {
    pub pool: PgPool, // ✅ Made public for route handlers
}

impl BlockchainStorage {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPool::connect(database_url).await?;
        Ok(BlockchainStorage { pool })
    }

    // Initialize database tables
    pub async fn init_tables(&self) -> Result<(), sqlx::Error> {
        // Create blocks table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS blocks (
                height BIGINT PRIMARY KEY,
                hash VARCHAR(255) UNIQUE NOT NULL,
                prev_hash VARCHAR(255) NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                tx_count INTEGER NOT NULL DEFAULT 0,
                data JSONB NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create transactions table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS transactions (
                tx_hash VARCHAR(255) PRIMARY KEY,
                from_address VARCHAR(255) NOT NULL,
                to_address VARCHAR(255) NOT NULL,
                amount BIGINT NOT NULL,
                nonce BIGINT NOT NULL DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                block_height BIGINT REFERENCES blocks(height),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create balances table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS balances (
                address VARCHAR(255) PRIMARY KEY,
                balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for better performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)")
            .execute(&self.pool)
            .await?;

        // Create users table (CRITICAL for registration)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(255) PRIMARY KEY,
                wallet_address VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                username VARCHAR(255) UNIQUE,
                user_type VARCHAR(50) DEFAULT 'listener',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        // Create token_balances table (for DYO/DYS balances)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS token_balances (
                address VARCHAR(255) PRIMARY KEY,
                dyo_balance BIGINT NOT NULL DEFAULT 0,
                dys_balance BIGINT NOT NULL DEFAULT 0,
                staked_balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for users table
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // Load blockchain from database
    pub async fn load_blockchain(&self) -> Result<Blockchain, sqlx::Error> {
        let mut blockchain = Blockchain::new();

        // Load all blocks from database
        let blocks = sqlx::query_as::<_, DbBlock>(
            "SELECT height, hash, prev_hash, timestamp, tx_count, data FROM blocks ORDER BY height"
        )
        .fetch_all(&self.pool)
        .await?;

        // Convert database blocks to blockchain blocks
        for db_block in blocks {
            let transactions: Vec<Transaction> = serde_json::from_value(db_block.data["transactions"].clone())
                .unwrap_or_default();

            let block = Block {
                timestamp: db_block.timestamp.timestamp() as u64,
                transactions,
                previous_hash: db_block.prev_hash,
                hash: db_block.hash,
                validator: Some("system".to_string()),
            };

            blockchain.chain.push(block);
        }

        // Load balances
        let balances = sqlx::query_as::<_, DbBalance>(
            "SELECT address, balance, updated_at FROM balances"
        )
        .fetch_all(&self.pool)
        .await?;

        for db_balance in balances {
            blockchain.balances.insert(db_balance.address, db_balance.balance as u64);
        }

        // Load pending transactions
        let pending_txs = sqlx::query_as::<_, DbTransaction>(
            "SELECT tx_hash, from_address, to_address, amount, nonce, status, block_height, created_at 
             FROM transactions WHERE status = 'pending'"
        )
        .fetch_all(&self.pool)
        .await?;

        for db_tx in pending_txs {
            let transaction = Transaction {
                from: db_tx.from_address,
                to: db_tx.to_address,
                amount: db_tx.amount as u64,
                nft_id: None,
            };
            blockchain.pending_transactions.push(transaction);
        }

        Ok(blockchain)
    }

    // Save a new block to database
    pub async fn save_block(&self, block: &Block, height: i64) -> Result<(), sqlx::Error> {
        let data = serde_json::json!({
            "transactions": block.transactions,
            "validator": block.validator
        });

        sqlx::query(
            "INSERT INTO blocks (height, hash, prev_hash, timestamp, tx_count, data) 
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(height)
        .bind(&block.hash)
        .bind(&block.previous_hash)
        .bind(DateTime::from_timestamp(block.timestamp as i64, 0).unwrap_or_else(|| Utc::now()))
        .bind(block.transactions.len() as i32)
        .bind(data)
        .execute(&self.pool)
        .await?;

        // Update transaction statuses
        for (index, _transaction) in block.transactions.iter().enumerate() {
            let tx_hash = format!("{}_{}", block.hash, index);
            sqlx::query(
                "UPDATE transactions SET status = 'confirmed', block_height = $1 WHERE tx_hash = $2"
            )
            .bind(height)
            .bind(tx_hash)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    // Save a new transaction to database
    pub async fn save_transaction(&self, transaction: &Transaction) -> Result<String, sqlx::Error> {
        let tx_hash = format!("tx_{}", Utc::now().timestamp_millis());
        
        sqlx::query(
            "INSERT INTO transactions (tx_hash, from_address, to_address, amount, nonce, status) 
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(&tx_hash)
        .bind(&transaction.from)
        .bind(&transaction.to)
        .bind(transaction.amount as i64)
        .bind(0i64) // nonce
        .bind("pending")
        .execute(&self.pool)
        .await?;

        Ok(tx_hash)
    }

    // Save a new transaction to database within an existing transaction (atomic)
    pub async fn save_transaction_atomic(
        &self,
        transaction: &Transaction,
        sqlx_tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    ) -> Result<String, sqlx::Error> {
        let tx_hash = format!("tx_{}", Utc::now().timestamp_millis());
        
        sqlx::query(
            "INSERT INTO transactions (tx_hash, from_address, to_address, amount, nonce, status) 
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(&tx_hash)
        .bind(&transaction.from)
        .bind(&transaction.to)
        .bind(transaction.amount as i64)
        .bind(0i64) // nonce
        .bind("pending")
        .execute(&mut **sqlx_tx)
        .await?;

        Ok(tx_hash)
    }

    // Update balance in database
    pub async fn update_balance(&self, address: &str, balance: u64) -> Result<(), sqlx::Error> {
            sqlx::query(
            "INSERT INTO balances (address, balance, updated_at) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (address) 
             DO UPDATE SET balance = $2, updated_at = $3"
            )
            .bind(address)
        .bind(balance as i64)
        .bind(Utc::now())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // Get balance from database
    pub async fn get_balance(&self, address: &str) -> Result<u64, sqlx::Error> {
        let row = sqlx::query("SELECT balance FROM balances WHERE address = $1")
            .bind(address)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => Ok(row.get::<i64, _>("balance") as u64),
            None => Ok(0),
        }
    }

    // Get all balances
    pub async fn get_all_balances(&self) -> Result<HashMap<String, u64>, sqlx::Error> {
        let balances = sqlx::query_as::<_, DbBalance>(
            "SELECT address, balance, updated_at FROM balances"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut result = HashMap::new();
        for balance in balances {
            result.insert(balance.address, balance.balance as u64);
        }

        Ok(result)
    }

    // Get transaction history for an address
    pub async fn get_transaction_history(&self, address: &str, limit: i64) -> Result<Vec<DbTransaction>, sqlx::Error> {
        sqlx::query_as::<_, DbTransaction>(
            "SELECT tx_hash, from_address, to_address, amount, nonce, status, block_height, created_at 
             FROM transactions 
             WHERE from_address = $1 OR to_address = $1 
             ORDER BY created_at DESC 
             LIMIT $2"
        )
        .bind(address)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    // Get blockchain statistics
    pub async fn get_blockchain_stats(&self) -> Result<serde_json::Value, sqlx::Error> {
        let total_blocks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM blocks")
            .fetch_one(&self.pool)
            .await?;

        let total_transactions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
            .fetch_one(&self.pool)
            .await?;

        let pending_transactions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE status = 'pending'")
            .fetch_one(&self.pool)
            .await?;

        let total_addresses: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM balances")
            .fetch_one(&self.pool)
        .await?;

        Ok(serde_json::json!({
            "total_blocks": total_blocks,
            "total_transactions": total_transactions,
            "pending_transactions": pending_transactions,
            "total_addresses": total_addresses
        }))
    }

    // Seed demo data
    pub async fn seed_demo_data(&self) -> Result<(), sqlx::Error> {
        // Insert genesis balances
        let genesis_addresses = vec![
            ("XW1111111111111111111111111111111111111111", 1000000),
            ("XW2222222222222222222222222222222222222222", 500000),
            ("XW3333333333333333333333333333333333333333", 250000),
        ];

        for (address, balance) in genesis_addresses {
            self.update_balance(address, balance).await?;
        }

        println!("✅ Demo data seeded successfully");
        Ok(())
    }

    // DEX-specific methods
    
    // Save DEX transaction
    pub async fn save_dex_transaction(
        &self,
        tx_hash: &str,
        from: &str,
        to: &str,
        amount_in: i64,
        amount_out: i64,
        pool_id: &str,
        transaction_type: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, amount_in, amount_out, pool_id, transaction_type, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
            ON CONFLICT (tx_hash) DO UPDATE SET
                amount_in = EXCLUDED.amount_in,
                amount_out = EXCLUDED.amount_out,
                pool_id = EXCLUDED.pool_id,
                transaction_type = EXCLUDED.transaction_type
            "#
        )
        .bind(tx_hash)
        .bind(from)
        .bind(to)
        .bind(amount_in) // Use amount_in as the main amount
        .bind(amount_in)
        .bind(amount_out)
        .bind(pool_id)
        .bind(transaction_type)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Update DEX pool reserves
    pub async fn update_dex_pool(
        &self,
        pool_id: &str,
        reserve_a: i64,
        reserve_b: i64,
        total_supply: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE dex_pools 
            SET reserve_a = $2, reserve_b = $3, total_supply = $4, updated_at = NOW()
            WHERE pool_id = $1
            "#
        )
        .bind(pool_id)
        .bind(reserve_a)
        .bind(reserve_b)
        .bind(total_supply)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Get DEX pool
    pub async fn get_dex_pool(&self, pool_id: &str) -> Result<Option<DbDexPool>, sqlx::Error> {
        let pool = sqlx::query_as::<_, DbDexPool>(
            "SELECT * FROM dex_pools WHERE pool_id = $1"
        )
        .bind(pool_id)
        .fetch_optional(&self.pool)
            .await?;

        Ok(pool)
    }

    // Save liquidity position
    pub async fn save_liquidity_position(
        &self,
        position_id: &str,
        user_address: &str,
        pool_id: &str,
        lp_tokens: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO dex_liquidity_positions (position_id, user_address, pool_id, lp_tokens, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (position_id) DO UPDATE SET
                lp_tokens = EXCLUDED.lp_tokens,
                updated_at = NOW()
            "#
        )
        .bind(position_id)
        .bind(user_address)
        .bind(pool_id)
        .bind(lp_tokens)
        .execute(&self.pool)
            .await?;

        Ok(())
    }

    // Get user liquidity positions
    pub async fn get_user_liquidity_positions(&self, user_address: &str) -> Result<Vec<DbDexLiquidityPosition>, sqlx::Error> {
        let positions = sqlx::query_as::<_, DbDexLiquidityPosition>(
            "SELECT * FROM dex_liquidity_positions WHERE user_address = $1"
        )
        .bind(user_address)
        .fetch_all(&self.pool)
            .await?;

        Ok(positions)
    }
}
