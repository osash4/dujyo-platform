import http from 'http';
import { XWaveState } from '../state.js';
import { StateApplier } from './apply.js';
export declare function createRpcServer(state: XWaveState, applier: StateApplier, port: number): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
//# sourceMappingURL=rpc.d.ts.map