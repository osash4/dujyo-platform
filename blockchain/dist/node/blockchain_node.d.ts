import { EventEmitter } from 'events';
import { Wallet } from '../types/index.js';
export interface BlockchainConfig {
    nodeId: string;
    port: number;
    isValidator: boolean;
    stake: number;
    peers: string[];
    adminAddress: string;
}
export declare class BlockchainNode extends EventEmitter {
    private config;
    private cpvNode;
    private xwvContract;
    private usxwvContract;
    private swapContract;
    private stakingContract;
    private wallets;
    private isRunning;
    constructor(config: BlockchainConfig);
    private setupEventHandlers;
    private initializeWallets;
    private addInitialLiquidity;
    start(): void;
    stop(): void;
    private processBlock;
    private processTransaction;
    private processTransfer;
    private processMint;
    private processStake;
    private processUnstake;
    private processSwap;
    private processAddLiquidity;
    private processRemoveLiquidity;
    private updateWalletNonce;
    createWallet(address: string): Wallet;
    getWallet(address: string): Wallet | null;
    getBalance(address: string, token?: 'XWV' | 'USXWV'): number;
    getAllBalances(address: string): {
        XWV: number;
        USXWV: number;
    };
    mintTokens(to: string, amount: number, token?: 'XWV' | 'USXWV'): boolean;
    transferTokens(from: string, to: string, amount: number, token?: 'XWV' | 'USXWV'): boolean;
    swapTokens(user: string, fromToken: 'XWV' | 'USXWV', toToken: 'XWV' | 'USXWV', amountIn: number, minAmountOut: number): import("../contracts/swap_contract.js").SwapResult;
    getSwapQuote(fromToken: 'XWV' | 'USXWV', toToken: 'XWV' | 'USXWV', amountIn: number): {
        amountOut: number;
        priceImpact: number;
        fee: number;
    } | null;
    stakeTokens(user: string, amount: number): import("../contracts/staking_contract.js").StakingResult;
    unstakeTokens(user: string, positionId: string): import("../contracts/staking_contract.js").StakingResult;
    claimRewards(user: string, positionId: string): import("../contracts/staking_contract.js").StakingResult;
    getStakingPositions(user: string): import("../types/index.js").StakingPosition[];
    getNodeInfo(): {
        contracts: {
            xwv: {
                symbol: string;
                name: string;
                totalSupply: number;
                maxSupply: number | undefined;
                holders: number;
                averageBalance: number;
                topHolders: {
                    address: string;
                    balance: number;
                }[];
                isPaused: boolean;
                isMintable: boolean;
                isBurnable: boolean;
            };
            usxwv: {
                symbol: string;
                name: string;
                totalSupply: number;
                maxSupply: number | undefined;
                holders: number;
                averageBalance: number;
                topHolders: {
                    address: string;
                    balance: number;
                }[];
                isPaused: boolean;
                isMintable: boolean;
                isBurnable: boolean;
            };
            swap: import("../types/index.js").Pool[];
            staking: {
                pool: import("../types/index.js").StakingPool;
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
        };
        wallets: number;
    };
    getNetworkStats(): {
        totalBlocks: number;
        totalTransactions: number;
        mempoolSize: number;
        totalWallets: number;
        totalStake: number;
        totalLiquidity: number;
    };
    isNodeRunning(): boolean;
}
//# sourceMappingURL=blockchain_node.d.ts.map