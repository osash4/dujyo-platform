export interface CPVValidator {
    address: string;
    validator_type: 'economic' | 'creative' | 'community';
    score: number;
    stake?: number;
    verified_nfts?: string[];
    community_activity?: {
        votes: number;
        reports: number;
        curated: number;
    };
}
export interface ValidationRound {
    validator: CPVValidator;
    block_hash: string;
    timestamp: number;
    success: boolean;
}
export declare class CPVConsensus {
    private economicValidators;
    private creativeValidators;
    private communityValidators;
    private validationHistory;
    private minimumStake;
    private minimumCreativeScore;
    private minimumCommunityScore;
    private lambdaEconomic;
    private lambdaCreative;
    private lambdaCommunity;
    constructor();
    private initializeDemoValidators;
    selectValidator(): Result<CPVValidator, string>;
    recordValidationRound(validator: CPVValidator, blockHash: string): void;
    getConsensusStats(): object;
    addEconomicValidator(address: string, stake: number): Result<void, string>;
    addCreativeValidator(address: string, verifiedNfts: string[]): Result<void, string>;
    addCommunityValidator(address: string, activity: {
        votes: number;
        reports: number;
        curated: number;
    }): Result<void, string>;
}
export type Result<T, E> = OkResult<T> | ErrResult<E>;
export declare class OkResult<T> {
    value: T;
    constructor(value: T);
    isOk(): this is OkResult<T>;
    isErr(): this is ErrResult<never>;
    unwrap(): T;
}
export declare class ErrResult<E> {
    error: E;
    constructor(error: E);
    isOk(): this is OkResult<never>;
    isErr(): this is ErrResult<E>;
    unwrap(): never;
}
export declare function Ok<T>(value: T): OkResult<T>;
export declare function Err<E>(error: E): ErrResult<E>;
//# sourceMappingURL=cpv_consensus.d.ts.map