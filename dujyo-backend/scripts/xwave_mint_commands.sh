curl -X POST http://localhost:8083/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"account": "XW0000000000000000000000000000000000000001", "amount": 300000000}'

curl -X POST http://localhost:8083/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"account": "XW0000000000000000000000000000000000000002", "amount": 250000000}'

curl -X POST http://localhost:8083/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"account": "XW0000000000000000000000000000000000000003", "amount": 200000000}'

curl -X POST http://localhost:8083/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"account": "XW0000000000000000000000000000000000000004", "amount": 150000000}'

curl -X POST http://localhost:8083/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"account": "XW0000000000000000000000000000000000000005", "amount": 100000000}'