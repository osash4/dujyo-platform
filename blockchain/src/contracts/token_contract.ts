import { createHash } from 'crypto';
import { Transaction, TransactionType, Token, TokenBalance, Wallet } from '../types';

export interface TokenContractConfig {
  symbol: string;
  name: string;
  decimals: number;
  maxSupply?: number;
  isMintable: boolean;
  isBurnable: boolean;
  initialSupply?: number;
}

export class TokenContract {
  private config: TokenContractConfig;
  private balances: Map<string, number> = new Map();
  private allowances: Map<string, Map<string, number>> = new Map();
  private totalSupply: number = 0;
  private isPaused: boolean = false;
  private owner: string;

  constructor(config: TokenContractConfig, owner: string) {
    this.config = config;
    this.owner = owner;
    
    // Mint initial supply if specified
    if (config.initialSupply && config.initialSupply > 0) {
      this.mint(owner, config.initialSupply);
    }
    
    console.log(`🪙 Created token contract: ${config.name} (${config.symbol})`);
  }

  public getTokenInfo(): Token {
    return {
      symbol: this.config.symbol,
      name: this.config.name,
      decimals: this.config.decimals,
      totalSupply: this.totalSupply,
      maxSupply: this.config.maxSupply,
      isMintable: this.config.isMintable,
      isBurnable: this.config.isBurnable
    };
  }

  public getBalance(address: string): number {
    return this.balances.get(address) || 0;
  }

  public getTotalSupply(): number {
    return this.totalSupply;
  }

  public transfer(from: string, to: string, amount: number): boolean {
    if (this.isPaused) {
      throw new Error('Contract is paused');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const fromBalance = this.getBalance(from);
    if (fromBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Update balances
    this.balances.set(from, fromBalance - amount);
    this.balances.set(to, this.getBalance(to) + amount);

    console.log(`💸 Transfer: ${from} -> ${to} (${amount} ${this.config.symbol})`);
    return true;
  }

  public mint(to: string, amount: number): boolean {
    if (!this.config.isMintable) {
      throw new Error('Token is not mintable');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Check max supply
    if (this.config.maxSupply && this.totalSupply + amount > this.config.maxSupply) {
      throw new Error('Mint would exceed max supply');
    }

    this.balances.set(to, this.getBalance(to) + amount);
    this.totalSupply += amount;

    console.log(`🪙 Minted ${amount} ${this.config.symbol} to ${to}`);
    return true;
  }

  public burn(from: string, amount: number): boolean {
    if (!this.config.isBurnable) {
      throw new Error('Token is not burnable');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = this.getBalance(from);
    if (balance < amount) {
      throw new Error('Insufficient balance to burn');
    }

    this.balances.set(from, balance - amount);
    this.totalSupply -= amount;

    console.log(`🔥 Burned ${amount} ${this.config.symbol} from ${from}`);
    return true;
  }

  public approve(owner: string, spender: string, amount: number): boolean {
    if (this.isPaused) {
      throw new Error('Contract is paused');
    }

    if (!this.allowances.has(owner)) {
      this.allowances.set(owner, new Map());
    }

    this.allowances.get(owner)!.set(spender, amount);
    console.log(`✅ Approved ${spender} to spend ${amount} ${this.config.symbol} from ${owner}`);
    return true;
  }

  public allowance(owner: string, spender: string): number {
    return this.allowances.get(owner)?.get(spender) || 0;
  }

  public transferFrom(from: string, to: string, amount: number, spender: string): boolean {
    if (this.isPaused) {
      throw new Error('Contract is paused');
    }

    const allowance = this.allowance(from, spender);
    if (allowance < amount) {
      throw new Error('Insufficient allowance');
    }

    // Update allowance
    this.allowances.get(from)!.set(spender, allowance - amount);

    // Transfer tokens
    return this.transfer(from, to, amount);
  }

  public pause(): boolean {
    if (this.isPaused) {
      return false;
    }

    this.isPaused = true;
    console.log(`⏸️  Contract paused`);
    return true;
  }

  public unpause(): boolean {
    if (!this.isPaused) {
      return false;
    }

    this.isPaused = false;
    console.log(`▶️  Contract unpaused`);
    return true;
  }

  public isContractPaused(): boolean {
    return this.isPaused;
  }

  public getAllBalances(): Map<string, number> {
    return new Map(this.balances);
  }

  public getTopHolders(limit: number = 10): Array<{address: string, balance: number}> {
    return Array.from(this.balances.entries())
      .map(([address, balance]) => ({ address, balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  public getTokenStats() {
    const holders = this.balances.size;
    const topHolders = this.getTopHolders(5);
    const averageBalance = holders > 0 ? this.totalSupply / holders : 0;

    return {
      symbol: this.config.symbol,
      name: this.config.name,
      totalSupply: this.totalSupply,
      maxSupply: this.config.maxSupply,
      holders,
      averageBalance,
      topHolders,
      isPaused: this.isPaused,
      isMintable: this.config.isMintable,
      isBurnable: this.config.isBurnable
    };
  }
}

export class DYOTokenContract extends TokenContract {
  constructor(owner: string) {
    super({
      symbol: 'DYO',
      name: 'Dujyo Token',
      decimals: 18,
      maxSupply: 1000000000, // 1 billion tokens
      isMintable: true,
      isBurnable: true,
      initialSupply: 10000000 // 10 million initial supply
    }, owner);
  }
}

export class DYSTokenContract extends TokenContract {
  constructor(owner: string) {
    super({
      symbol: 'DYS',
      name: 'Dujyo USD Stablecoin',
      decimals: 18,
      maxSupply: 10000000000, // 10 billion tokens
      isMintable: true,
      isBurnable: true,
      initialSupply: 1000000 // 1 million initial supply
    }, owner);
  }
}
