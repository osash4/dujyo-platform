// K6 Stress Testing Script - Extreme Load Scenario
// Test: Spike to 20,000 users, 2,000 TPS peaks
// Duration: 15 minutes with spikes

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('latency');

export const options = {
  stages: [
    { duration: '2m', target: 5000 },    // Normal load
    { duration: '1m', target: 20000 },   // SPIKE!
    { duration: '2m', target: 5000 },    // Recovery
    { duration: '1m', target: 20000 },   // SPIKE 2!
    { duration: '2m', target: 5000 },    // Recovery
    { duration: '1m', target: 25000 },   // EXTREME SPIKE!
    { duration: '2m', target: 1000 },    // Cool down
    { duration: '1m', target: 0 },       // Shutdown
  ],
  thresholds: {
    'http_req_duration': ['p(99)<1000'], // Allow higher latency under stress
    'errors': ['rate<0.15'],  // Accept up to 15% errors under stress
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8083';

export default function() {
  const endpoints = [
    '/health',
    '/api/balance/xw1test000000000000000000000000000000000',
    '/api/dex/pools',
    '/api/staking/stats',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}${endpoint}`);
  latency.add(Date.now() - startTime);
  
  const success = check(res, {
    'status 200 or 503': (r) => r.status === 200 || r.status === 503, // Accept service unavailable under stress
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  sleep(Math.random() * 0.5); // Shorter sleep for stress testing
}

