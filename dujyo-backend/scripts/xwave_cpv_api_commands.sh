curl -X POST http://localhost:8083/consensus/register/economic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"address": "XW0000000000000000000000000000000000000003", "stake": 50000}'

curl -X POST http://localhost:8083/consensus/register/creative \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"address": "XW0000000000000000000000000000000000000004", "stake": 0}'

curl -X POST http://localhost:8083/consensus/register/community \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"address": "XW0000000000000000000000000000000000000005", "stake": 0}'