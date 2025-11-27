import { Token } from '../types';
export interface TokenContractConfig {
    symbol: string;
    name: string;
    decimals: number;
    maxSupply?: number;
    isMintable: boolean;
    isBurnable: boolean;
    initialSupply?: number;
}
export declare class TokenContract {
    private config;
    private balances;
    private allowances;
    private totalSupply;
    private isPaused;
    private owner;
    constructor(config: TokenContractConfig, owner: string);
    getTokenInfo(): Token;
    getBalance(address: string): number;
    getTotalSupply(): number;
    transfer(from: string, to: string, amount: number): boolean;
    mint(to: string, amount: number): boolean;
    burn(from: string, amount: number): boolean;
    approve(owner: string, spender: string, amount: number): boolean;
    allowance(owner: string, spender: string): number;
    transferFrom(from: string, to: string, amount: number, spender: string): boolean;
    pause(): boolean;
    unpause(): boolean;
    isContractPaused(): boolean;
    getAllBalances(): Map<string, number>;
    getTopHolders(limit?: number): Array<{
        address: string;
        balance: number;
    }>;
    getTokenStats(): {
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
}
export declare class XWVTokenContract extends TokenContract {
    constructor(owner: string);
}
export declare class USXWVTokenContract extends TokenContract {
    constructor(owner: string);
}
//# sourceMappingURL=token_contract.d.ts.map