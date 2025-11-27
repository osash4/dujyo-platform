#!/bin/bash

echo "🏦 Setting up Testnet Staking Contracts and Reward Pools..."

# Economic Validators Staking Contract
echo "Creating Economic Validators Staking Contract..."
curl -X POST http://localhost:8083/staking/create-contract   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "Economic Validators Testnet",
    "purpose": "VALIDATORS",
    "min_stake": 1000000,
    "max_stake": 100000000,
    "reward_frequency": 86400,
    "slashing_enabled": true,
    "slashing_rate": 5.0
  }'

# Creative Validators Staking Contract
echo "Creating Creative Validators Staking Contract..."
curl -X POST http://localhost:8083/staking/create-contract   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "Creative Validators Testnet",
    "purpose": "CREATIVE",
    "min_stake": 0,
    "max_stake": 50000000,
    "reward_frequency": 604800,
    "slashing_enabled": false,
    "slashing_rate": 0.0
  }'

# Community Validators Staking Contract
echo "Creating Community Validators Staking Contract..."
curl -X POST http://localhost:8083/staking/create-contract   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "Community Validators Testnet",
    "purpose": "COMMUNITY",
    "min_stake": 0,
    "max_stake": 10000000,
    "reward_frequency": 604800,
    "slashing_enabled": false,
    "slashing_rate": 0.0
  }'

# Economic Rewards Pool
echo "Creating Economic Rewards Pool..."
curl -X POST http://localhost:8083/staking/create-reward-pool   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "Economic Rewards Pool Testnet",
    "purpose": "ECONOMIC",
    "total_rewards": 200000000,
    "reward_rate": 10,
    "max_rewards_per_day": 10000
  }'

# Creative Rewards Pool
echo "Creating Creative Rewards Pool..."
curl -X POST http://localhost:8083/staking/create-reward-pool   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "Creative Rewards Pool Testnet",
    "purpose": "CREATIVE",
    "total_rewards": 200000000,
    "reward_rate": 15,
    "max_rewards_per_day": 15000
  }'

# Community Rewards Pool
echo "Creating Community Rewards Pool..."
curl -X POST http://localhost:8083/staking/create-reward-pool   -H "Content-Type: application/json"   -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJYV19BRE1JTl9BRERSRVNTIiwiZXhwIjoxNzU5MDA2MjEyLCJpYXQiOjE3NTg5MTk4MTIsImlzcyI6Inh3YXZlLWJsb2NrY2hhaW4ifQ.BBrfiIQPr9bXRCQZNCWs8exJ_UZThz-zzt8WyvMR-dM"   -d '{
    "name": "Community Rewards Pool Testnet",
    "purpose": "COMMUNITY",
    "total_rewards": 200000000,
    "reward_rate": 5,
    "max_rewards_per_day": 5000
  }'

echo "✅ Testnet staking contracts and reward pools configured"
