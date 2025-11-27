export interface BlockHeader {
    version: number;
    height: number;
    previousHash: string;
    merkleRoot: string;
    timestamp: number;
    proposer: string;
    nonce: number;
    difficulty: number;
}
export interface Block {
    header: BlockHeader;
    transactions: Transaction[];
    hash: string;
    signatures: string[];
}
export interface Transaction {
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    nonce: number;
    signature?: string;
    type: TransactionType;
    data?: any;
}
export declare enum TransactionType {
    TRANSFER = "TRANSFER",
    MINT = "MINT",
    BURN = "BURN",
    STAKE = "STAKE",
    UNSTAKE = "UNSTAKE",
    SWAP = "SWAP",
    ADD_LIQUIDITY = "ADD_LIQUIDITY",
    REMOVE_LIQUIDITY = "REMOVE_LIQUIDITY"
}
export interface MintTransaction extends Transaction {
    type: TransactionType.MINT;
    data: {
        tokenType: 'XWV' | 'USXWV';
        recipient: string;
        amount: number;
    };
}
export interface StakeTransaction extends Transaction {
    type: TransactionType.STAKE;
    data: {
        validator: string;
        amount: number;
        duration?: number;
    };
}
export interface SwapTransaction extends Transaction {
    type: TransactionType.SWAP;
    data: {
        fromToken: 'XWV' | 'USXWV';
        toToken: 'XWV' | 'USXWV';
        amountIn: number;
        minAmountOut: number;
        slippage: number;
    };
}
export interface LiquidityTransaction extends Transaction {
    type: TransactionType.ADD_LIQUIDITY | TransactionType.REMOVE_LIQUIDITY;
    data: {
        tokenA: 'XWV' | 'USXWV';
        tokenB: 'XWV' | 'USXWV';
        amountA: number;
        amountB: number;
        liquidity?: number;
    };
}
export interface Token {
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: number;
    maxSupply?: number;
    isMintable: boolean;
    isBurnable: boolean;
}
export interface TokenBalance {
    token: string;
    balance: number;
    locked: number;
    available: number;
}
export interface Wallet {
    address: string;
    balances: Map<string, TokenBalance>;
    nonce: number;
    isActive: boolean;
}
export interface Pool {
    id: string;
    tokenA: string;
    tokenB: string;
    reserveA: number;
    reserveB: number;
    totalLiquidity: number;
    fee: number;
    isActive: boolean;
}
export interface StakingPool {
    id: string;
    token: string;
    totalStaked: number;
    totalRewards: number;
    apy: number;
    minStake: number;
    maxStake?: number;
    lockPeriod: number;
    isActive: boolean;
}
export interface StakingPosition {
    id: string;
    user: string;
    pool: string;
    amount: number;
    startTime: number;
    endTime?: number;
    rewards: number;
    isActive: boolean;
}
export interface NetworkStats {
    totalBlocks: number;
    totalTransactions: number;
    totalValidators: number;
    totalStake: number;
    averageBlockTime: number;
    networkHashRate: number;
    activeAddresses: number;
}
export interface NodeInfo {
    nodeId: string;
    version: string;
    network: string;
    isValidator: boolean;
    stake: number;
    uptime: number;
    peers: number;
    syncStatus: 'synced' | 'syncing' | 'behind';
}
//# sourceMappingURL=index.d.ts.map