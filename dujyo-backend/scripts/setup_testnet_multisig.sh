#!/bin/bash

echo "🔐 Setting up Testnet Multisig Wallets..."

# Treasury Wallet
echo "Creating Treasury Multisig Wallet..."
curl -X POST http://localhost:8083/multisig/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "XWave Treasury Testnet",
    "purpose": "TREASURY",
    "owners": [
      "XW_TREASURY_OWNER_1_TESTNET",
      "XW_TREASURY_OWNER_2_TESTNET", 
      "XW_TREASURY_OWNER_3_TESTNET",
      "XW_TREASURY_OWNER_4_TESTNET",
      "XW_TREASURY_OWNER_5_TESTNET"
    ],
    "threshold": 3,
    "daily_limit": 10000000
  }'

# Dev Wallet
echo "Creating Development Multisig Wallet..."
curl -X POST http://localhost:8083/multisig/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "XWave Development Testnet",
    "purpose": "DEV",
    "owners": [
      "XW_DEV_OWNER_1_TESTNET",
      "XW_DEV_OWNER_2_TESTNET",
      "XW_DEV_OWNER_3_TESTNET", 
      "XW_DEV_OWNER_4_TESTNET",
      "XW_DEV_OWNER_5_TESTNET"
    ],
    "threshold": 3,
    "daily_limit": 5000000
  }'

# Ops Wallet
echo "Creating Operations Multisig Wallet..."
curl -X POST http://localhost:8083/multisig/create   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "XWave Operations Testnet",
    "purpose": "OPS",
    "owners": [
      "XW_OPS_OWNER_1_TESTNET",
      "XW_OPS_OWNER_2_TESTNET",
      "XW_OPS_OWNER_3_TESTNET",
      "XW_OPS_OWNER_4_TESTNET", 
      "XW_OPS_OWNER_5_TESTNET"
    ],
    "threshold": 3,
    "daily_limit": 2000000
  }'

echo "✅ Testnet multisig wallets configured"
