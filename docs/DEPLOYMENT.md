# Deployment Guide

## Overview

This guide covers deploying the Hospital Automation System in various environments.

## Prerequisites

- Docker & Docker Compose installed
- At least 4GB RAM available
- PostgreSQL 15+
- Redis 7+
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_DB=hospital_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# MinIO (S3-compatible storage)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<strong-password>
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# Backend
BACKEND_PORT=8000
SECRET_KEY=<generate-strong-secret-key>
AI_MODE=dev  # or 'openai' for production
OPENAI_API_KEY=<your-openai-key>  # if AI_MODE=openai

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:8000

# SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-password>
SMTP_FROM_EMAIL=noreply@hospital.com
```

## Production Deployment

### Using Docker Compose

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hass
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start services:**
   ```bash
   cd infra
   docker-compose up -d
   ```

4. **Check health:**
   ```bash
   docker-compose ps
   curl http://localhost:8000/health
   curl http://localhost:3000
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f celery_worker
   ```

### Database Migrations

Migrations run automatically on container startup. To run manually:

```bash
docker-compose exec backend alembic upgrade head
```

### Seeding Demo Data

```bash
docker-compose exec backend python scripts/seed_demo_data.py
```

## Scaling

### Horizontal Scaling

Scale Celery workers:
```bash
docker-compose up -d --scale celery_worker=3
```

### Load Balancing

Use nginx or traefik as reverse proxy for multiple backend/frontend instances.

## Monitoring

### Health Checks

- Backend: `http://localhost:8000/health`
- API Docs: `http://localhost:8000/api/v1/docs`
- MinIO Console: `http://localhost:9001`

### Logs

View container logs:
```bash
docker-compose logs -f [service-name]
```

## Backup & Restore

### Database Backup

```bash
docker-compose exec postgres pg_dump -U postgres hospital_db > backup.sql
```

### Database Restore

```bash
docker-compose exec -T postgres psql -U postgres hospital_db < backup.sql
```

### MinIO Backup

```bash
docker-compose exec minio mc mirror /data backup-location
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs [service-name]
```

### Database connection issues

Verify DATABASE_URL format and network connectivity.

### Port conflicts

Change port mappings in `.env` file.

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong SECRET_KEY
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Enable audit logging
- [ ] Backup encryption
- [ ] Restrict API access

## Performance Tuning

- Adjust worker counts based on CPU cores
- Configure PostgreSQL connection pooling
- Enable Redis persistence if needed
- Use CDN for static assets
- Enable gzip compression
