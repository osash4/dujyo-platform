#!/usr/bin/env node
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { CPVNode } from '../consensus/cpv_node';
import { CPVConsensus } from '../consensus/cpv_consensus';
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
// Middleware
app.use(express.json());
// Initialize CPV consensus and node
const cpvConsensus = new CPVConsensus();
const cpvNode = new CPVNode(cpvConsensus);
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        service: 'xwave-blockchain-node',
        status: 'healthy',
        timestamp: Date.now(),
        consensus: 'CPV',
        nodeId: cpvNode.getNodeId()
    });
});
// Blockchain info endpoint
app.get('/info', (_req, res) => {
    res.json({
        name: 'XWave Blockchain',
        version: '1.0.0',
        consensus: 'Creative Proof of Value (CPV)',
        nodeId: cpvNode.getNodeId(),
        status: 'running',
        timestamp: Date.now()
    });
});
// Consensus stats endpoint
app.get('/consensus/stats', (_req, res) => {
    const stats = cpvConsensus.getConsensusStats();
    res.json(stats);
});
// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('Received WebSocket message:', data);
            // Echo back the message
            ws.send(JSON.stringify({
                type: 'response',
                data: data,
                timestamp: Date.now()
            }));
        }
        catch (error) {
            console.error('Error parsing WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid JSON message',
                timestamp: Date.now()
            }));
        }
    });
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
// Parse command line arguments
const args = process.argv.slice(2);
let rpcPort = 8080;
let wsPort = 8081;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rpc-port' && i + 1 < args.length) {
        const portArg = args[i + 1];
        if (portArg) {
            rpcPort = parseInt(portArg);
        }
    }
    else if (args[i] === '--ws-port' && i + 1 < args.length) {
        const portArg = args[i + 1];
        if (portArg) {
            wsPort = parseInt(portArg);
        }
    }
}
// Start the server
server.listen(rpcPort, () => {
    console.log(`XWave Blockchain Node started`);
    console.log(`RPC Server: http://localhost:${rpcPort}`);
    console.log(`WebSocket Server: ws://localhost:${wsPort}`);
    console.log(`Consensus: Creative Proof of Value (CPV)`);
    console.log(`Node ID: ${cpvNode.getNodeId()}`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  GET  /health           - Health check`);
    console.log(`  GET  /info             - Blockchain info`);
    console.log(`  GET  /consensus/stats  - Consensus statistics`);
    console.log(`  WS   /                 - WebSocket connection`);
    console.log('');
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n Shutting down XWave Blockchain Node...');
    server.close(() => {
        console.log(' Server closed');
        process.exit(0);
    });
});
process.on('SIGTERM', () => {
    console.log('\n Shutting down XWave Blockchain Node...');
    server.close(() => {
        console.log(' Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map