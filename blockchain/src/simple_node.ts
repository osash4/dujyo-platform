#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'dujyo-blockchain-node',
    status: 'healthy',
    timestamp: Date.now(),
    consensus: 'CPV',
    nodeId: 'simple-node-001'
  });
});

// Blockchain info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: 'Dujyo Blockchain',
    version: '1.0.0',
    consensus: 'Creative Proof of Value (CPV)',
    nodeId: 'simple-node-001',
    status: 'running',
    timestamp: Date.now()
  });
});

// Consensus stats endpoint
app.get('/consensus/stats', (req, res) => {
  res.json({
    economic_validators: 2,
    creative_validators: 2,
    community_validators: 2,
    total_validators: 6,
    validation_rounds: 0,
    consensus_parameters: {
      lambda_economic: 0.4,
      lambda_creative: 0.3,
      lambda_community: 0.3,
      minimum_stake: 1000,
      minimum_creative_score: 0.5,
      minimum_community_score: 0.3
    },
    recent_rounds: []
  });
});

// Parse command line arguments
const args = process.argv.slice(2);
let rpcPort = 8080;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--rpc-port' && i + 1 < args.length) {
    rpcPort = parseInt(args[i + 1]);
  }
}

// Start the server
server.listen(rpcPort, () => {
  console.log(`Dujyo Blockchain Node started`);
  console.log(`RPC Server: http://localhost:${rpcPort}`);
  console.log(`Consensus: Creative Proof of Value (CPV)`);
  console.log(`Node ID: simple-node-001`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /health           - Health check`);
  console.log(`  GET  /info             - Blockchain info`);
  console.log(`  GET  /consensus/stats  - Consensus statistics`);
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Shutting down Dujyo Blockchain Node...');
  server.close(() => {
    console.log(' Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n Shutting down Dujyo Blockchain Node...');
  server.close(() => {
    console.log(' Server closed');
    process.exit(0);
  });
});
