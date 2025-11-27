export class StakingContract {
    constructor(config, tokenContract, owner) {
        this.positions = new Map();
        this.totalStaked = 0;
        this.totalRewards = 0;
        this.lastRewardUpdate = Date.now();
        this.config = config;
        this.tokenContract = tokenContract;
        this.owner = owner;
        // Initialize staking pool
        this.stakingPool = {
            id: `staking-${tokenContract.getTokenInfo().symbol}`,
            token: tokenContract.getTokenInfo().symbol,
            totalStaked: 0,
            totalRewards: 0,
            apy: config.rewardRate,
            minStake: config.minStake,
            maxStake: config.maxStake,
            lockPeriod: config.lockPeriod,
            isActive: true
        };
        console.log(`🏦 Staking contract initialized for ${tokenContract.getTokenInfo().symbol}`);
    }
    getStakingPool() {
        return { ...this.stakingPool };
    }
    getPosition(positionId) {
        return this.positions.get(positionId) || null;
    }
    getUserPositions(user) {
        return Array.from(this.positions.values())
            .filter(position => position.user === user);
    }
    getAllPositions() {
        return Array.from(this.positions.values());
    }
    stake(user, amount) {
        if (!this.stakingPool.isActive) {
            return {
                success: false,
                error: 'Staking pool is not active'
            };
        }
        if (amount < this.config.minStake) {
            return {
                success: false,
                error: `Minimum stake amount is ${this.config.minStake}`
            };
        }
        if (this.config.maxStake && amount > this.config.maxStake) {
            return {
                success: false,
                error: `Maximum stake amount is ${this.config.maxStake}`
            };
        }
        // Check user balance
        if (this.tokenContract.getBalance(user) < amount) {
            return {
                success: false,
                error: 'Insufficient balance'
            };
        }
        // Check contract balance
        if (this.tokenContract.getBalance(this.owner) < amount) {
            return {
                success: false,
                error: 'Insufficient contract balance'
            };
        }
        try {
            // Transfer tokens from user to contract
            this.tokenContract.transfer(user, this.owner, amount);
            // Create staking position
            const positionId = this.generatePositionId(user);
            const now = Date.now();
            const position = {
                id: positionId,
                user,
                pool: this.stakingPool.id,
                amount,
                startTime: now,
                endTime: now + (this.config.lockPeriod * 1000),
                rewards: 0,
                isActive: true
            };
            this.positions.set(positionId, position);
            // Update pool stats
            this.stakingPool.totalStaked += amount;
            this.totalStaked += amount;
            console.log(`🏦 Staked ${amount} ${this.tokenContract.getTokenInfo().symbol} for user ${user}`);
            return {
                success: true,
                positionId,
                amount
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    unstake(user, positionId) {
        const position = this.positions.get(positionId);
        if (!position) {
            return {
                success: false,
                error: 'Position not found'
            };
        }
        if (position.user !== user) {
            return {
                success: false,
                error: 'Unauthorized'
            };
        }
        if (!position.isActive) {
            return {
                success: false,
                error: 'Position is not active'
            };
        }
        const now = Date.now();
        const isLocked = position.endTime ? now < position.endTime : false;
        if (isLocked) {
            return {
                success: false,
                error: 'Position is still locked'
            };
        }
        try {
            // Calculate rewards
            const rewards = this.calculateRewards(position);
            // Calculate unstaking fee if applicable
            const feeAmount = (position.amount * this.config.fee) / 100;
            const amountToReturn = position.amount - feeAmount;
            // Check contract balance
            const totalToReturn = amountToReturn + rewards;
            if (this.tokenContract.getBalance(this.owner) < totalToReturn) {
                return {
                    success: false,
                    error: 'Insufficient contract balance'
                };
            }
            // Transfer tokens back to user
            if (amountToReturn > 0) {
                this.tokenContract.transfer(this.owner, user, amountToReturn);
            }
            if (rewards > 0) {
                this.tokenContract.transfer(this.owner, user, rewards);
            }
            // Update position
            position.isActive = false;
            position.rewards = rewards;
            // Update pool stats
            this.stakingPool.totalStaked -= position.amount;
            this.totalStaked -= position.amount;
            this.stakingPool.totalRewards += rewards;
            this.totalRewards += rewards;
            console.log(`🏦 Unstaked ${amountToReturn} ${this.tokenContract.getTokenInfo().symbol} + ${rewards} rewards for user ${user}`);
            return {
                success: true,
                amount: amountToReturn,
                rewards
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    claimRewards(user, positionId) {
        const position = this.positions.get(positionId);
        if (!position) {
            return {
                success: false,
                error: 'Position not found'
            };
        }
        if (position.user !== user) {
            return {
                success: false,
                error: 'Unauthorized'
            };
        }
        if (!position.isActive) {
            return {
                success: false,
                error: 'Position is not active'
            };
        }
        try {
            // Calculate rewards
            const rewards = this.calculateRewards(position);
            if (rewards <= 0) {
                return {
                    success: false,
                    error: 'No rewards to claim'
                };
            }
            // Check contract balance
            if (this.tokenContract.getBalance(this.owner) < rewards) {
                return {
                    success: false,
                    error: 'Insufficient contract balance'
                };
            }
            // Transfer rewards to user
            this.tokenContract.transfer(this.owner, user, rewards);
            // Update position
            position.rewards += rewards;
            // Update pool stats
            this.stakingPool.totalRewards += rewards;
            this.totalRewards += rewards;
            console.log(`🎁 Claimed ${rewards} ${this.tokenContract.getTokenInfo().symbol} rewards for user ${user}`);
            return {
                success: true,
                rewards
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    calculateRewards(position) {
        const now = Date.now();
        const stakingDuration = (now - position.startTime) / 1000; // in seconds
        const stakingDurationYears = stakingDuration / (365 * 24 * 3600); // in years
        // Calculate rewards based on APY
        const rewards = position.amount * (this.config.rewardRate / 100) * stakingDurationYears;
        return Math.max(0, rewards);
    }
    generatePositionId(user) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${user}-${timestamp}-${random}`;
    }
    getStakingStats() {
        const activePositions = Array.from(this.positions.values())
            .filter(p => p.isActive);
        const totalActiveStake = activePositions.reduce((sum, p) => sum + p.amount, 0);
        const totalPendingRewards = activePositions.reduce((sum, p) => sum + this.calculateRewards(p), 0);
        return {
            pool: this.stakingPool,
            totalPositions: this.positions.size,
            activePositions: activePositions.length,
            totalStaked: this.totalStaked,
            totalActiveStake,
            totalRewards: this.totalRewards,
            totalPendingRewards,
            averageStake: activePositions.length > 0 ? totalActiveStake / activePositions.length : 0,
            apy: this.config.rewardRate,
            minStake: this.config.minStake,
            maxStake: this.config.maxStake,
            lockPeriod: this.config.lockPeriod,
            isActive: this.stakingPool.isActive
        };
    }
    getTopStakers(limit = 10) {
        const userStats = new Map();
        for (const position of this.positions.values()) {
            if (!userStats.has(position.user)) {
                userStats.set(position.user, { totalStake: 0, totalRewards: 0 });
            }
            const stats = userStats.get(position.user);
            stats.totalStake += position.amount;
            stats.totalRewards += position.rewards;
        }
        return Array.from(userStats.entries())
            .map(([user, stats]) => ({ user, ...stats }))
            .sort((a, b) => b.totalStake - a.totalStake)
            .slice(0, limit);
    }
    updateRewardRate(newRate) {
        if (newRate < 0 || newRate > 100) {
            return false;
        }
        this.config.rewardRate = newRate;
        this.stakingPool.apy = newRate;
        console.log(`📊 Updated reward rate to ${newRate}% APY`);
        return true;
    }
    pauseStaking() {
        if (!this.stakingPool.isActive) {
            return false;
        }
        this.stakingPool.isActive = false;
        console.log(`⏸️  Staking paused`);
        return true;
    }
    resumeStaking() {
        if (this.stakingPool.isActive) {
            return false;
        }
        this.stakingPool.isActive = true;
        console.log(`▶️  Staking resumed`);
        return true;
    }
    addRewards(amount) {
        if (amount <= 0) {
            return false;
        }
        // Check if contract has enough tokens to add as rewards
        if (this.tokenContract.getBalance(this.owner) < amount) {
            return false;
        }
        // Transfer tokens to contract (they become available for rewards)
        this.tokenContract.transfer(this.owner, this.owner, amount);
        this.totalRewards += amount;
        this.stakingPool.totalRewards += amount;
        console.log(`💰 Added ${amount} ${this.tokenContract.getTokenInfo().symbol} to reward pool`);
        return true;
    }
}
//# sourceMappingURL=staking_contract.js.map