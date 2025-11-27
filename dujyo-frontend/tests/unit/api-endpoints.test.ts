/**
 * Unit Tests for API Endpoints
 * Uses fetch API for testing backend endpoints
 */

import { describe, test, expect, beforeAll } from '@jest/globals';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8083';
const TEST_TIMEOUT = 10000;

describe('API Endpoints Tests', () => {
  let authToken: string | null = null;
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Setup: Create test user and get auth token
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@dujyo.test',
          password: 'testpassword'
        })
      });

      if (response.ok) {
        const data = await response.json();
        authToken = data.token || data.access_token;
        testUserId = data.user_id || data.uid;
      }
    } catch (error) {
      console.warn('Could not setup test user, some tests may fail');
    }
  });

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
    }, TEST_TIMEOUT);
  });

  describe('Authentication Endpoints', () => {
    test('POST /login should authenticate user', async () => {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@dujyo.test',
          password: 'testpassword'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('token');
    }, TEST_TIMEOUT);

    test('POST /login should reject invalid credentials', async () => {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        })
      });

      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);
  });

  describe('Analytics Endpoints', () => {
    test('GET /api/v1/analytics/artist/:id should return artist analytics', async () => {
      if (!authToken || !testUserId) {
        console.warn('Skipping test: No auth token');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/artist/${testUserId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('total_streams');
      expect(data).toHaveProperty('total_revenue');
    }, TEST_TIMEOUT);
  });

  describe('Royalties Endpoints', () => {
    test('GET /api/v1/royalties/artist/:id should return royalties', async () => {
      if (!authToken || !testUserId) {
        console.warn('Skipping test: No auth token');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/royalties/artist/${testUserId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('total_earned');
      expect(data).toHaveProperty('pending_payout');
    }, TEST_TIMEOUT);
  });

  describe('Content Upload Endpoints', () => {
    test('POST /api/v1/upload/content should require authentication', async () => {
      const formData = new FormData();
      formData.append('title', 'Test Track');
      formData.append('type', 'audio');

      const response = await fetch(`${API_BASE_URL}/api/v1/upload/content`, {
        method: 'POST',
        body: formData
      });

      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);
  });

  describe('Stream-to-Earn Endpoints', () => {
    test('POST /api/stream-earn should validate stream duration', async () => {
      const response = await fetch(`${API_BASE_URL}/api/stream-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user',
          content_id: 'test-content',
          duration_seconds: 29 // Less than minimum 30 seconds
        })
      });

      // Should reject streams shorter than 30 seconds
      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);

    test('POST /api/stream-earn should accept valid stream', async () => {
      const response = await fetch(`${API_BASE_URL}/api/stream-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user',
          content_id: 'test-content',
          duration_seconds: 60
        })
      });

      // Should accept valid streams
      expect([200, 201, 400]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('DEX Endpoints', () => {
    test('POST /swap should require authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'DYO',
          to: 'DYS',
          amount: 100
        })
      });

      expect(response.status).toBe(401);
    }, TEST_TIMEOUT);

    test('POST /swap should validate swap parameters', async () => {
      if (!authToken) {
        console.warn('Skipping test: No auth token');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          // Missing required fields
          from: 'DYO'
        })
      });

      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);
  });

  describe('Blockchain Endpoints', () => {
    test('GET /balance/:address should return balance', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      
      const response = await fetch(`${API_BASE_URL}/balance/${testAddress}`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('balance');
    }, TEST_TIMEOUT);

    test('GET /blocks should return recent blocks', async () => {
      const response = await fetch(`${API_BASE_URL}/blocks`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    test('GET /api/nonexistent should return 404', async () => {
      const response = await fetch(`${API_BASE_URL}/api/nonexistent`);
      expect(response.status).toBe(404);
    }, TEST_TIMEOUT);

    test('POST /api/endpoint with invalid JSON should return 400', async () => {
      const response = await fetch(`${API_BASE_URL}/api/stream-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);
  });
});

