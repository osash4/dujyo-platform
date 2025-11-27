// Library entry point for testing
pub mod gas;
pub mod blockchain {
    pub mod native_token;
    pub mod staking_rewards;
    pub mod multisig;
    pub mod vesting;
    pub mod artist_vesting;
    pub mod emergency_functions;
    // Export blockchain modules from src/blockchain/
    pub mod block;
    pub mod blockchain;
    pub mod token;
    pub mod transaction;
    pub mod gas_fees;
    pub mod real_blockchain;
}

pub mod utils {
    pub mod safe_math;
    pub mod arithmetic;
    pub mod access_control;
    pub mod vrf;
    pub mod crypto;
    pub mod validation;
}

pub mod dex;
pub mod consensus {
    pub mod cpv;
}

pub mod rewards {
    pub mod user_rewards;
}

// Export modules needed for tests
pub mod middleware {
    pub mod rate_limiting;
}

pub mod security {
    pub mod rate_limiting_redis;
    pub mod rate_limiter_memory;
}

pub mod routes {
    pub mod metrics;
}

