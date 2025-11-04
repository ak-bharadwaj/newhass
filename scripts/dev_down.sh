#!/bin/bash

# Script to stop all development services

set -e

echo "🛑 Stopping Hospital Automation System services..."

cd "$(dirname "$0")/../infra"

docker-compose down

echo "✅ All services stopped successfully!"
