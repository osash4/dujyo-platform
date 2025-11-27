import { TokenContract } from './token_contract';
import { Pool } from '../types';
export interface SwapConfig {
    fee: number;
    minLiquidity: number;
    maxSlippage: number;
}
export interface SwapResult {
    amountIn: number;
    amountOut: number;
    priceImpact: number;
    fee: number;
    success: boolean;
    error?: string;
}
export declare class SwapContract {
    private config;
    private pools;
    private xwvContract;
    private usxwvContract;
    private owner;
    constructor(config: SwapConfig, xwvContract: TokenContract, usxwvContract: TokenContract, owner: string);
    private initializePool;
    private getPoolId;
    getPool(tokenA: string, tokenB: string): Pool | null;
    getAllPools(): Pool[];
    addLiquidity(user: string, tokenA: string, tokenB: string, amountA: number, amountB: number): boolean;
    removeLiquidity(user: string, tokenA: string, tokenB: string, liquidityTokens: number): {
        amountA: number;
        amountB: number;
    };
    swap(user: string, fromToken: string, toToken: string, amountIn: number, minAmountOut: number, maxSlippage?: number): SwapResult;
    private calculateSwapAmounts;
    private getTokenContract;
    getSwapQuote(fromToken: string, toToken: string, amountIn: number): {
        amountOut: number;
        priceImpact: number;
        fee: number;
    } | null;
    getPoolStats(tokenA: string, tokenB: string): {
        poolId: string;
        tokenA: string;
        tokenB: string;
        reserveA: number;
        reserveB: number;
        totalLiquidity: number;
        totalValue: number;
        volume24h: number;
        fee: number;
        isActive: boolean;
    } | null;
}
//# sourceMappingURL=swap_contract.d.ts.map