import { TokenContract } from './token_contract';
import { Pool, SwapTransaction, TransactionType } from '../types';

export interface SwapConfig {
  fee: number; // Fee percentage (e.g., 0.3 for 0.3%)
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

export class SwapContract {
  private config: SwapConfig;
  private pools: Map<string, Pool> = new Map();
  private dyoContract: TokenContract;
  private dysContract: TokenContract;
  private owner: string;

  constructor(
    config: SwapConfig,
    dyoContract: TokenContract,
    dysContract: TokenContract,
    owner: string
  ) {
    this.config = config;
    this.dyoContract = dyoContract;
    this.dysContract = dysContract;
    this.owner = owner;

    // Initialize DYO/DYS pool
    this.initializePool('DYO', 'DYS');
    
    console.log('🔄 Swap contract initialized');
  }

  private initializePool(tokenA: string, tokenB: string) {
    const poolId = this.getPoolId(tokenA, tokenB);
    
    const pool: Pool = {
      id: poolId,
      tokenA,
      tokenB,
      reserveA: 0,
      reserveB: 0,
      totalLiquidity: 0,
      fee: this.config.fee,
      isActive: true
    };

    this.pools.set(poolId, pool);
    console.log(`🏊 Initialized pool: ${tokenA}/${tokenB}`);
  }

  private getPoolId(tokenA: string, tokenB: string): string {
    const tokens = [tokenA, tokenB].sort();
    return `${tokens[0]}-${tokens[1]}`;
  }

  public getPool(tokenA: string, tokenB: string): Pool | null {
    const poolId = this.getPoolId(tokenA, tokenB);
    return this.pools.get(poolId) || null;
  }

  public getAllPools(): Pool[] {
    return Array.from(this.pools.values());
  }

  public addLiquidity(
    user: string,
    tokenA: string,
    tokenB: string,
    amountA: number,
    amountB: number
  ): boolean {
    const pool = this.getPool(tokenA, tokenB);
    if (!pool) {
      throw new Error('Pool not found');
    }

    if (!pool.isActive) {
      throw new Error('Pool is not active');
    }

    if (amountA <= 0 || amountB <= 0) {
      throw new Error('Amounts must be positive');
    }

    // Get token contracts
    const contractA = this.getTokenContract(tokenA);
    const contractB = this.getTokenContract(tokenB);

    // Check user balances
    if (contractA.getBalance(user) < amountA) {
      throw new Error(`Insufficient ${tokenA} balance`);
    }

    if (contractB.getBalance(user) < amountB) {
      throw new Error(`Insufficient ${tokenB} balance`);
    }

    // Calculate liquidity tokens to mint
    let liquidityTokens = 0;
    
    if (pool.totalLiquidity === 0) {
      // First liquidity provision
      liquidityTokens = Math.sqrt(amountA * amountB);
    } else {
      // Calculate based on existing reserves
      const liquidityA = (amountA * pool.totalLiquidity) / pool.reserveA;
      const liquidityB = (amountB * pool.totalLiquidity) / pool.reserveB;
      liquidityTokens = Math.min(liquidityA, liquidityB);
    }

    if (liquidityTokens < this.config.minLiquidity) {
      throw new Error('Liquidity amount too small');
    }

    // Transfer tokens from user to contract
    contractA.transfer(user, this.owner, amountA);
    contractB.transfer(user, this.owner, amountB);

    // Update pool reserves
    pool.reserveA += amountA;
    pool.reserveB += amountB;
    pool.totalLiquidity += liquidityTokens;

    console.log(`🏊 Added liquidity: ${amountA} ${tokenA} + ${amountB} ${tokenB} = ${liquidityTokens} LP tokens`);
    return true;
  }

  public removeLiquidity(
    user: string,
    tokenA: string,
    tokenB: string,
    liquidityTokens: number
  ): { amountA: number, amountB: number } {
    const pool = this.getPool(tokenA, tokenB);
    if (!pool) {
      throw new Error('Pool not found');
    }

    if (liquidityTokens <= 0) {
      throw new Error('Liquidity amount must be positive');
    }

    if (liquidityTokens > pool.totalLiquidity) {
      throw new Error('Insufficient liquidity tokens');
    }

    // Calculate amounts to return
    const amountA = (liquidityTokens * pool.reserveA) / pool.totalLiquidity;
    const amountB = (liquidityTokens * pool.reserveB) / pool.totalLiquidity;

    // Get token contracts
    const contractA = this.getTokenContract(tokenA);
    const contractB = this.getTokenContract(tokenB);

    // Check contract balances
    if (contractA.getBalance(this.owner) < amountA) {
      throw new Error(`Insufficient ${tokenA} in pool`);
    }

    if (contractB.getBalance(this.owner) < amountB) {
      throw new Error(`Insufficient ${tokenB} in pool`);
    }

    // Transfer tokens back to user
    contractA.transfer(this.owner, user, amountA);
    contractB.transfer(this.owner, user, amountB);

    // Update pool reserves
    pool.reserveA -= amountA;
    pool.reserveB -= amountB;
    pool.totalLiquidity -= liquidityTokens;

    console.log(`🏊 Removed liquidity: ${liquidityTokens} LP tokens -> ${amountA} ${tokenA} + ${amountB} ${tokenB}`);
    return { amountA, amountB };
  }

  public swap(
    user: string,
    fromToken: string,
    toToken: string,
    amountIn: number,
    minAmountOut: number,
    maxSlippage: number = this.config.maxSlippage
  ): SwapResult {
    const pool = this.getPool(fromToken, toToken);
    if (!pool) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: 'Pool not found'
      };
    }

    if (!pool.isActive) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: 'Pool is not active'
      };
    }

    if (amountIn <= 0) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: 'Amount must be positive'
      };
    }

    // Get token contracts
    const fromContract = this.getTokenContract(fromToken);
    const toContract = this.getTokenContract(toToken);

    // Check user balance
    if (fromContract.getBalance(user) < amountIn) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: `Insufficient ${fromToken} balance`
      };
    }

    // Calculate swap amounts
    const { amountOut, priceImpact, fee } = this.calculateSwapAmounts(
      pool,
      fromToken,
      toToken,
      amountIn
    );

    // Check slippage
    const slippage = (amountIn - minAmountOut) / amountIn;
    if (slippage > maxSlippage) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: `Slippage too high: ${(slippage * 100).toFixed(2)}%`
      };
    }

    // Check minimum amount out
    if (amountOut < minAmountOut) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: 'Insufficient output amount'
      };
    }

    // Check pool reserves
    const reserveIn = fromToken === pool.tokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = toToken === pool.tokenA ? pool.reserveA : pool.reserveB;

    if (reserveOut < amountOut) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: 'Insufficient liquidity'
      };
    }

    // Execute swap
    try {
      // Transfer input tokens from user to contract
      fromContract.transfer(user, this.owner, amountIn);

      // Transfer output tokens from contract to user
      toContract.transfer(this.owner, user, amountOut);

      // Update pool reserves
      if (fromToken === pool.tokenA) {
        pool.reserveA += amountIn;
        pool.reserveB -= amountOut;
      } else {
        pool.reserveB += amountIn;
        pool.reserveA -= amountOut;
      }

      console.log(`🔄 Swap: ${amountIn} ${fromToken} -> ${amountOut} ${toToken} (${(priceImpact * 100).toFixed(2)}% impact)`);

      return {
        amountIn,
        amountOut,
        priceImpact,
        fee,
        success: true
      };

    } catch (error) {
      return {
        amountIn: 0,
        amountOut: 0,
        priceImpact: 0,
        fee: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateSwapAmounts(
    pool: Pool,
    fromToken: string,
    toToken: string,
    amountIn: number
  ): { amountOut: number, priceImpact: number, fee: number } {
    const reserveIn = fromToken === pool.tokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = toToken === pool.tokenA ? pool.reserveA : pool.reserveB;

    // Calculate fee
    const feeAmount = (amountIn * pool.fee) / 100;
    const amountInAfterFee = amountIn - feeAmount;

    // Calculate output using constant product formula (x * y = k)
    const amountOut = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);

    // Calculate price impact
    const priceBefore = reserveOut / reserveIn;
    const priceAfter = (reserveOut - amountOut) / (reserveIn + amountInAfterFee);
    const priceImpact = Math.abs(priceAfter - priceBefore) / priceBefore;

    return {
      amountOut,
      priceImpact,
      fee: feeAmount
    };
  }

  private getTokenContract(token: string): TokenContract {
    switch (token) {
      case 'DYO':
        return this.dyoContract;
      case 'DYS':
        return this.dysContract;
      default:
        throw new Error(`Unknown token: ${token}`);
    }
  }

  public getSwapQuote(
    fromToken: string,
    toToken: string,
    amountIn: number
  ): { amountOut: number, priceImpact: number, fee: number } | null {
    const pool = this.getPool(fromToken, toToken);
    if (!pool || !pool.isActive) {
      return null;
    }

    return this.calculateSwapAmounts(pool, fromToken, toToken, amountIn);
  }

  public getPoolStats(tokenA: string, tokenB: string) {
    const pool = this.getPool(tokenA, tokenB);
    if (!pool) {
      return null;
    }

    const totalValue = pool.reserveA + pool.reserveB; // Simplified calculation
    const volume24h = 0; // Would need to track historical data

    return {
      poolId: pool.id,
      tokenA: pool.tokenA,
      tokenB: pool.tokenB,
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      totalLiquidity: pool.totalLiquidity,
      totalValue,
      volume24h,
      fee: pool.fee,
      isActive: pool.isActive
    };
  }
}
