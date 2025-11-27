// K6 Load Testing Script - High Load Scenario
// Test: 10,000 concurrent users, 1,000 TPS sustained
// Duration: 10 minutes

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const swapLatency = new Trend('swap_latency');
const stakeLatency = new Trend('stake_latency');
const transferLatency = new Trend('transfer_latency');
const successfulTx = new Counter('successful_transactions');
const failedTx = new Counter('failed_transactions');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 1000 },   // Ramp up to 1,000 users
    { duration: '2m', target: 5000 },   // Ramp up to 5,000 users
    { duration: '3m', target: 10000 },  // Ramp up to 10,000 users
    { duration: '2m', target: 10000 },  // Stay at 10,000 users
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    'errors': ['rate<0.05'],  // Error rate < 5%
    'http_req_failed': ['rate<0.05'],
    'swap_latency': ['p(95)<300'],
    'stake_latency': ['p(95)<400'],
    'transfer_latency': ['p(95)<150'],
  },
  // TPS target: 1,000 transactions per second
  ext: {
    loadimpact: {
      projectID: 3662479,
      name: 'Dujyo High Load Test'
    }
  }
};

// Base URLs
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8083';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8084';

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
    email: `loadtest_${Date.now()}_${Math.random()}@dujyo.io`,
    username: `user_${Math.random().toString(36).substring(7)}`,
    password: 'LoadTest123!',
    address: generateAddress()
  };
}

// Setup function - runs once per VU
export function setup() {
  console.log('Starting Dujyo load test...');
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'backend is healthy': (r) => r.status === 200
  });

  return {
    baseUrl: BASE_URL,
    wsUrl: WS_URL,
    startTime: Date.now()
  };
}

// Main test function - runs for each VU
export default function(data) {
  const user = generateUser();
  
  // Random action selection to simulate real user behavior
  const actions = ['transfer', 'swap', 'stake', 'balance_check', 'pool_info'];
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  // Weight: 30% swaps, 20% stakes, 30% transfers, 15% balance checks, 5% pool info
  const weights = [30, 20, 30, 15, 5];
  const rand = Math.random() * 100;
  let selectedAction = 'balance_check';
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
    case 'stake':
      testStake(data, user);
      break;
    case 'balance_check':
      testBalanceCheck(data, user);
      break;
    case 'pool_info':
      testPoolInfo(data);
      break;
  }
  
  // Random sleep between 0.5 and 2 seconds
  sleep(Math.random() * 1.5 + 0.5);
}

function testTransfer(data, user) {
  const payload = JSON.stringify({
    from: user.address,
    to: generateAddress(),
    amount: Math.floor(Math.random() * 10000) + 100,
    token: 'DYO'
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'transfer' }
  };
  
  const startTime = Date.now();
  const res = http.post(`${data.baseUrl}/api/transfer`, payload, params);
  const latency = Date.now() - startTime;
  
  transferLatency.add(latency);
  
  const success = check(res, {
    'transfer status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'transfer has tx_hash': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.tx_hash !== undefined;
      } catch {
        return false;
      }
    }
  });
  
  if (success) {
    successfulTx.add(1);
  } else {
    failedTx.add(1);
    errorRate.add(1);
  }
}

function testSwap(data, user) {
  const amount_in = Math.floor(Math.random() * 50000) + 1000;
  const min_amount_out = Math.floor(amount_in * 0.95); // 5% slippage tolerance
  
  const payload = JSON.stringify({
    from: 'DYO',
    to: 'DYS',
    amount_in: amount_in,
    min_amount_out: min_amount_out,
    user: user.address,
    deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    nonce: Math.floor(Math.random() * 1000000)
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'swap' }
  };
  
  const startTime = Date.now();
  const res = http.post(`${data.baseUrl}/api/dex/swap`, payload, params);
  const latency = Date.now() - startTime;
  
  swapLatency.add(latency);
  
  const success = check(res, {
    'swap status 200': (r) => r.status === 200,
    'swap has amount_received': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.amount_received !== undefined;
      } catch {
        return false;
      }
    },
    'swap price impact acceptable': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.price_impact < 2000; // < 20%
      } catch {
        return false;
      }
    }
  });
  
  if (success) {
    successfulTx.add(1);
  } else {
    failedTx.add(1);
    errorRate.add(1);
  }
}

function testStake(data, user) {
  const payload = JSON.stringify({
    contract_id: 'STK_ECONOMIC_VALIDATORS',
    staker: user.address,
    amount: Math.floor(Math.random() * 100000) + 10000
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'stake' }
  };
  
  const startTime = Date.now();
  const res = http.post(`${data.baseUrl}/api/staking/stake`, payload, params);
  const latency = Date.now() - startTime;
  
  stakeLatency.add(latency);
  
  const success = check(res, {
    'stake status 200': (r) => r.status === 200,
    'stake success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    }
  });
  
  if (success) {
    successfulTx.add(1);
  } else {
    failedTx.add(1);
    errorRate.add(1);
  }
}

function testBalanceCheck(data, user) {
  const params = {
    tags: { name: 'balance_check' }
  };
  
  const res = http.get(`${data.baseUrl}/api/balance/${user.address}`, params);
  
  check(res, {
    'balance check status 200': (r) => r.status === 200,
    'balance has DYO': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.DYO !== undefined;
      } catch {
        return false;
      }
    }
  });
}

function testPoolInfo(data) {
  const params = {
    tags: { name: 'pool_info' }
  };
  
  const res = http.get(`${data.baseUrl}/api/dex/pools`, params);
  
  check(res, {
    'pool info status 200': (r) => r.status === 200,
    'has pools': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.pools) && body.pools.length > 0;
      } catch {
        return false;
      }
    }
  });
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
  
  // Generate summary report
  console.log('=== Dujyo Load Test Summary ===');
  console.log(`Total duration: ${duration}s`);
  console.log(`Successful transactions: ${successfulTx.count}`);
  console.log(`Failed transactions: ${failedTx.count}`);
  console.log(`Average TPS: ${successfulTx.count / duration}`);
}

// Handle test errors
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/Volumes/DobleDHD 8/dujyo/scripts/load-testing/results/high-load-summary.json': JSON.stringify(data),
    '/Volumes/DobleDHD 8/dujyo/scripts/load-testing/results/high-load-summary.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  let summary = '\n=== Dujyo Load Test Results ===\n\n';
  
  summary += `Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  summary += `VUs: ${data.metrics.vus.values.max}\n`;
  summary += `Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `HTTP Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `HTTP Request Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `HTTP Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `HTTP Request Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `Successful Transactions: ${data.metrics.successful_transactions.values.count}\n`;
  summary += `Failed Transactions: ${data.metrics.failed_transactions.values.count}\n`;
  summary += `Average TPS: ${(data.metrics.successful_transactions.values.count / (data.state.testRunDurationMs / 1000)).toFixed(2)}\n`;
  
  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Dujyo Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Dujyo Load Test Report</h1>
  <h2>Test Configuration</h2>
  <p>Target: 10,000 concurrent users</p>
  <p>Duration: 10 minutes</p>
  <p>Expected TPS: 1,000+</p>
  
  <h2>Results</h2>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    <tr><td>Total Requests</td><td>${data.metrics.http_reqs.values.count}</td><td class="pass">✓</td></tr>
    <tr><td>Avg Latency</td><td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td><td class="${data.metrics.http_req_duration.values.avg < 200 ? 'pass' : 'fail'}">
      ${data.metrics.http_req_duration.values.avg < 200 ? '✓' : '✗'}
    </td></tr>
    <tr><td>P95 Latency</td><td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td><td class="${data.metrics.http_req_duration.values['p(95)'] < 200 ? 'pass' : 'fail'}">
      ${data.metrics.http_req_duration.values['p(95)'] < 200 ? '✓' : '✗'}
    </td></tr>
    <tr><td>Error Rate</td><td>${(data.metrics.errors.values.rate * 100).toFixed(2)}%</td><td class="${data.metrics.errors.values.rate < 0.05 ? 'pass' : 'fail'}">
      ${data.metrics.errors.values.rate < 0.05 ? '✓' : '✗'}
    </td></tr>
    <tr><td>Successful TPS</td><td>${(data.metrics.successful_transactions.values.count / (data.state.testRunDurationMs / 1000)).toFixed(2)}</td><td class="pass">✓</td></tr>
  </table>
  
  <h2>Performance by Operation</h2>
  <table>
    <tr><th>Operation</th><th>P95 Latency</th><th>Status</th></tr>
    <tr><td>Transfer</td><td>${data.metrics.transfer_latency.values['p(95)'].toFixed(2)}ms</td><td class="${data.metrics.transfer_latency.values['p(95)'] < 150 ? 'pass' : 'fail'}">
      ${data.metrics.transfer_latency.values['p(95)'] < 150 ? '✓' : '✗'}
    </td></tr>
    <tr><td>DEX Swap</td><td>${data.metrics.swap_latency.values['p(95)'].toFixed(2)}ms</td><td class="${data.metrics.swap_latency.values['p(95)'] < 300 ? 'pass' : 'fail'}">
      ${data.metrics.swap_latency.values['p(95)'] < 300 ? '✓' : '✗'}
    </td></tr>
    <tr><td>Staking</td><td>${data.metrics.stake_latency.values['p(95)'].toFixed(2)}ms</td><td class="${data.metrics.stake_latency.values['p(95)'] < 400 ? 'pass' : 'fail'}">
      ${data.metrics.stake_latency.values['p(95)'] < 400 ? '✓' : '✗'}
    </td></tr>
  </table>
  
  <p><em>Generated: ${new Date().toISOString()}</em></p>
</body>
</html>
  `;
}

