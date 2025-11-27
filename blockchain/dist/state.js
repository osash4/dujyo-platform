export class XWaveState {
    constructor() {
        this.currentBlock = 0;
        this.peers = [];
        this.mempool = [];
        this.consensus = 'cpv';
    }
    addPeer(peer) {
        if (!this.peers.includes(peer)) {
            this.peers.push(peer);
        }
    }
    addToMempool(tx) {
        this.mempool.push(tx);
    }
}
//# sourceMappingURL=state.js.map