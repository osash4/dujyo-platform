import { DujyoState } from '../state.js';
import { Block } from '../types/block.js';
import { Transaction } from '../types/tx.js';

export class StateApplier {
  state: DujyoState;

  constructor(state: DujyoState) {
    this.state = state;
  }

  applyBlock(block: Block) {
    // Validar bloque (hash, firmas, etc.)
    // Aplicar todas las transacciones
    for (const tx of block.transactions) {
      this.applyTransaction(tx);
    }
    this.state.currentBlock = block.height;
  }

  applyTransaction(tx: Transaction) {
    // Add transaction to mempool
    this.state.addToMempool(tx);
  }
}
