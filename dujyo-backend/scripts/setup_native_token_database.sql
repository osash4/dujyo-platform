-- Dujyo Native Token Database Setup
-- Este script configura todas las tablas necesarias para el token nativo DYO
-- con funcionalidades avanzadas: vesting, multisig, staking, anti-dump, etc.

-- ============================================================================
-- TABLA PRINCIPAL DEL TOKEN NATIVO
-- ============================================================================

CREATE TABLE IF NOT EXISTS native_tokens (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(255) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 18,
    total_supply BIGINT NOT NULL DEFAULT 0,
    max_supply BIGINT NOT NULL DEFAULT 1000000000,
    admin_address VARCHAR(255) NOT NULL,
    paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BALANCES DEL TOKEN NATIVO
-- ============================================================================

CREATE TABLE IF NOT EXISTS native_token_balances (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    locked_balance BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(token_address, address),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- ALLOWANCES (APROBACIONES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS native_token_allowances (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    spender VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(token_address, owner, spender),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- VESTING SCHEDULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS vesting_schedules (
    id SERIAL PRIMARY KEY,
    schedule_id VARCHAR(255) UNIQUE NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    beneficiary VARCHAR(255) NOT NULL,
    total_amount BIGINT NOT NULL,
    released_amount BIGINT NOT NULL DEFAULT 0,
    start_time BIGINT NOT NULL,
    cliff_duration BIGINT NOT NULL,
    vesting_duration BIGINT NOT NULL,
    release_frequency BIGINT NOT NULL,
    revocable BOOLEAN NOT NULL DEFAULT TRUE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at BIGINT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_release TIMESTAMPTZ,
    release_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- MULTISIG WALLETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS multisig_wallets (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    threshold INTEGER NOT NULL,
    nonce BIGINT NOT NULL DEFAULT 0,
    daily_limit BIGINT NOT NULL,
    daily_used BIGINT NOT NULL DEFAULT 0,
    last_reset BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MULTISIG OWNERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS multisig_owners (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    owner_address VARCHAR(255) NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(wallet_address, owner_address),
    FOREIGN KEY (wallet_address) REFERENCES multisig_wallets(address) ON DELETE CASCADE
);

-- ============================================================================
-- MULTISIG TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS multisig_transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    data TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed BOOLEAN NOT NULL DEFAULT FALSE,
    executed_at TIMESTAMPTZ,
    executed_by VARCHAR(255),
    FOREIGN KEY (wallet_address) REFERENCES multisig_wallets(address) ON DELETE CASCADE
);

-- ============================================================================
-- MULTISIG SIGNATURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS multisig_signatures (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(255) NOT NULL,
    signer VARCHAR(255) NOT NULL,
    signature TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tx_hash, signer),
    FOREIGN KEY (tx_hash) REFERENCES multisig_transactions(tx_hash) ON DELETE CASCADE
);

-- ============================================================================
-- STAKING CONTRACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS staking_contracts (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR(255) UNIQUE NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    total_staked BIGINT NOT NULL DEFAULT 0,
    total_rewards_distributed BIGINT NOT NULL DEFAULT 0,
    total_rewards_pending BIGINT NOT NULL DEFAULT 0,
    min_stake BIGINT NOT NULL,
    max_stake BIGINT,
    reward_frequency BIGINT NOT NULL,
    slashing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    slashing_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reward_distribution TIMESTAMPTZ,
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- STAKERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakers (
    id SERIAL PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    staked_amount BIGINT NOT NULL DEFAULT 0,
    staked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_claim TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pending_rewards BIGINT NOT NULL DEFAULT 0,
    total_rewards_claimed BIGINT NOT NULL DEFAULT 0,
    slashing_events INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(contract_id, address),
    FOREIGN KEY (contract_id) REFERENCES staking_contracts(contract_id) ON DELETE CASCADE
);

-- ============================================================================
-- REWARD POOLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_pools (
    id SERIAL PRIMARY KEY,
    pool_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    total_rewards BIGINT NOT NULL,
    distributed_rewards BIGINT NOT NULL DEFAULT 0,
    pending_rewards BIGINT NOT NULL,
    reward_rate BIGINT NOT NULL,
    max_rewards_per_day BIGINT NOT NULL,
    daily_distributed BIGINT NOT NULL DEFAULT 0,
    last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TIMELOCK DELAYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS timelock_delays (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    delay_seconds BIGINT NOT NULL,
    set_by VARCHAR(255) NOT NULL,
    set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(token_address, address),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- PENDING TIMELOCK TRANSFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_timelock_transfers (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    execute_time BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- DAILY LIMITS (ANTI-DUMP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_limits (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    daily_limit BIGINT NOT NULL,
    used_today BIGINT NOT NULL DEFAULT 0,
    last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    set_by VARCHAR(255) NOT NULL,
    set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(token_address, address),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- KYC VERIFICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS kyc_verification (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by VARCHAR(255) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(token_address, address),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- LIQUIDITY POOLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS liquidity_pools (
    id SERIAL PRIMARY KEY,
    pool_id VARCHAR(255) UNIQUE NOT NULL,
    token_a VARCHAR(255) NOT NULL,
    token_b VARCHAR(255) NOT NULL,
    reserve_a BIGINT NOT NULL DEFAULT 0,
    reserve_b BIGINT NOT NULL DEFAULT 0,
    total_supply BIGINT NOT NULL DEFAULT 0,
    fee_rate DECIMAL(10,6) NOT NULL DEFAULT 0.003,
    timelock_duration BIGINT NOT NULL DEFAULT 15552000, -- 180 days
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LIQUIDITY POSITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS liquidity_positions (
    id SERIAL PRIMARY KEY,
    position_id VARCHAR(255) UNIQUE NOT NULL,
    pool_id VARCHAR(255) NOT NULL,
    user_address VARCHAR(255) NOT NULL,
    amount_a BIGINT NOT NULL DEFAULT 0,
    amount_b BIGINT NOT NULL DEFAULT 0,
    lp_tokens BIGINT NOT NULL DEFAULT 0,
    timelock_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (pool_id) REFERENCES liquidity_pools(pool_id) ON DELETE CASCADE
);

-- ============================================================================
-- TRANSACTION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS native_token_transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    tx_type VARCHAR(50) NOT NULL, -- 'mint', 'transfer', 'vesting_release', 'stake', 'unstake', etc.
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    amount BIGINT NOT NULL,
    data JSONB,
    block_height BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (token_address) REFERENCES native_tokens(token_address) ON DELETE CASCADE
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices para balances
CREATE INDEX IF NOT EXISTS idx_native_balances_address ON native_token_balances(address);
CREATE INDEX IF NOT EXISTS idx_native_balances_token ON native_token_balances(token_address);

-- Índices para vesting
CREATE INDEX IF NOT EXISTS idx_vesting_beneficiary ON vesting_schedules(beneficiary);
CREATE INDEX IF NOT EXISTS idx_vesting_token ON vesting_schedules(token_address);
CREATE INDEX IF NOT EXISTS idx_vesting_revocable ON vesting_schedules(revocable, revoked);

-- Índices para multisig
CREATE INDEX IF NOT EXISTS idx_multisig_owners_wallet ON multisig_owners(wallet_address);
CREATE INDEX IF NOT EXISTS idx_multisig_tx_wallet ON multisig_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_multisig_tx_executed ON multisig_transactions(executed);

-- Índices para staking
CREATE INDEX IF NOT EXISTS idx_stakers_contract ON stakers(contract_id);
CREATE INDEX IF NOT EXISTS idx_stakers_address ON stakers(address);
CREATE INDEX IF NOT EXISTS idx_stakers_active ON stakers(is_active);

-- Índices para transacciones
CREATE INDEX IF NOT EXISTS idx_native_tx_from ON native_token_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_native_tx_to ON native_token_transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_native_tx_type ON native_token_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_native_tx_token ON native_token_transactions(token_address);

-- Índices para timelock
CREATE INDEX IF NOT EXISTS idx_timelock_address ON timelock_delays(address);
CREATE INDEX IF NOT EXISTS idx_pending_timelock_execute ON pending_timelock_transfers(execute_time);

-- Índices para límites diarios
CREATE INDEX IF NOT EXISTS idx_daily_limits_address ON daily_limits(address);
CREATE INDEX IF NOT EXISTS idx_daily_limits_reset ON daily_limits(last_reset);

-- ============================================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================================================

-- Trigger para actualizar updated_at en native_tokens
CREATE OR REPLACE FUNCTION update_native_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_native_tokens_updated_at
    BEFORE UPDATE ON native_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_native_tokens_updated_at();

-- Trigger para actualizar updated_at en native_token_balances
CREATE OR REPLACE FUNCTION update_native_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_native_balances_updated_at
    BEFORE UPDATE ON native_token_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_native_balances_updated_at();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista para balances totales (incluyendo locked)
CREATE OR REPLACE VIEW v_native_token_balances AS
SELECT 
    ntb.token_address,
    ntb.address,
    ntb.balance,
    ntb.locked_balance,
    (ntb.balance + ntb.locked_balance) as total_balance,
    ntb.updated_at
FROM native_token_balances ntb;

-- Vista para vesting schedules activos
CREATE OR REPLACE VIEW v_active_vesting_schedules AS
SELECT 
    vs.*,
    nt.name as token_name,
    nt.symbol as token_symbol,
    (vs.total_amount - vs.released_amount) as remaining_amount
FROM vesting_schedules vs
JOIN native_tokens nt ON vs.token_address = nt.token_address
WHERE vs.revoked = FALSE;

-- Vista para stakers activos
CREATE OR REPLACE VIEW v_active_stakers AS
SELECT 
    s.*,
    sc.name as contract_name,
    sc.purpose as contract_purpose,
    nt.symbol as token_symbol
FROM stakers s
JOIN staking_contracts sc ON s.contract_id = sc.contract_id
JOIN native_tokens nt ON sc.token_address = nt.token_address
WHERE s.is_active = TRUE;

-- Vista para estadísticas de multisig
CREATE OR REPLACE VIEW v_multisig_stats AS
SELECT 
    mw.address,
    mw.name,
    mw.purpose,
    mw.threshold,
    COUNT(mo.owner_address) as total_owners,
    COUNT(mt.tx_hash) as total_transactions,
    COUNT(CASE WHEN mt.executed = TRUE THEN 1 END) as executed_transactions,
    COUNT(CASE WHEN mt.executed = FALSE THEN 1 END) as pending_transactions
FROM multisig_wallets mw
LEFT JOIN multisig_owners mo ON mw.address = mo.wallet_address
LEFT JOIN multisig_transactions mt ON mw.address = mt.wallet_address
GROUP BY mw.address, mw.name, mw.purpose, mw.threshold;

-- ============================================================================
-- FUNCIONES ÚTILES
-- ============================================================================

-- Función para calcular tokens vestidos disponibles
CREATE OR REPLACE FUNCTION calculate_vested_amount(
    p_schedule_id VARCHAR(255),
    p_current_time BIGINT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_schedule RECORD;
    v_current_time BIGINT;
    v_elapsed BIGINT;
    v_vested_amount BIGINT;
BEGIN
    -- Usar tiempo actual si no se proporciona
    v_current_time := COALESCE(p_current_time, EXTRACT(EPOCH FROM NOW())::BIGINT);
    
    -- Obtener información del schedule
    SELECT * INTO v_schedule
    FROM vesting_schedules
    WHERE schedule_id = p_schedule_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Verificar si ha pasado el cliff
    IF v_current_time < (v_schedule.start_time + v_schedule.cliff_duration) THEN
        RETURN 0;
    END IF;
    
    -- Calcular tiempo transcurrido desde el cliff
    v_elapsed := v_current_time - (v_schedule.start_time + v_schedule.cliff_duration);
    
    -- Si todo el período de vesting ha pasado
    IF v_elapsed >= v_schedule.vesting_duration THEN
        RETURN v_schedule.total_amount - v_schedule.released_amount;
    END IF;
    
    -- Calcular tokens vestidos
    v_vested_amount := (v_schedule.total_amount * v_elapsed) / v_schedule.vesting_duration;
    
    -- Retornar tokens liberables (considerando releases previos)
    IF v_vested_amount > v_schedule.released_amount THEN
        RETURN v_vested_amount - v_schedule.released_amount;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar límite diario
CREATE OR REPLACE FUNCTION check_daily_limit(
    p_token_address VARCHAR(255),
    p_address VARCHAR(255),
    p_amount BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit RECORD;
    v_current_time TIMESTAMPTZ;
BEGIN
    v_current_time := NOW();
    
    -- Obtener límite diario
    SELECT * INTO v_limit
    FROM daily_limits
    WHERE token_address = p_token_address AND address = p_address;
    
    IF NOT FOUND THEN
        RETURN TRUE; -- Sin límite
    END IF;
    
    -- Reset diario si es necesario
    IF v_current_time - v_limit.last_reset > INTERVAL '24 hours' THEN
        UPDATE daily_limits
        SET used_today = 0, last_reset = v_current_time
        WHERE token_address = p_token_address AND address = p_address;
        
        v_limit.used_today := 0;
    END IF;
    
    -- Verificar si se excede el límite
    RETURN (v_limit.used_today + p_amount) <= v_limit.daily_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Insertar token nativo DYO
INSERT INTO native_tokens (
    token_address, name, symbol, decimals, max_supply, admin_address
) VALUES (
    'DYO_NATIVE_TOKEN_CONTRACT_ADDRESS',
    'Dujyo Token',
    'DYO',
    18,
    1000000000, -- 1B tokens
    'XW_ADMIN_ADDRESS'
) ON CONFLICT (token_address) DO NOTHING;

-- Insertar wallets multisig
INSERT INTO multisig_wallets (address, name, purpose, threshold, daily_limit, last_reset) VALUES
('XWMS_TREASURY_WALLET_ADDRESS', 'Dujyo Treasury', 'TREASURY', 3, 10000000, EXTRACT(EPOCH FROM NOW())::BIGINT),
('XWMS_DEV_WALLET_ADDRESS', 'Dujyo Development', 'DEV', 3, 5000000, EXTRACT(EPOCH FROM NOW())::BIGINT),
('XWMS_OPS_WALLET_ADDRESS', 'Dujyo Operations', 'OPS', 3, 2000000, EXTRACT(EPOCH FROM NOW())::BIGINT)
ON CONFLICT (address) DO NOTHING;

-- Insertar owners de multisig (ejemplo)
INSERT INTO multisig_owners (wallet_address, owner_address) VALUES
-- Treasury owners
('XWMS_TREASURY_WALLET_ADDRESS', 'XW_TREASURY_OWNER_1'),
('XWMS_TREASURY_WALLET_ADDRESS', 'XW_TREASURY_OWNER_2'),
('XWMS_TREASURY_WALLET_ADDRESS', 'XW_TREASURY_OWNER_3'),
('XWMS_TREASURY_WALLET_ADDRESS', 'XW_TREASURY_OWNER_4'),
('XWMS_TREASURY_WALLET_ADDRESS', 'XW_TREASURY_OWNER_5'),
-- Dev owners
('XWMS_DEV_WALLET_ADDRESS', 'XW_DEV_OWNER_1'),
('XWMS_DEV_WALLET_ADDRESS', 'XW_DEV_OWNER_2'),
('XWMS_DEV_WALLET_ADDRESS', 'XW_DEV_OWNER_3'),
('XWMS_DEV_WALLET_ADDRESS', 'XW_DEV_OWNER_4'),
('XWMS_DEV_WALLET_ADDRESS', 'XW_DEV_OWNER_5'),
-- Ops owners
('XWMS_OPS_WALLET_ADDRESS', 'XW_OPS_OWNER_1'),
('XWMS_OPS_WALLET_ADDRESS', 'XW_OPS_OWNER_2'),
('XWMS_OPS_WALLET_ADDRESS', 'XW_OPS_OWNER_3'),
('XWMS_OPS_WALLET_ADDRESS', 'XW_OPS_OWNER_4'),
('XWMS_OPS_WALLET_ADDRESS', 'XW_OPS_OWNER_5')
ON CONFLICT (wallet_address, owner_address) DO NOTHING;

-- Insertar pools de liquidez iniciales
INSERT INTO liquidity_pools (pool_id, token_a, token_b, reserve_a, reserve_b, total_supply, timelock_duration) VALUES
('DEX_DYO_XUSD_POOL_001', 'DYO', 'XUSD', 100000000, 100000, 100000, 15552000), -- 180 days timelock
('DEX_DYO_ETH_POOL_001', 'DYO', 'ETH', 100000000, 100, 10000, 15552000)
ON CONFLICT (pool_id) DO NOTHING;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE native_tokens IS 'Tabla principal para tokens nativos DYO con funcionalidades avanzadas';
COMMENT ON TABLE vesting_schedules IS 'Schedules de vesting para diferentes tipos de asignaciones';
COMMENT ON TABLE multisig_wallets IS 'Wallets multisig 3/5 para Treasury, Dev y Ops';
COMMENT ON TABLE staking_contracts IS 'Contratos de staking para validadores CPV';
COMMENT ON TABLE reward_pools IS 'Pools de recompensas para diferentes tipos de validadores';
COMMENT ON TABLE daily_limits IS 'Límites diarios anti-dump para transfers grandes';
COMMENT ON TABLE kyc_verification IS 'Verificación KYC para transfers grandes';

-- ============================================================================
-- SCRIPT COMPLETADO
-- ============================================================================

-- Este script configura completamente la base de datos para el token nativo DYO
-- con todas las funcionalidades requeridas:
-- ✅ Token nativo con cap fijo 1B
-- ✅ Sistema de vesting con schedules específicos
-- ✅ Wallets multisig 3/5
-- ✅ Contratos de staking y rewards
-- ✅ Sistema anti-dump con límites diarios
-- ✅ Verificación KYC
-- ✅ Timelock para transfers grandes
-- ✅ Pools de liquidez con timelock
-- ✅ Índices optimizados
-- ✅ Triggers automáticos
-- ✅ Vistas útiles
-- ✅ Funciones helper
-- ✅ Datos iniciales
