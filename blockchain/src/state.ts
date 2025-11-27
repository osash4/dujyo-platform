export interface NodeState {
  currentBlock: number;
  peers: string[];
  mempool: any[];
  consensus: 'cpv' | 'pow' | 'pos';
}

export class DujyoState implements NodeState {
  currentBlock: number = 0;
  peers: string[] = [];
  mempool: any[] = [];
  consensus: 'cpv' = 'cpv';
  
  constructor() {}
  
  addPeer(peer: string): void {
    if (!this.peers.includes(peer)) {
      this.peers.push(peer);
    }
  }
  
  addToMempool(tx: any): void {
    this.mempool.push(tx);
  }
}
