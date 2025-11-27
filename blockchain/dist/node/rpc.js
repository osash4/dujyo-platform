import http from 'http';
export function createRpcServer(state, applier, port) {
    const server = http.createServer(async (req, res) => {
        // CORS headers básicos
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // Log todas las requests para debug
        console.log(`[RPC] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
        // Endpoint de health check
        if (req.method === 'GET' && req.url === '/health') {
            try {
                const health = {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    blockchain: {
                        latestBlockHeight: state.currentBlock,
                        totalPeers: state.peers.length,
                        mempoolSize: state.mempool.length,
                        consensus: state.consensus
                    },
                    uptime: process.uptime()
                };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(health, null, 2));
                return;
            }
            catch (error) {
                console.error('[RPC] Health check error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', error: 'Health check failed' }));
                return;
            }
        }
        // Endpoint de ping simple
        if (req.method === 'GET' && req.url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            return;
        }
        // Endpoint de ping legacy (mantener compatibilidad)
        if (req.method === 'GET' && req.url === '/rpc/ping') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            return;
        }
        if (req.method === 'GET' && req.url === '/rpc/getLatestBlock') {
            const block = {
                height: state.currentBlock,
                timestamp: Date.now(),
                transactions: state.mempool.length
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(block));
            return;
        }
        if (req.method === 'POST' && req.url === '/rpc/submitTransaction') {
            let body = '';
            req.on('data', chunk => (body += chunk));
            req.on('end', () => {
                try {
                    const tx = JSON.parse(body);
                    applier.applyTransaction(tx);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                }
                catch (e) {
                    let errorMsg = 'Unknown error';
                    if (e && typeof e === 'object' && 'message' in e) {
                        errorMsg = e.message;
                    }
                    console.error('[RPC] Transaction submission error:', errorMsg);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: errorMsg }));
                }
            });
            return;
        }
        // Endpoint para obtener información del estado del nodo
        if (req.method === 'GET' && req.url === '/rpc/nodeInfo') {
            const info = {
                version: '1.0.0',
                consensus: state.consensus,
                latestBlock: state.currentBlock,
                totalPeers: state.peers.length,
                mempoolSize: state.mempool.length,
                uptime: process.uptime()
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(info, null, 2));
            return;
        }
        // 404 para endpoints no encontrados
        console.log(`[RPC] 404 Not Found: ${req.method} ${req.url}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Endpoint not found',
            method: req.method,
            url: req.url,
            availableEndpoints: [
                'GET /ping',
                'GET /health',
                'GET /rpc/ping',
                'GET /rpc/getLatestBlock',
                'GET /rpc/nodeInfo',
                'POST /rpc/submitTransaction'
            ]
        }));
    });
    // Mejorar error handling del servidor
    server.on('error', (error) => {
        console.error('[RPC] Server error:', error);
        if (error.code === 'EADDRINUSE') {
            console.error(`[RPC] Port ${port} is already in use`);
        }
        else if (error.code === 'EACCES') {
            console.error(`[RPC] Permission denied to bind to port ${port}`);
        }
    });
    // Escuchar en 0.0.0.0 para aceptar conexiones externas
    server.listen(port, '0.0.0.0', () => {
        console.log(`[RPC] Server listening on 0.0.0.0:${port}`);
        console.log(`[RPC] Available endpoints:`);
        console.log(`[RPC]   GET  /ping`);
        console.log(`[RPC]   GET  /health`);
        console.log(`[RPC]   GET  /rpc/ping`);
        console.log(`[RPC]   GET  /rpc/getLatestBlock`);
        console.log(`[RPC]   GET  /rpc/nodeInfo`);
        console.log(`[RPC]   POST /rpc/submitTransaction`);
    });
    return server;
}
//# sourceMappingURL=rpc.js.map