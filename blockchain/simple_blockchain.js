import express from 'express';
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

// Simple blockchain state
let blocks = [];
let transactions = [];
let balances = {
  'XW2912A395F2F37BF3980E09296A139227764DECED': 1255,
  'XW1234567890ABCDEF1234567890ABCDEF123456': 1000,
  'XW9876543210FEDCBA9876543210FEDCBA987654': 500
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'dujyo-blockchain',
    status: 'healthy',
    timestamp: Date.now(),
    blocks: blocks.length,
    consensus: 'CPV'
  });
});

// Get blockchain info
app.get('/info', (req, res) => {
  res.json({
    name: 'Dujyo Blockchain',
    version: '1.0.0',
    consensus: 'CPV (Creative Proof of Value)',
    blocks: blocks.length,
    validators: 3,
    timestamp: Date.now()
  });
});

// Get blocks
app.get('/blocks', (req, res) => {
  res.json({
    success: true,
    blocks: blocks,
    count: blocks.length
  });
});

// Get transactions
app.get('/transactions', (req, res) => {
  res.json({
    success: true,
    transactions: transactions,
    count: transactions.length
  });
});

// Get balance
app.get('/balance/:address', (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
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

    // Check balance
    if (balances[from] < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Create transaction
    const transaction = {
      id: Date.now().toString(),
      from: from,
      to: to,
      amount: amount,
      type: type || 'transfer',
      timestamp: Date.now(),
      hash: `0x${Math.random().toString(16).substr(2, 8)}`
    };

    // Update balances
    balances[from] -= amount;
    balances[to] = (balances[to] || 0) + amount;

    // Add to transactions
    transactions.push(transaction);

    res.json({
      success: true,
      transaction: transaction,
      message: 'Transaction submitted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get consensus info
app.get('/consensus', (req, res) => {
  res.json({
    success: true,
    consensus: 'CPV',
    validators: [
      { address: 'XW2912A395F2F37BF3980E09296A139227764DECED', type: 'economic', score: 95 },
      { address: 'XW1234567890ABCDEF1234567890ABCDEF123456', type: 'creative', score: 88 },
      { address: 'XW9876543210FEDCBA9876543210FEDCBA987654', type: 'community', score: 92 }
    ],
    totalValidators: 3,
    timestamp: Date.now()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dujyo Blockchain Node running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/info`);
  console.log(`⛓️  Consensus: CPV (Creative Proof of Value)`);
  console.log(`💰 Demo balances loaded: ${Object.keys(balances).length} addresses`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Dujyo Blockchain Node...');
  process.exit(0);
});

export default app;
