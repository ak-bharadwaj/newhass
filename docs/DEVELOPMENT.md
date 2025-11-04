# Development Guide

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- Git

### Local Setup

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd hass
   ```

2. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   ```

4. **Start infrastructure:**
   ```bash
   cd infra
   docker-compose up -d postgres redis minio
   ```

5. **Run migrations:**
   ```bash
   cd backend
   alembic upgrade head
   python scripts/seed_demo_data.py
   ```

6. **Start development servers:**

   Backend:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

   Celery Worker (optional):
   ```bash
   cd backend
   celery -A app.celery_app worker --loglevel=info
   ```

## Project Structure

```
hass/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── ai/           # AI adapters
│   │   ├── api/          # API routes
│   │   ├── core/         # Core utilities
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   ├── tasks/        # Celery tasks
│   │   └── notifications/# Notification providers
│   ├── alembic/          # Database migrations
│   ├── tests/            # Tests
│   └── requirements.txt
├── frontend/             # Next.js frontend
│   ├── src/
│   │   ├── app/         # Pages (App Router)
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   └── lib/         # Utilities
│   └── __tests__/       # Tests
├── infra/               # Infrastructure
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── e2e/                 # E2E tests
└── docs/                # Documentation
```

## Coding Standards

### Backend (Python)

- Follow PEP 8
- Use type hints
- Run Ruff for linting: `ruff check .`
- Run mypy for type checking: `mypy app`
- Format with Black (if configured)

### Frontend (TypeScript)

- Use TypeScript strict mode
- Run ESLint: `npm run lint`
- Type check: `npm run type-check`
- Format with Prettier

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
pytest tests/ --cov=app  # With coverage
```

### Frontend Tests

```bash
cd frontend
npm test
npm test -- --coverage
```

### E2E Tests

```bash
cd e2e
npx playwright test
npx playwright test --ui  # Interactive mode
```

## Database Migrations

### Create migration:
```bash
cd backend
alembic revision --autogenerate -m "Description"
```

### Apply migrations:
```bash
alembic upgrade head
```

### Rollback:
```bash
alembic downgrade -1
```

## API Development

### Adding New Endpoint

1. Create Pydantic schema in `backend/app/schemas/`
2. Add route in `backend/app/api/routes/`
3. Implement service logic in `backend/app/services/`
4. Register router in `backend/app/main.py`
5. Add tests in `backend/tests/`

### API Documentation

FastAPI automatically generates OpenAPI docs:
- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`

## Frontend Development

### Adding New Dashboard

1. Create page in `frontend/src/app/dashboard/[role]/page.tsx`
2. Add components in `frontend/src/components/`
3. Update API client in `frontend/src/lib/api.ts`
4. Add tests in `frontend/__tests__/`

### Component Guidelines

- Use functional components with hooks
- Implement loading and error states
- Add Framer Motion animations
- Follow existing design patterns (glass morphism)
- Use TypeScript for props

## Git Workflow

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and commit: `git commit -m "Description"`
3. Push branch: `git push origin feature/description`
4. Create Pull Request
5. Wait for CI/CD checks
6. Request review
7. Merge after approval

## Debugging

### Backend

- Use `breakpoint()` for debugging
- Check logs: `docker-compose logs -f backend`
- Use FastAPI debug mode: `DEBUG=true`

### Frontend

- Use React DevTools
- Check browser console
- Use Next.js debug mode: `npm run dev`

## Common Issues

### Port already in use

```bash
# Find process using port
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Database connection refused

Ensure PostgreSQL container is running:
```bash
docker-compose ps postgres
docker-compose up -d postgres
```

### Module not found

Reinstall dependencies:
```bash
# Backend
pip install -r requirements.txt
# Frontend
npm install
```

## Resources

- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/docs
- SQLAlchemy: https://docs.sqlalchemy.org/
- Celery: https://docs.celeryq.dev/
- Playwright: https://playwright.dev/
