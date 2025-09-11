#!/bin/bash

# CloudGreet Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="cloudgreet"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/cloudgreet-deploy.log"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a $LOG_FILE
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
fi

if ! docker info &> /dev/null; then
    error "Docker is not running"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
fi

# Check if required environment variables are set
required_vars=(
    "DB_HOST"
    "DB_PASSWORD"
    "AZURE_COMMUNICATION_CONNECTION_STRING"
    "STRIPE_SECRET_KEY"
    "RETELL_API_KEY"
    "NEXTAUTH_SECRET"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        error "Required environment variable $var is not set"
    fi
done

log "Starting CloudGreet deployment..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup current database
log "Creating database backup..."
if docker-compose -f $DOCKER_COMPOSE_FILE ps postgres | grep -q "Up"; then
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
    docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE
    log "Database backup created: $BACKUP_FILE"
else
    warning "PostgreSQL container is not running, skipping backup"
fi

# Pull latest images
log "Pulling latest Docker images..."
docker-compose -f $DOCKER_COMPOSE_FILE pull

# Stop current services
log "Stopping current services..."
docker-compose -f $DOCKER_COMPOSE_FILE down

# Start services
log "Starting services..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 30

# Check if application is responding
log "Checking application health..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log "Application is healthy"
        break
    fi
    
    if [ $i -eq 30 ]; then
        error "Application failed to start after 5 minutes"
    fi
    
    log "Waiting for application to start... ($i/30)"
    sleep 10
done

# Run database migrations
log "Running database migrations..."
docker-compose -f $DOCKER_COMPOSE_FILE exec app npm run migrate

# Check if all services are running
log "Checking service status..."
services=("app" "postgres" "redis" "nginx")
for service in "${services[@]}"; do
    if docker-compose -f $DOCKER_COMPOSE_FILE ps $service | grep -q "Up"; then
        log "$service is running"
    else
        error "$service is not running"
    fi
done

# Run final health check
log "Running final health check..."
response=$(curl -s http://localhost:3000/api/health)
if echo "$response" | grep -q '"status":"healthy"'; then
    log "Deployment successful!"
    log "Application is available at: http://localhost:3000"
else
    error "Health check failed: $response"
fi

# Clean up old Docker images
log "Cleaning up old Docker images..."
docker image prune -f

# Clean up old backups (keep last 7 days)
log "Cleaning up old backups..."
find $BACKUP_DIR -name "backup-*.sql" -mtime +7 -delete

log "Deployment completed successfully!"

# Send notification (if webhook URL is provided)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ CloudGreet deployment completed successfully!\"}" \
        $SLACK_WEBHOOK_URL
fi
