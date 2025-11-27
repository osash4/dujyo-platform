export class StateApplier {
    constructor(state) {
        this.state = state;
    }
    applyBlock(block) {
        // Validar bloque (hash, firmas, etc.)
        // Aplicar todas las transacciones
        for (const tx of block.transactions) {
            this.applyTransaction(tx);
        }
        this.state.currentBlock = block.height;
    }
    applyTransaction(tx) {
        // Add transaction to mempool
        this.state.addToMempool(tx);
    }
}
//# sourceMappingURL=apply.js.map