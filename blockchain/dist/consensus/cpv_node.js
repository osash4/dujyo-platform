import { v4 as uuidv4 } from 'uuid';
export class CPVNode {
    constructor(consensus) {
        this.nodeId = `node-${uuidv4().substring(0, 8)}`;
        this.consensus = consensus;
        this.isRunning = false;
        this.lastBlockTime = Date.now();
    }
    getNodeId() {
        return this.nodeId;
    }
    start() {
        if (this.isRunning) {
            console.log('Node is already running');
            return;
        }
        this.isRunning = true;
        console.log(` CPV Node ${this.nodeId} started`);
        // Start consensus process
        this.startConsensusProcess();
    }
    stop() {
        if (!this.isRunning) {
            console.log('Node is not running');
            return;
        }
        this.isRunning = false;
        console.log(` CPV Node ${this.nodeId} stopped`);
    }
    isNodeRunning() {
        return this.isRunning;
    }
    getLastBlockTime() {
        return this.lastBlockTime;
    }
    startConsensusProcess() {
        if (!this.isRunning)
            return;
        // Simulate block production every 10 seconds
        setTimeout(() => {
            if (this.isRunning) {
                this.produceBlock();
                this.startConsensusProcess(); // Continue the process
            }
        }, 10000);
    }
    produceBlock() {
        try {
            // Select validator using CPV consensus
            const selectedValidator = this.consensus.selectValidator();
            if (selectedValidator.isOk()) {
                const validator = selectedValidator.unwrap();
                console.log(` Block produced by ${validator.address} (${validator.validator_type})`);
                // Update last block time
                this.lastBlockTime = Date.now();
                // Record validation round
                const blockHash = this.generateBlockHash();
                this.consensus.recordValidationRound(validator, blockHash);
                console.log(` Block ${blockHash.substring(0, 8)}... validated`);
            }
            else {
                console.log(' No validator selected for block production');
            }
        }
        catch (error) {
            console.error('Error producing block:', error);
        }
    }
    generateBlockHash() {
        // Simple hash generation for demo purposes
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `block_${timestamp}_${random}`;
    }
    getNodeStats() {
        return {
            nodeId: this.nodeId,
            isRunning: this.isRunning,
            lastBlockTime: this.lastBlockTime,
            consensus: 'CPV',
            uptime: this.isRunning ? Date.now() - this.lastBlockTime : 0
        };
    }
}
//# sourceMappingURL=cpv_node.js.map