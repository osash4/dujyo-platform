export interface NodeState {
    currentBlock: number;
    peers: string[];
    mempool: any[];
    consensus: 'cpv' | 'pow' | 'pos';
}
export declare class XWaveState implements NodeState {
    currentBlock: number;
    peers: string[];
    mempool: any[];
    consensus: 'cpv';
    constructor();
    addPeer(peer: string): void;
    addToMempool(tx: any): void;
}
//# sourceMappingURL=state.d.ts.map