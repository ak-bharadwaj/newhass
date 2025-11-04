#!/bin/bash

# Development startup script for Hospital Automation System
# This script starts all services using Docker Compose

set -e

echo "🏥 Hospital Automation System - Development Startup"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Navigate to the infra directory
cd "$(dirname "$0")/../infra"

echo ""
echo "📦 Building and starting all services..."
echo ""

# Start all services
docker-compose up --build -d

echo ""
echo "✅ All services are starting up!"
echo ""
echo "📝 Service URLs:"
echo "   - Frontend:     http://localhost:3000"
echo "   - API:          http://localhost:8000"
echo "   - API Docs:     http://localhost:8000/api/docs"
echo "   - MinIO Console: http://localhost:9001 (admin/minioadmin)"
echo "   - PostgreSQL:   localhost:5432 (hass/hass_dev_password)"
echo "   - Redis:        localhost:6379"
echo ""
echo "📊 Check service health:"
echo "   docker-compose ps"
echo ""
echo "📋 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop all services:"
echo "   docker-compose down"
echo ""
echo "⏳ Services are starting... This may take a minute."
echo "   Run 'docker-compose logs -f' to watch the startup process."
