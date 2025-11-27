export class CPVConsensus {
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
    initializeDemoValidators() {
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
    selectValidator() {
        try {
            const allValidators = [
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
        }
        catch (error) {
            return Err(`Error selecting validator: ${error}`);
        }
    }
    recordValidationRound(validator, blockHash) {
        const round = {
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
    getConsensusStats() {
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
    addEconomicValidator(address, stake) {
        if (stake < this.minimumStake) {
            return Err(`Stake ${stake} is below minimum ${this.minimumStake}`);
        }
        const validator = {
            address,
            validator_type: 'economic',
            score: Math.min(stake / 10000, 1.0), // Score based on stake
            stake
        };
        this.economicValidators.set(address, validator);
        return Ok(undefined);
    }
    addCreativeValidator(address, verifiedNfts) {
        const score = Math.min(verifiedNfts.length / 10, 1.0); // Score based on NFT count
        if (score < this.minimumCreativeScore) {
            return Err(`Creative score ${score} is below minimum ${this.minimumCreativeScore}`);
        }
        const validator = {
            address,
            validator_type: 'creative',
            score,
            verified_nfts: verifiedNfts
        };
        this.creativeValidators.set(address, validator);
        return Ok(undefined);
    }
    addCommunityValidator(address, activity) {
        const score = Math.min((activity.votes + activity.reports + activity.curated) / 200, 1.0);
        if (score < this.minimumCommunityScore) {
            return Err(`Community score ${score} is below minimum ${this.minimumCommunityScore}`);
        }
        const validator = {
            address,
            validator_type: 'community',
            score,
            community_activity: activity
        };
        this.communityValidators.set(address, validator);
        return Ok(undefined);
    }
}
export class OkResult {
    constructor(value) {
        this.value = value;
    }
    isOk() {
        return true;
    }
    isErr() {
        return false;
    }
    unwrap() {
        return this.value;
    }
}
export class ErrResult {
    constructor(error) {
        this.error = error;
    }
    isOk() {
        return false;
    }
    isErr() {
        return true;
    }
    unwrap() {
        throw new Error(`Called unwrap on Err: ${this.error}`);
    }
}
export function Ok(value) {
    return new OkResult(value);
}
export function Err(error) {
    return new ErrResult(error);
}
//# sourceMappingURL=cpv_consensus.js.map