#!/bin/bash

echo "💧 Setting up Testnet Initial Liquidity..."

# Seed XWV/XUSD Pool
echo "Seeding XWV/XUSD liquidity pool..."
curl -X POST http://localhost:8083/liquidity/add   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "pool_id": "DEX_XWV_XUSD_POOL_001_TESTNET",
    "amounts": [100000000, 100000],
    "user": "XW_LIQUIDITY_PROVIDER_TESTNET"
  }'

# Configurar timelock para liquidez (180 días)
echo "Setting up liquidity timelock..."
curl -X POST http://localhost:8083/liquidity/timelock   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "pool_id": "DEX_XWV_XUSD_POOL_001_TESTNET",
    "timelock_duration": 15552000,
    "admin": "admin"
  }'

echo "✅ Testnet initial liquidity configured"
