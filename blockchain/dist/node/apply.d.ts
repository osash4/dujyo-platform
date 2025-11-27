import { XWaveState } from '../state.js';
import { Block } from '../types/block.js';
import { Transaction } from '../types/tx.js';
export declare class StateApplier {
    state: XWaveState;
    constructor(state: XWaveState);
    applyBlock(block: Block): void;
    applyTransaction(tx: Transaction): void;
}
//# sourceMappingURL=apply.d.ts.map