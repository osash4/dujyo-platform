#!/bin/bash
# 🚀 DUJYO S2E MVP Deployment Script
# Deploys backend and frontend for MVP closed beta

set -e

echo "🚀 Deploying DUJYO S2E MVP..."
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if deploy directory exists
DEPLOY_DIR="deploy"
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "📁 Creating deploy directory..."
    mkdir -p "$DEPLOY_DIR/config" "$DEPLOY_DIR/static" "$DEPLOY_DIR/logs"
fi

# 1. Build backend
echo -e "${YELLOW}1. Building backend...${NC}"
cd dujyo-backend

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found. Please install Rust.${NC}"
    exit 1
fi

echo "   Compiling backend (this may take a few minutes)..."
cargo build --release

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend compiled successfully${NC}"

# Copy binary
cp target/release/xwavve-backend ../$DEPLOY_DIR/ 2>/dev/null || cp target/release/dujyo-backend ../$DEPLOY_DIR/ 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Binary name not found, checking target/release/...${NC}"
    ls -la target/release/ | head -5
}

# 2. Build frontend
echo ""
echo -e "${YELLOW}2. Building frontend...${NC}"
cd ../dujyo-frontend

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js.${NC}"
    exit 1
fi

echo "   Installing dependencies..."
npm install

echo "   Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Copy build
cp -r dist/* ../$DEPLOY_DIR/static/ 2>/dev/null || cp -r build/* ../$DEPLOY_DIR/static/ 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Build directory not found, checking...${NC}"
    ls -la | grep -E "dist|build"
}

# 3. Setup config
echo ""
echo -e "${YELLOW}3. Setting up configuration...${NC}"
cd ..
cp dujyo-backend/config/s2e_config.json $DEPLOY_DIR/config/ 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Config file not found, creating default...${NC}"
    cat > $DEPLOY_DIR/config/s2e_config.json <<EOF
{
  "max_users": 50,
  "is_closed_beta": true,
  "beta_access_codes": ["DUJYO-S2E-BETA-2024"],
  "pool_size": 2000000,
  "listener_rate": 0.10,
  "artist_rate": 0.50,
  "beta_user_emails": []
}
EOF
}

# 4. Database migrations
echo ""
echo -e "${YELLOW}4. Running database migrations...${NC}"
if command -v psql &> /dev/null; then
    echo "   Applying migrations..."
    cd dujyo-backend
    for migration in migrations/019_beta_users.sql migrations/020_beta_codes.sql; do
        if [ -f "$migration" ]; then
            echo "   Applying: $migration"
            PGPASSWORD="" psql -h 127.0.0.1 -U yare -d dujyo_blockchain -f "$migration" 2>/dev/null || {
                echo -e "${YELLOW}⚠️  Migration may have already been applied${NC}"
            }
        fi
    done
    cd ..
else
    echo -e "${YELLOW}⚠️  psql not found, skipping migrations${NC}"
    echo "   Please run migrations manually:"
    echo "   psql -h 127.0.0.1 -U yare -d dujyo_blockchain -f dujyo-backend/migrations/019_beta_users.sql"
    echo "   psql -h 127.0.0.1 -U yare -d dujyo_blockchain -f dujyo-backend/migrations/020_beta_codes.sql"
fi

# 5. Create startup script
echo ""
echo -e "${YELLOW}5. Creating startup script...${NC}"
cat > $DEPLOY_DIR/start.sh <<'EOF'
#!/bin/bash
# Start DUJYO S2E MVP

export S2E_CONFIG_PATH="config/s2e_config.json"
export RUST_LOG=info

# Start backend
./xwavve-backend > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
echo $BACKEND_PID > logs/backend.pid

# Wait for backend to be ready
sleep 3

# Start nginx or serve static files
if command -v nginx &> /dev/null; then
    echo "Starting nginx..."
    nginx -c $(pwd)/nginx.conf 2>/dev/null || echo "⚠️  nginx config not found"
else
    echo "⚠️  nginx not found. Serve static files manually:"
    echo "   cd static && python3 -m http.server 8080"
fi

echo "✅ MVP started!"
echo "Backend: http://localhost:8083"
echo "Frontend: http://localhost:8080 (or nginx port)"
EOF

chmod +x $DEPLOY_DIR/start.sh

# 6. Create docker-compose (optional)
echo ""
echo -e "${YELLOW}6. Creating docker-compose.yml...${NC}"
cat > docker-compose.mvp.yml <<'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./dujyo-backend
      dockerfile: Dockerfile
    ports:
      - "8083:8083"
    environment:
      - DATABASE_URL=postgresql://yare:password@postgres:5432/dujyo_blockchain
      - JWT_SECRET=${JWT_SECRET}
      - S2E_CONFIG_PATH=/app/config/s2e_config.json
    volumes:
      - ./dujyo-backend/config:/app/config
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./dujyo-frontend
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - backend

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=yare
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=dujyo_blockchain
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./dujyo-backend/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
EOF

echo -e "${GREEN}✅ docker-compose.mvp.yml created${NC}"

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ MVP DEPLOYMENT READY!${NC}"
echo "=========================================="
echo ""
echo "📁 Deploy directory: $DEPLOY_DIR/"
echo "   - Backend binary: $DEPLOY_DIR/xwavve-backend"
echo "   - Frontend: $DEPLOY_DIR/static/"
echo "   - Config: $DEPLOY_DIR/config/s2e_config.json"
echo ""
echo "🚀 To start MVP:"
echo "   cd $DEPLOY_DIR && ./start.sh"
echo ""
echo "🐳 Or use Docker:"
echo "   docker-compose -f docker-compose.mvp.yml up -d"
echo ""

