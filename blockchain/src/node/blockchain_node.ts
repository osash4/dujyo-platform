import { EventEmitter } from 'events';
import { CPVNode } from '../consensus/cpv_node.js';
import { CPVConsensus } from '../consensus/cpv_consensus.js';
import { DYOTokenContract, DYSTokenContract } from '../contracts/token_contract.js';
import { SwapContract } from '../contracts/swap_contract.js';
import { StakingContract } from '../contracts/staking_contract.js';
import { Transaction, TransactionType, Block, Wallet } from '../types/index.js';
import { DujyoState } from '../state.js';

export interface BlockchainConfig {
  nodeId: string;
  port: number;
  isValidator: boolean;
  stake: number;
  peers: string[];
  adminAddress: string;
}

export class BlockchainNode extends EventEmitter {
  private config: BlockchainConfig;
  private cpvNode: CPVNode;
  private dyoContract: DYOTokenContract;
  private dysContract: DYSTokenContract;
  private swapContract: SwapContract;
  private stakingContract: StakingContract;
  private wallets: Map<string, Wallet> = new Map();
  private isRunning = false;

  constructor(config: BlockchainConfig) {
    super();
    this.config = config;
    
    // Initialize CPV consensus and node
    const cpvConsensus = new CPVConsensus();
    this.cpvNode = new CPVNode(cpvConsensus);

    // Initialize token contracts
    this.dyoContract = new DYOTokenContract(config.adminAddress);
    this.dysContract = new DYSTokenContract(config.adminAddress);

    // Initialize swap contract
    this.swapContract = new SwapContract(
      {
        fee: 0.3, // 0.3% fee
        minLiquidity: 100,
        maxSlippage: 5.0 // 5% max slippage
      },
      this.dyoContract,
      this.dysContract,
      config.adminAddress
    );

    // Initialize staking contract
    this.stakingContract = new StakingContract(
      {
        minStake: 1000,
        maxStake: 1000000,
        lockPeriod: 30 * 24 * 3600, // 30 days
        rewardRate: 12, // 12% APY
        fee: 1.0 // 1% unstaking fee
      },
      this.dyoContract,
      config.adminAddress
    );

    this.setupEventHandlers();
    this.initializeWallets();
  }

  private setupEventHandlers() {
    // CPVNode doesn't have event emitters, so we'll handle this differently
    console.log('🚀 Blockchain node setup complete');
  }

  private initializeWallets() {
    // Create admin wallet
    this.createWallet(this.config.adminAddress);
    
    // Initialize with some liquidity for testing
    this.addInitialLiquidity();
  }

  private addInitialLiquidity() {
    try {
      // Add initial liquidity to DYO/DYS pool
      this.swapContract.addLiquidity(
        this.config.adminAddress,
        'DYO',
        'DYS',
        100000, // 100k DYO
        100000  // 100k DYS
      );
      
      console.log('🏊 Initial liquidity added to DYO/DYS pool');
    } catch (error) {
      console.error('Failed to add initial liquidity:', error);
    }
  }

  public start() {
    this.cpvNode.start();
    this.isRunning = true;
    this.emit('started');
  }

  public stop() {
    this.cpvNode.stop();
    this.isRunning = false;
    this.emit('stopped');
  }

  private processBlock(block: Block) {
    console.log(`📦 Processing block ${block.header.height}`);
    
    // Process all transactions in the block
    for (const tx of block.transactions) {
      this.processTransaction(tx);
    }
  }

  private processTransaction(tx: Transaction) {
    try {
      switch (tx.type) {
        case TransactionType.TRANSFER:
          this.processTransfer(tx);
          break;
        case TransactionType.MINT:
          this.processMint(tx);
          break;
        case TransactionType.STAKE:
          this.processStake(tx);
          break;
        case TransactionType.UNSTAKE:
          this.processUnstake(tx);
          break;
        case TransactionType.SWAP:
          this.processSwap(tx);
          break;
        case TransactionType.ADD_LIQUIDITY:
          this.processAddLiquidity(tx);
          break;
        case TransactionType.REMOVE_LIQUIDITY:
          this.processRemoveLiquidity(tx);
          break;
        default:
          console.log(`⚠️  Unknown transaction type: ${tx.type}`);
      }
    } catch (error) {
      console.error(`❌ Error processing transaction:`, error);
    }
  }

  private processTransfer(tx: Transaction) {
    // Determine which token contract to use based on amount or context
    // For simplicity, we'll use DYO for transfers
    this.dyoContract.transfer(tx.from, tx.to, tx.amount);
    this.updateWalletNonce(tx.from);
  }

  private processMint(tx: Transaction) {
    if (tx.data?.tokenType === 'DYO') {
      this.dyoContract.mint(tx.data.recipient, tx.data.amount);
    } else if (tx.data?.tokenType === 'DYS') {
      this.dysContract.mint(tx.data.recipient, tx.data.amount);
    }
  }

  private processStake(tx: Transaction) {
    const result = this.stakingContract.stake(tx.from, tx.data?.amount || tx.amount);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  private processUnstake(tx: Transaction) {
    const result = this.stakingContract.unstake(tx.from, tx.data?.positionId || '');
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  private processSwap(tx: Transaction) {
    const result = this.swapContract.swap(
      tx.from,
      tx.data?.fromToken || 'DYO',
      tx.data?.toToken || 'DYS',
      tx.data?.amountIn || tx.amount,
      tx.data?.minAmountOut || 0,
      tx.data?.slippage || 5.0
    );

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  private processAddLiquidity(tx: Transaction) {
    this.swapContract.addLiquidity(
      tx.from,
      tx.data?.tokenA || 'DYO',
      tx.data?.tokenB || 'DYS',
      tx.data?.amountA || 0,
      tx.data?.amountB || 0
    );
  }

  private processRemoveLiquidity(tx: Transaction) {
    this.swapContract.removeLiquidity(
      tx.from,
      tx.data?.tokenA || 'DYO',
      tx.data?.tokenB || 'DYS',
      tx.data?.liquidity || 0
    );
  }

  private updateWalletNonce(address: string) {
    const wallet = this.wallets.get(address);
    if (wallet) {
      wallet.nonce++;
    }
  }

  public createWallet(address: string): Wallet {
    const wallet: Wallet = {
      address,
      balances: new Map(),
      nonce: 0,
      isActive: true
    };

    this.wallets.set(address, wallet);
    console.log(`👛 Created wallet for ${address}`);
    return wallet;
  }

  public getWallet(address: string): Wallet | null {
    return this.wallets.get(address) || null;
  }

  public getBalance(address: string, token: 'DYO' | 'DYS' = 'DYO'): number {
    if (token === 'DYO') {
      return this.dyoContract.getBalance(address);
    } else {
      return this.dysContract.getBalance(address);
    }
  }

  public getAllBalances(address: string) {
    return {
      DYO: this.dyoContract.getBalance(address),
      DYS: this.dysContract.getBalance(address)
    };
  }

  public mintTokens(to: string, amount: number, token: 'DYO' | 'DYS' = 'DYO'): boolean {
    try {
      if (token === 'DYO') {
        this.dyoContract.mint(to, amount);
      } else {
        this.dysContract.mint(to, amount);
      }
      return true;
    } catch (error) {
      console.error('❌ Mint failed:', error);
      return false;
    }
  }

  public transferTokens(from: string, to: string, amount: number, token: 'DYO' | 'DYS' = 'DYO'): boolean {
    try {
      if (token === 'DYO') {
        this.dyoContract.transfer(from, to, amount);
      } else {
        this.dysContract.transfer(from, to, amount);
      }
      this.updateWalletNonce(from);
      return true;
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      return false;
    }
  }

  public swapTokens(
    user: string,
    fromToken: 'DYO' | 'DYS',
    toToken: 'DYO' | 'DYS',
    amountIn: number,
    minAmountOut: number
  ) {
    return this.swapContract.swap(user, fromToken, toToken, amountIn, minAmountOut);
  }

  public getSwapQuote(
    fromToken: 'DYO' | 'DYS',
    toToken: 'DYO' | 'DYS',
    amountIn: number
  ) {
    return this.swapContract.getSwapQuote(fromToken, toToken, amountIn);
  }

  public stakeTokens(user: string, amount: number) {
    return this.stakingContract.stake(user, amount);
  }

  public unstakeTokens(user: string, positionId: string) {
    return this.stakingContract.unstake(user, positionId);
  }

  public claimRewards(user: string, positionId: string) {
    return this.stakingContract.claimRewards(user, positionId);
  }

  public getStakingPositions(user: string) {
    return this.stakingContract.getUserPositions(user);
  }

  public getNodeInfo() {
    return {
      ...this.cpvNode.getNodeStats(),
      contracts: {
        dyo: this.dyoContract.getTokenStats(),
        dys: this.dysContract.getTokenStats(),
        swap: this.swapContract.getAllPools(),
        staking: this.stakingContract.getStakingStats()
      },
      wallets: this.wallets.size
    };
  }

  public getNetworkStats() {
    return {
      totalBlocks: 0, // CPVNode doesn't track blockchain
      totalTransactions: 0, // CPVNode doesn't track transactions
      mempoolSize: 0, // CPVNode doesn't track mempool
      totalWallets: this.wallets.size,
      totalStake: this.stakingContract.getStakingStats().totalStaked,
      totalLiquidity: this.swapContract.getAllPools().reduce((sum: number, pool: any) => sum + pool.totalLiquidity, 0)
    };
  }

  public isNodeRunning(): boolean {
    return this.isRunning;
  }
}
