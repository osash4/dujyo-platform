import { EventEmitter } from 'events';
import { CPVNode } from '../consensus/cpv_node.js';
import { CPVConsensus } from '../consensus/cpv_consensus.js';
import { DYOTokenContract, DYSTokenContract } from '../contracts/token_contract.js';
import { SwapContract } from '../contracts/swap_contract.js';
import { StakingContract } from '../contracts/staking_contract.js';
import { TransactionType } from '../types/index.js';
export class BlockchainNode extends EventEmitter {
    constructor(config) {
        super();
        this.wallets = new Map();
        this.isRunning = false;
        this.config = config;
        // Initialize CPV consensus and node
        const cpvConsensus = new CPVConsensus();
        this.cpvNode = new CPVNode(cpvConsensus);
        // Initialize token contracts
        this.dyoContract = new DYOTokenContract(config.adminAddress);
        this.dysContract = new DYSTokenContract(config.adminAddress);
        // Initialize swap contract
        this.swapContract = new SwapContract({
            fee: 0.3, // 0.3% fee
            minLiquidity: 100,
            maxSlippage: 5.0 // 5% max slippage
        }, this.dyoContract, this.dysContract, config.adminAddress);
        // Initialize staking contract
        this.stakingContract = new StakingContract({
            minStake: 1000,
            maxStake: 1000000,
            lockPeriod: 30 * 24 * 3600, // 30 days
            rewardRate: 12, // 12% APY
            fee: 1.0 // 1% unstaking fee
        }, this.xwvContract, config.adminAddress);
        this.setupEventHandlers();
        this.initializeWallets();
    }
    setupEventHandlers() {
        // CPVNode doesn't have event emitters, so we'll handle this differently
        console.log('🚀 Blockchain node setup complete');
    }
    initializeWallets() {
        // Create admin wallet
        this.createWallet(this.config.adminAddress);
        // Initialize with some liquidity for testing
        this.addInitialLiquidity();
    }
    addInitialLiquidity() {
        try {
            // Add initial liquidity to XWV/USXWV pool
            this.swapContract.addLiquidity(this.config.adminAddress, 'XWV', 'USXWV', 100000, // 100k XWV
            100000 // 100k USXWV
            );
            console.log('🏊 Initial liquidity added to XWV/USXWV pool');
        }
        catch (error) {
            console.error('Failed to add initial liquidity:', error);
        }
    }
    start() {
        this.cpvNode.start();
        this.isRunning = true;
        this.emit('started');
    }
    stop() {
        this.cpvNode.stop();
        this.isRunning = false;
        this.emit('stopped');
    }
    processBlock(block) {
        console.log(`📦 Processing block ${block.header.height}`);
        // Process all transactions in the block
        for (const tx of block.transactions) {
            this.processTransaction(tx);
        }
    }
    processTransaction(tx) {
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
        }
        catch (error) {
            console.error(`❌ Error processing transaction:`, error);
        }
    }
    processTransfer(tx) {
        // Determine which token contract to use based on amount or context
        // For simplicity, we'll use XWV for transfers
        this.xwvContract.transfer(tx.from, tx.to, tx.amount);
        this.updateWalletNonce(tx.from);
    }
    processMint(tx) {
        if (tx.data?.tokenType === 'XWV') {
            this.xwvContract.mint(tx.data.recipient, tx.data.amount);
        }
        else if (tx.data?.tokenType === 'USXWV') {
            this.usxwvContract.mint(tx.data.recipient, tx.data.amount);
        }
    }
    processStake(tx) {
        const result = this.stakingContract.stake(tx.from, tx.data?.amount || tx.amount);
        if (!result.success) {
            throw new Error(result.error);
        }
    }
    processUnstake(tx) {
        const result = this.stakingContract.unstake(tx.from, tx.data?.positionId || '');
        if (!result.success) {
            throw new Error(result.error);
        }
    }
    processSwap(tx) {
        const result = this.swapContract.swap(tx.from, tx.data?.fromToken || 'XWV', tx.data?.toToken || 'USXWV', tx.data?.amountIn || tx.amount, tx.data?.minAmountOut || 0, tx.data?.slippage || 5.0);
        if (!result.success) {
            throw new Error(result.error);
        }
    }
    processAddLiquidity(tx) {
        this.swapContract.addLiquidity(tx.from, tx.data?.tokenA || 'XWV', tx.data?.tokenB || 'USXWV', tx.data?.amountA || 0, tx.data?.amountB || 0);
    }
    processRemoveLiquidity(tx) {
        this.swapContract.removeLiquidity(tx.from, tx.data?.tokenA || 'XWV', tx.data?.tokenB || 'USXWV', tx.data?.liquidity || 0);
    }
    updateWalletNonce(address) {
        const wallet = this.wallets.get(address);
        if (wallet) {
            wallet.nonce++;
        }
    }
    createWallet(address) {
        const wallet = {
            address,
            balances: new Map(),
            nonce: 0,
            isActive: true
        };
        this.wallets.set(address, wallet);
        console.log(`👛 Created wallet for ${address}`);
        return wallet;
    }
    getWallet(address) {
        return this.wallets.get(address) || null;
    }
    getBalance(address, token = 'XWV') {
        if (token === 'XWV') {
            return this.xwvContract.getBalance(address);
        }
        else {
            return this.usxwvContract.getBalance(address);
        }
    }
    getAllBalances(address) {
        return {
            XWV: this.xwvContract.getBalance(address),
            USXWV: this.usxwvContract.getBalance(address)
        };
    }
    mintTokens(to, amount, token = 'XWV') {
        try {
            if (token === 'XWV') {
                this.xwvContract.mint(to, amount);
            }
            else {
                this.usxwvContract.mint(to, amount);
            }
            return true;
        }
        catch (error) {
            console.error('❌ Mint failed:', error);
            return false;
        }
    }
    transferTokens(from, to, amount, token = 'XWV') {
        try {
            if (token === 'XWV') {
                this.xwvContract.transfer(from, to, amount);
            }
            else {
                this.usxwvContract.transfer(from, to, amount);
            }
            this.updateWalletNonce(from);
            return true;
        }
        catch (error) {
            console.error('❌ Transfer failed:', error);
            return false;
        }
    }
    swapTokens(user, fromToken, toToken, amountIn, minAmountOut) {
        return this.swapContract.swap(user, fromToken, toToken, amountIn, minAmountOut);
    }
    getSwapQuote(fromToken, toToken, amountIn) {
        return this.swapContract.getSwapQuote(fromToken, toToken, amountIn);
    }
    stakeTokens(user, amount) {
        return this.stakingContract.stake(user, amount);
    }
    unstakeTokens(user, positionId) {
        return this.stakingContract.unstake(user, positionId);
    }
    claimRewards(user, positionId) {
        return this.stakingContract.claimRewards(user, positionId);
    }
    getStakingPositions(user) {
        return this.stakingContract.getUserPositions(user);
    }
    getNodeInfo() {
        return {
            ...this.cpvNode.getNodeStats(),
            contracts: {
                xwv: this.xwvContract.getTokenStats(),
                usxwv: this.usxwvContract.getTokenStats(),
                swap: this.swapContract.getAllPools(),
                staking: this.stakingContract.getStakingStats()
            },
            wallets: this.wallets.size
        };
    }
    getNetworkStats() {
        return {
            totalBlocks: 0, // CPVNode doesn't track blockchain
            totalTransactions: 0, // CPVNode doesn't track transactions
            mempoolSize: 0, // CPVNode doesn't track mempool
            totalWallets: this.wallets.size,
            totalStake: this.stakingContract.getStakingStats().totalStaked,
            totalLiquidity: this.swapContract.getAllPools().reduce((sum, pool) => sum + pool.totalLiquidity, 0)
        };
    }
    isNodeRunning() {
        return this.isRunning;
    }
}
//# sourceMappingURL=blockchain_node.js.map