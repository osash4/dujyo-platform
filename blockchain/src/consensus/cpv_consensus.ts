import { v4 as uuidv4 } from 'uuid';
import { Block } from '../types/block.js';
import { Transaction } from '../types/tx.js';
import { DujyoState } from '../state.js';

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

export class CPVConsensus {
  private economicValidators: Map<string, CPVValidator>;
  private creativeValidators: Map<string, CPVValidator>;
  private communityValidators: Map<string, CPVValidator>;
  private validationHistory: ValidationRound[];
  private minimumStake: number;
  private minimumCreativeScore: number;
  private minimumCommunityScore: number;
  private lambdaEconomic: number;
  private lambdaCreative: number;
  private lambdaCommunity: number;

  constructor() {
    this.economicValidators = new Map();
    this.creativeValidators = new Map();
    this.communityValidators = new Map();
    this.validationHistory = [];
    this.minimumStake = 1000;
    this.minimumCreativeScore = 0.5;
    this.minimumCommunityScore = 0.3;
    this.lambdaEconomic = 0.4;
    this.lambdaCreative = 0.3;
    this.lambdaCommunity = 0.3;

    // Initialize with some demo validators
    this.initializeDemoValidators();
  }

  private initializeDemoValidators(): void {
    // Economic validators
    this.economicValidators.set('validator-econ-1', {
      address: 'validator-econ-1',
      validator_type: 'economic',
      score: 0.8,
      stake: 10000
    });

    this.economicValidators.set('validator-econ-2', {
      address: 'validator-econ-2',
      validator_type: 'economic',
      score: 0.7,
      stake: 8000
    });

    // Creative validators
    this.creativeValidators.set('validator-creative-1', {
      address: 'validator-creative-1',
      validator_type: 'creative',
      score: 0.9,
      verified_nfts: ['nft-1', 'nft-2', 'nft-3']
    });

    this.creativeValidators.set('validator-creative-2', {
      address: 'validator-creative-2',
      validator_type: 'creative',
      score: 0.8,
      verified_nfts: ['nft-4', 'nft-5']
    });

    // Community validators
    this.communityValidators.set('validator-community-1', {
      address: 'validator-community-1',
      validator_type: 'community',
      score: 0.85,
      community_activity: {
        votes: 150,
        reports: 25,
        curated: 50
      }
    });

    this.communityValidators.set('validator-community-2', {
      address: 'validator-community-2',
      validator_type: 'community',
      score: 0.75,
      community_activity: {
        votes: 100,
        reports: 15,
        curated: 30
      }
    });
  }

  public selectValidator(): Result<CPVValidator, string> {
    try {
      const allValidators: CPVValidator[] = [
        ...Array.from(this.economicValidators.values()),
        ...Array.from(this.creativeValidators.values()),
        ...Array.from(this.communityValidators.values())
      ];

      if (allValidators.length === 0) {
        return Err('No validators available');
      }

      // Calculate weighted scores
      const weightedValidators = allValidators.map(validator => {
        let weightedScore = 0;
        
        switch (validator.validator_type) {
          case 'economic':
            weightedScore = validator.score * this.lambdaEconomic;
            break;
          case 'creative':
            weightedScore = validator.score * this.lambdaCreative;
            break;
          case 'community':
            weightedScore = validator.score * this.lambdaCommunity;
            break;
        }

        return {
          validator,
          weightedScore
        };
      });

      // Sort by weighted score (descending)
      weightedValidators.sort((a, b) => b.weightedScore - a.weightedScore);

      // Select the top validator
      const selected = weightedValidators[0];
      if (!selected) {
        return Err('No validators available after weighting');
      }
      return Ok(selected.validator);
    } catch (error) {
      return Err(`Error selecting validator: ${error}`);
    }
  }

  public recordValidationRound(validator: CPVValidator, blockHash: string): void {
    const round: ValidationRound = {
      validator,
      block_hash: blockHash,
      timestamp: Date.now(),
      success: true
    };

    this.validationHistory.push(round);

    // Keep only last 100 validation rounds
    if (this.validationHistory.length > 100) {
      this.validationHistory = this.validationHistory.slice(-100);
    }
  }

  public getConsensusStats(): object {
    return {
      economic_validators: this.economicValidators.size,
      creative_validators: this.creativeValidators.size,
      community_validators: this.communityValidators.size,
      total_validators: this.economicValidators.size + this.creativeValidators.size + this.communityValidators.size,
      validation_rounds: this.validationHistory.length,
      consensus_parameters: {
        lambda_economic: this.lambdaEconomic,
        lambda_creative: this.lambdaCreative,
        lambda_community: this.lambdaCommunity,
        minimum_stake: this.minimumStake,
        minimum_creative_score: this.minimumCreativeScore,
        minimum_community_score: this.minimumCommunityScore
      },
      recent_rounds: this.validationHistory.slice(-10)
    };
  }

  public addEconomicValidator(address: string, stake: number): Result<void, string> {
    if (stake < this.minimumStake) {
      return Err(`Stake ${stake} is below minimum ${this.minimumStake}`);
    }

    const validator: CPVValidator = {
      address,
      validator_type: 'economic',
      score: Math.min(stake / 10000, 1.0), // Score based on stake
      stake
    };

    this.economicValidators.set(address, validator);
    return Ok(undefined);
  }

  public addCreativeValidator(address: string, verifiedNfts: string[]): Result<void, string> {
    const score = Math.min(verifiedNfts.length / 10, 1.0); // Score based on NFT count
    
    if (score < this.minimumCreativeScore) {
      return Err(`Creative score ${score} is below minimum ${this.minimumCreativeScore}`);
    }

    const validator: CPVValidator = {
      address,
      validator_type: 'creative',
      score,
      verified_nfts: verifiedNfts
    };

    this.creativeValidators.set(address, validator);
    return Ok(undefined);
  }

  public addCommunityValidator(address: string, activity: { votes: number; reports: number; curated: number }): Result<void, string> {
    const score = Math.min((activity.votes + activity.reports + activity.curated) / 200, 1.0);
    
    if (score < this.minimumCommunityScore) {
      return Err(`Community score ${score} is below minimum ${this.minimumCommunityScore}`);
    }

    const validator: CPVValidator = {
      address,
      validator_type: 'community',
      score,
      community_activity: activity
    };

    this.communityValidators.set(address, validator);
    return Ok(undefined);
  }
}

// Simple Result type implementation
export type Result<T, E> = OkResult<T> | ErrResult<E>;

export class OkResult<T> {
  constructor(public value: T) {}
  
  isOk(): this is OkResult<T> {
    return true;
  }
  
  isErr(): this is ErrResult<never> {
    return false;
  }
  
  unwrap(): T {
    return this.value;
  }
}

export class ErrResult<E> {
  constructor(public error: E) {}
  
  isOk(): this is OkResult<never> {
    return false;
  }
  
  isErr(): this is ErrResult<E> {
    return true;
  }
  
  unwrap(): never {
    throw new Error(`Called unwrap on Err: ${this.error}`);
  }
}

export function Ok<T>(value: T): OkResult<T> {
  return new OkResult(value);
}

export function Err<E>(error: E): ErrResult<E> {
  return new ErrResult(error);
}