import { CPVConsensus } from './cpv_consensus';
export declare class CPVNode {
    private nodeId;
    private consensus;
    private isRunning;
    private lastBlockTime;
    constructor(consensus: CPVConsensus);
    getNodeId(): string;
    start(): void;
    stop(): void;
    isNodeRunning(): boolean;
    getLastBlockTime(): number;
    private startConsensusProcess;
    private produceBlock;
    private generateBlockHash;
    getNodeStats(): object;
}
//# sourceMappingURL=cpv_node.d.ts.map