CREATE TABLE IF NOT EXISTS balances (
                address VARCHAR(255) PRIMARY KEY,
                balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

INSERT INTO balances (address, balance, updated_at) VALUES ('XW0000000000000000000000000000000000000001', 300000000, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET balance = 300000000, updated_at = NOW();

INSERT INTO balances (address, balance, updated_at) VALUES ('XW0000000000000000000000000000000000000002', 250000000, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET balance = 250000000, updated_at = NOW();

INSERT INTO balances (address, balance, updated_at) VALUES ('XW0000000000000000000000000000000000000003', 200000000, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET balance = 200000000, updated_at = NOW();

INSERT INTO balances (address, balance, updated_at) VALUES ('XW0000000000000000000000000000000000000004', 150000000, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET balance = 150000000, updated_at = NOW();

INSERT INTO balances (address, balance, updated_at) VALUES ('XW0000000000000000000000000000000000000005', 100000000, NOW()) 
                 ON CONFLICT (address) DO UPDATE SET balance = 100000000, updated_at = NOW();