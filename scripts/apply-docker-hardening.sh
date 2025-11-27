#!/bin/bash
# Script to apply Docker security hardening to all backend services
# This adds security options to backend-2 through backend-5

set -e

DOCKER_COMPOSE_FILE="docker-compose.production.yml"

echo "🔒 Applying Docker security hardening to all backend services..."

# Security configuration to add to each backend service
SECURITY_CONFIG='
    # ✅ SECURITY HARDENING: Non-root user, security options
    user: "1000:1000"  # xwave user (UID/GID from Dockerfile)
    security_opt:
      - no-new-privileges:true
    read_only: false  # Needs write access for logs
    tmpfs:
      - /tmp:noexec,nosuid,size=100m'

# Note: This script is for reference. Manual editing recommended for production.
echo "✅ Security hardening template ready"
echo "📝 Apply the following to backend-2 through backend-5:"
echo "$SECURITY_CONFIG"

