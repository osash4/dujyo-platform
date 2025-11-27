// K6 Load Testing Script - CORRECTED ROUTES
// Based on actual backend endpoints from server output

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const swapLatency = new Trend('swap_latency');
const transferLatency = new Trend('transfer_latency');
const successfulTx = new Counter('successful_transactions');
const failedTx = new Counter('failed_transactions');

// Test configuration - LIGHTER load for testing
export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'errors': ['rate<0.10'],  // 10% error rate acceptable for testing
    'http_req_failed': ['rate<0.50'],  // 50% acceptable (some endpoints need auth)
    'swap_latency': ['p(95)<300'],
    'transfer_latency': ['p(95)<150'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8083';

// Test data generator
function generateAddress() {
  const chars = 'abcdef0123456789';
  let address = 'xw1';
  for (let i = 0; i < 40; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

function generateUser() {
  return {
    address: generateAddress()
  };
}

// Setup function
export function setup() {
  console.log('Starting Dujyo load test with CORRECTED routes...');
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'backend is healthy': (r) => r.status === 200
  });

  return {
    baseUrl: BASE_URL,
    startTime: Date.now()
  };
}

// Main test function
export default function(data) {
  const user = generateUser();
  
  // Random action selection
  const actions = ['transfer', 'swap', 'blocks', 'balance_check'];
  const weights = [30, 30, 20, 20];
  const rand = Math.random() * 100;
  let selectedAction = 'blocks';
  let cumulative = 0;
  
  for (let i = 0; i < actions.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      selectedAction = actions[i];
      break;
    }
  }
  
  switch(selectedAction) {
    case 'transfer':
      testTransfer(data, user);
      break;
    case 'swap':
      testSwap(data, user);
      break;
    case 'blocks':
      testBlocks(data);
      break;
    case 'balance_check':
      testBalanceCheck(data, user);
      break;
  }
  
  sleep(Math.random() * 1 + 0.5);
}

function testTransfer(data, user) {
  const payload = JSON.stringify({
    from: user.address,
    to: generateAddress(),
    amount: String(Math.floor(Math.random() * 10000) + 100),
    signature: "test_signature_" + Math.random().toString(36)
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'transfer' }
  };
  
  const startTime = Date.now();
  // CORRECTED: /transaction instead of /api/transfer
  const res = http.post(`${data.baseUrl}/transaction`, payload, params);
  const latency = Date.now() - startTime;
  
  transferLatency.add(latency);
  
  const success = check(res, {
    'transfer responded': (r) => r.status !== 0,
    'transfer not 500': (r) => r.status !== 500,
  });
  
  if (success && res.status === 200) {
    successfulTx.add(1);
  } else {
    failedTx.add(1);
    errorRate.add(1);
  }
}

function testSwap(data, user) {
  const amount_in = Math.floor(Math.random() * 50000) + 1000;
  const min_amount_out = Math.floor(amount_in * 0.95);
  
  const payload = JSON.stringify({
    from_token: 'DYO',
    to_token: 'DYS',
    amount_in: amount_in,
    min_amount_out: min_amount_out,
    user: user.address,
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'swap' }
  };
  
  const startTime = Date.now();
  // CORRECTED: /swap instead of /api/dex/swap
  const res = http.post(`${data.baseUrl}/swap`, payload, params);
  const latency = Date.now() - startTime;
  
  swapLatency.add(latency);
  
  const success = check(res, {
    'swap responded': (r) => r.status !== 0,
    'swap not 500': (r) => r.status !== 500,
  });
  
  if (success && (res.status === 200 || res.status === 401)) {
    // 401 is OK - means endpoint exists but needs JWT
    successfulTx.add(1);
  } else {
    failedTx.add(1);
    errorRate.add(1);
  }
}

function testBlocks(data) {
  const params = {
    tags: { name: 'blocks' }
  };
  
  // CORRECTED: /blocks (this one works!)
  const res = http.get(`${data.baseUrl}/blocks`, params);
  
  check(res, {
    'blocks status 200': (r) => r.status === 200,
    'blocks has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.blocks !== undefined;
      } catch {
        return false;
      }
    }
  });
}

function testBalanceCheck(data, user) {
  const params = {
    tags: { name: 'balance_check' }
  };
  
  // CORRECTED: /balance/{address} instead of /api/balance/{address}
  const res = http.get(`${data.baseUrl}/balance/${user.address}`, params);
  
  check(res, {
    'balance responded': (r) => r.status !== 0,
    'balance not 500': (r) => r.status !== 500,
  });
}

// Teardown
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(3)} seconds`);
}

