import { TokenContract } from './token_contract';
import { StakingPool, StakingPosition } from '../types';
export interface StakingConfig {
    minStake: number;
    maxStake?: number;
    lockPeriod: number;
    rewardRate: number;
    fee: number;
}
export interface StakingResult {
    success: boolean;
    positionId?: string;
    amount?: number;
    rewards?: number;
    error?: string;
}
export declare class StakingContract {
    private config;
    private tokenContract;
    private stakingPool;
    private positions;
    private totalStaked;
    private totalRewards;
    private lastRewardUpdate;
    private owner;
    constructor(config: StakingConfig, tokenContract: TokenContract, owner: string);
    getStakingPool(): StakingPool;
    getPosition(positionId: string): StakingPosition | null;
    getUserPositions(user: string): StakingPosition[];
    getAllPositions(): StakingPosition[];
    stake(user: string, amount: number): StakingResult;
    unstake(user: string, positionId: string): StakingResult;
    claimRewards(user: string, positionId: string): StakingResult;
    private calculateRewards;
    private generatePositionId;
    getStakingStats(): {
        pool: StakingPool;
        totalPositions: number;
        activePositions: number;
        totalStaked: number;
        totalActiveStake: number;
        totalRewards: number;
        totalPendingRewards: number;
        averageStake: number;
        apy: number;
        minStake: number;
        maxStake: number | undefined;
        lockPeriod: number;
        isActive: boolean;
    };
    getTopStakers(limit?: number): Array<{
        user: string;
        totalStake: number;
        totalRewards: number;
    }>;
    updateRewardRate(newRate: number): boolean;
    pauseStaking(): boolean;
    resumeStaking(): boolean;
    addRewards(amount: number): boolean;
}
//# sourceMappingURL=staking_contract.d.ts.map