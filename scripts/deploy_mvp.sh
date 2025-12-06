#!/bin/bash

# DUJYO MVP Deployment Script
# Usage: ./scripts/deploy_mvp.sh

set -e  # Exit on error

echo "🚀 Starting DUJYO MVP Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if deploy directory exists, create if not
DEPLOY_DIR="./deploy"
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}Creating deploy directory...${NC}"
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR/static"
    mkdir -p "$DEPLOY_DIR/migrations"
    mkdir -p "$DEPLOY_DIR/logs"
fi

# 1. Build Backend
echo -e "${GREEN}📦 Building backend...${NC}"
cd dujyo-backend
cargo build --release
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed!${NC}"
    exit 1
fi

# Copy binary
cp target/release/xwavve-backend ../deploy/dujyo-backend
chmod +x ../deploy/dujyo-backend
echo -e "${GREEN}✅ Backend built successfully${NC}"

# 2. Build Frontend
echo -e "${GREEN}📦 Building frontend...${NC}"
cd ../dujyo-frontend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

# Copy static files
cp -r dist/* ../deploy/static/
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# 3. Copy migrations
echo -e "${GREEN}📋 Copying migrations...${NC}"
cd ../dujyo-backend
cp migrations/*.sql ../deploy/migrations/
echo -e "${GREEN}✅ Migrations copied${NC}"

# 4. Copy environment template
echo -e "${YELLOW}⚠️  Creating .env template...${NC}"
cd ..
if [ -f ".env.production" ]; then
    cp .env.production deploy/.env
    echo -e "${GREEN}✅ Production .env copied${NC}"
else
    echo -e "${YELLOW}⚠️  .env.production not found, creating template...${NC}"
    cat > deploy/.env << EOF
# Database
DATABASE_URL=postgresql://dujyo_user:password@localhost:5432/dujyo_db

# JWT
JWT_SECRET=your-secret-key-here-change-in-production

# Server
PORT=8083
HOST=0.0.0.0

# CDN (Cloudflare R2)
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_ENDPOINT=https://r2.cloudflarestorage.com
R2_BUCKET=dujyo-media

# Redis (optional)
REDIS_URL=redis://localhost:6379
EOF
    echo -e "${YELLOW}⚠️  Please update deploy/.env with production values!${NC}"
fi

# 5. Create startup script
echo -e "${GREEN}📝 Creating startup script...${NC}"
cat > deploy/start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export RUST_LOG=info
./dujyo-backend
EOF
chmod +x deploy/start.sh

# 6. Create README
cat > deploy/README.md << 'EOF'
# DUJYO MVP Deployment

## Quick Start

1. Update `.env` with production values
2. Run migrations: `psql -U dujyo_user -d dujyo_db -f migrations/024_content_marketplace.sql`
3. Start server: `./start.sh`

## Files

- `dujyo-backend` - Backend binary
- `static/` - Frontend static files
- `migrations/` - Database migrations
- `.env` - Environment configuration
- `logs/` - Application logs

## Health Check

- Basic: `http://localhost:8083/health`
- Detailed: `http://localhost:8083/api/v1/health/detailed`
EOF

echo -e "${GREEN}✅ Deployment package ready!${NC}"
echo -e "${GREEN}📁 Files in: ./deploy/${NC}"
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "  1. Update deploy/.env with production values"
echo "  2. Run database migrations"
echo "  3. Execute: cd deploy && ./start.sh"

