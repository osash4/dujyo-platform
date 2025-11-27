export class TokenContract {
    constructor(config, owner) {
        this.balances = new Map();
        this.allowances = new Map();
        this.totalSupply = 0;
        this.isPaused = false;
        this.config = config;
        this.owner = owner;
        // Mint initial supply if specified
        if (config.initialSupply && config.initialSupply > 0) {
            this.mint(owner, config.initialSupply);
        }
        console.log(`🪙 Created token contract: ${config.name} (${config.symbol})`);
    }
    getTokenInfo() {
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
    getBalance(address) {
        return this.balances.get(address) || 0;
    }
    getTotalSupply() {
        return this.totalSupply;
    }
    transfer(from, to, amount) {
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
    mint(to, amount) {
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
    burn(from, amount) {
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
    approve(owner, spender, amount) {
        if (this.isPaused) {
            throw new Error('Contract is paused');
        }
        if (!this.allowances.has(owner)) {
            this.allowances.set(owner, new Map());
        }
        this.allowances.get(owner).set(spender, amount);
        console.log(`✅ Approved ${spender} to spend ${amount} ${this.config.symbol} from ${owner}`);
        return true;
    }
    allowance(owner, spender) {
        return this.allowances.get(owner)?.get(spender) || 0;
    }
    transferFrom(from, to, amount, spender) {
        if (this.isPaused) {
            throw new Error('Contract is paused');
        }
        const allowance = this.allowance(from, spender);
        if (allowance < amount) {
            throw new Error('Insufficient allowance');
        }
        // Update allowance
        this.allowances.get(from).set(spender, allowance - amount);
        // Transfer tokens
        return this.transfer(from, to, amount);
    }
    pause() {
        if (this.isPaused) {
            return false;
        }
        this.isPaused = true;
        console.log(`⏸️  Contract paused`);
        return true;
    }
    unpause() {
        if (!this.isPaused) {
            return false;
        }
        this.isPaused = false;
        console.log(`▶️  Contract unpaused`);
        return true;
    }
    isContractPaused() {
        return this.isPaused;
    }
    getAllBalances() {
        return new Map(this.balances);
    }
    getTopHolders(limit = 10) {
        return Array.from(this.balances.entries())
            .map(([address, balance]) => ({ address, balance }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
    }
    getTokenStats() {
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
    constructor(owner) {
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
    constructor(owner) {
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
//# sourceMappingURL=token_contract.js.map