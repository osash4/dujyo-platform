import express from 'express';
import { BlockchainNode } from './src/node/blockchain_node';
import { CPVConsensus } from './src/consensus/cpv_consensus';

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize blockchain components
const blockchain = new BlockchainNode();
const consensus = new CPVConsensus();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'dujyo-blockchain',
    status: 'healthy',
    timestamp: Date.now(),
    blocks: blockchain.getBlockCount(),
    consensus: 'CPV'
  });
});

// Get blockchain info
app.get('/info', (req, res) => {
  res.json({
    name: 'Dujyo Blockchain',
    version: '1.0.0',
    consensus: 'CPV (Creative Proof of Value)',
    blocks: blockchain.getBlockCount(),
    validators: consensus.getAllValidators().length,
    timestamp: Date.now()
  });
});

// Get blocks
app.get('/blocks', (req, res) => {
  const blocks = blockchain.getAllBlocks();
  res.json({
    success: true,
    blocks: blocks,
    count: blocks.length
  });
});

// Get transactions
app.get('/transactions', (req, res) => {
  const transactions = blockchain.getAllTransactions();
  res.json({
    success: true,
    transactions: transactions,
    count: transactions.length
  });
});

// Get balance
app.get('/balance/:address', (req, res) => {
  const { address } = req.params;
  const balance = blockchain.getBalance(address);
  res.json({
    success: true,
    address: address,
    balance: balance,
    timestamp: Date.now()
  });
});

// Submit transaction
app.post('/transaction', (req, res) => {
  try {
    const { from, to, amount, type } = req.body;
    
    if (!from || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from, to, amount'
      });
    }

    const transaction = blockchain.createTransaction(from, to, amount, type || 'transfer');
    const result = blockchain.addTransaction(transaction);
    
    if (result.success) {
      res.json({
        success: true,
        transaction: transaction,
        blockHash: result.blockHash,
        message: 'Transaction submitted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get consensus info
app.get('/consensus', (req, res) => {
  const validators = consensus.getAllValidators();
  res.json({
    success: true,
    consensus: 'CPV',
    validators: validators,
    totalValidators: validators.length,
    timestamp: Date.now()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dujyo Blockchain Node running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/info`);
  console.log(`⛓️  Consensus: CPV (Creative Proof of Value)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Dujyo Blockchain Node...');
  process.exit(0);
});

export default app;