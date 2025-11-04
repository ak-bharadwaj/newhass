# Hospital Automation System - Runbook

## Quick Start

### Starting the Development Environment

```bash
./scripts/dev_up.sh
```

This will start all services:
- PostgreSQL database
- Redis cache
- MinIO S3-compatible storage
- FastAPI backend
- Next.js frontend
- Celery worker
- Celery beat scheduler

### Stopping Services

```bash
./scripts/dev_down.sh
```

Or from the infra directory:

```bash
cd infra
docker-compose down
```

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| API | http://localhost:8000 | - |
| API Documentation | http://localhost:8000/api/docs | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | hass / hass_dev_password |
| Redis | localhost:6379 | - |

## Health Checks

Check if all services are running:

```bash
cd infra
docker-compose ps
```

Check API health:

```bash
curl http://localhost:8000/health
```

Check frontend:

```bash
curl http://localhost:3000
```

## Database Operations

### Running Migrations

From the backend directory:

```bash
cd backend
alembic upgrade head
```

Or from within the Docker container:

```bash
docker exec -it hass_api alembic upgrade head
```

### Creating a New Migration

```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

### Rolling Back Migrations

```bash
cd backend
alembic downgrade -1
```

## Viewing Logs

View all logs:

```bash
cd infra
docker-compose logs -f
```

View specific service logs:

```bash
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f celery_worker
```

## Troubleshooting

### Services Won't Start

1. Check if ports are already in use:
   ```bash
   lsof -i :3000  # Frontend
   lsof -i :8000  # API
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   lsof -i :9000  # MinIO
   ```

2. Remove old containers and volumes:
   ```bash
   cd infra
   docker-compose down -v
   docker-compose up --build
   ```

### Database Connection Errors

1. Check PostgreSQL is healthy:
   ```bash
   docker exec -it hass_postgres pg_isready -U hass
   ```

2. Check database exists:
   ```bash
   docker exec -it hass_postgres psql -U hass -l
   ```

3. Reset database (⚠️ destroys all data):
   ```bash
   cd infra
   docker-compose down -v
   docker volume rm infra_postgres_data
   docker-compose up -d postgres
   ```

### API Container Crashes

1. Check logs:
   ```bash
   docker logs hass_api
   ```

2. Check if migrations are applied:
   ```bash
   docker exec -it hass_api alembic current
   ```

3. Rebuild and restart:
   ```bash
   cd infra
   docker-compose up --build -d api
   ```

### Frontend Build Errors

1. Clear Next.js cache:
   ```bash
   cd frontend
   rm -rf .next node_modules
   ```

2. Rebuild container:
   ```bash
   cd infra
   docker-compose up --build -d frontend
   ```

## Celery Tasks

### Checking Worker Status

```bash
docker logs hass_celery_worker
```

### Checking Scheduled Tasks

```bash
docker logs hass_celery_beat
```

### Manually Triggering a Task

From Python shell in API container:

```bash
docker exec -it hass_api python
```

```python
from app.tasks.example import example_task
result = example_task.delay()
print(result.get())
```

## MinIO Operations

### Access MinIO Console

1. Navigate to http://localhost:9001
2. Login with minioadmin / minioadmin
3. Create bucket `hass-files` if it doesn't exist

### Creating Bucket via CLI

```bash
docker exec -it hass_minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec -it hass_minio mc mb local/hass-files
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## Backup and Restore

### Database Backup

```bash
docker exec hass_postgres pg_dump -U hass hass_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore

```bash
cat backup.sql | docker exec -i hass_postgres psql -U hass hass_db
```

### MinIO Backup

```bash
docker exec hass_minio mc mirror local/hass-files ./minio_backup
```

## Monitoring

### Resource Usage

```bash
docker stats
```

### Database Connections

```bash
docker exec -it hass_postgres psql -U hass -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Memory Usage

```bash
docker exec -it hass_redis redis-cli INFO memory
```

## Emergency Procedures

### Complete System Reset

⚠️ **WARNING: This will delete all data**

```bash
cd infra
docker-compose down -v
docker system prune -a
./scripts/dev_up.sh
```

### Service-Specific Restart

```bash
cd infra
docker-compose restart api
docker-compose restart frontend
docker-compose restart celery_worker
```
