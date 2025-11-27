#!/bin/bash

echo "⏰ Setting up Testnet Vesting Schedules..."

# Treasury Vesting (12 months cliff + 36 months linear)
echo "Creating Treasury Vesting Schedule..."
curl -X POST http://localhost:8083/vesting/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "beneficiary": "XWMS_TREASURY_WALLET_ADDRESS_TESTNET",
    "total_amount": 300000000,
    "cliff_duration": 31536000,
    "vesting_duration": 94608000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Creative Incentives Vesting (10% immediate + 24 months)
echo "Creating Creative Incentives Vesting Schedule..."
curl -X POST http://localhost:8083/vesting/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "beneficiary": "XW_CREATIVE_INCENTIVES_ADDRESS_TESTNET",
    "total_amount": 250000000,
    "cliff_duration": 0,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Community Vesting (24 months linear)
echo "Creating Community Vesting Schedule..."
curl -X POST http://localhost:8083/vesting/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "beneficiary": "XW_COMMUNITY_ADDRESS_TESTNET",
    "total_amount": 150000000,
    "cliff_duration": 0,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Seed Investors Vesting (6 months cliff + 24 months linear)
echo "Creating Seed Investors Vesting Schedule..."
curl -X POST http://localhost:8083/vesting/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "beneficiary": "XW_SEED_INVESTORS_ADDRESS_TESTNET",
    "total_amount": 100000000,
    "cliff_duration": 15552000,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

echo "✅ Testnet vesting schedules configured"
