# Feature Gap Report: README Promises vs Current Implementation

Generated: 2025-10-27

This report maps the features promised in `README.md` against what’s currently implemented in the repository, highlighting Partial/Missing items with concrete pointers to files and next actions.

## Summary

- Strong foundation: multi-tenant RBAC, 9 dashboards, EMR sync on discharge, Celery tasks, SSE real-time alerts, AI endpoints, file storage, notifications, metrics, and Docker/Compose are all present.
- Overstatements: a few documentation claims don’t match code (e.g., Sentry “ready” but not initialized, pharmacy inventory APIs are stubs, extra Alembic migrations referenced but absent, test coverage claims).

Status legend: ✅ Implemented | 🟡 Partial/Stub | ❌ Missing | ❓ Unverified claim

## Mapping by Area

### Core Platform

- Multi-tenant (regions/hospitals): ✅ Models and routes exist
  - Models: `backend/app/models/{region.py,hospital.py,patient_hospital.py}`
  - Routes: `backend/app/api/routes/{regions.py,hospitals.py}`
- RBAC for 9 roles: ✅ Implemented
  - Roles, permissions: `backend/scripts/seed_demo_data.py`, `backend/app/core/permissions.py`
  - Dashboards present: `frontend/src/app/dashboard/*` (all 9 roles + profile)
- Authentication + JWT: ✅ Implemented
  - Routes: `backend/app/api/routes/auth.py`
  - Guards: `backend/app/core/dependencies.py`, `require_role`, `require_permission`

### EMR and Clinical Workflows

- Local and Global EMR with automated synchronization: ✅ Implemented
  - Discharge endpoint triggers Celery task: `backend/app/api/routes/visits.py` → `autosync_discharge.delay`
  - Sync service: `backend/app/services/emr_sync_service.py`
  - PDF case-sheet generation: `backend/app/services/pdf_service.py` (HTML export to S3/MinIO)
  - Notifications + audit log on completion: `backend/app/tasks/discharge.py`, `backend/app/services/notification_service.py`
- Vitals, labs, prescriptions: ✅ Models + routes exist
  - Models: `vitals.py`, `lab_test.py`, `prescription.py`
  - Clinical routes: `backend/app/api/routes/clinical.py`

### Lab Management

- Lab workflow + PDF uploads: ✅ Basic flow present
  - Uploads: `backend/app/api/routes/files.py` (lab report)
  - Result fields: `app/models/lab_test.py`
- Lab coordination task: ✅ Task present
  - `backend/app/tasks/lab.py`

### Appointments and Bed Management

- Appointment scheduling + conflict handling: ✅ Present (routes/services)
  - Routes: `backend/app/api/routes/appointments.py`
  - Seeds include appointments: `backend/scripts/seed_demo_data.py`
- Bed management: ✅ Present
  - Model: `app/models/bed.py`; Route: `backend/app/api/routes/beds.py`

### AI Features

- Risk score, discharge summary, treatment plan, anomaly detection: ✅ Implemented
  - Routes: `backend/app/api/routes/ai.py`
  - Service + adapters: `backend/app/services/ai_service.py`, `backend/app/ai/{gemini_adapter.py,openai_adapter.py,dev_adapter.py}`
- Human-in-loop approvals: ✅ Drafts flow exists
  - Draft models: `backend/app/models/ai_draft.py`; Endpoints in `ai.py`

### Automation (Celery)

- Autosync on discharge: ✅ `backend/app/tasks/discharge.py`
- Vitals monitoring: ✅ Task exists `backend/app/tasks/vitals_monitoring.py`
- Notifications delivery: ✅ `backend/app/tasks/send_notifications.py`
- Beat scheduler service: ✅ In docker-compose (`celery_beat`)

### Real-Time Updates

- SSE implemented for alerts: ✅
  - Backend: `backend/app/core/sse.py`, `backend/app/api/routes/sse.py`
  - Frontend: `frontend/src/components/common/RealTimeAlerts.tsx`, `frontend/src/hooks/useSSE.ts` (tests in `frontend/tests/useSSE.test.ts`)

### Notifications (In-app, Email, Push)

- Notification service and multi-channel fan-out: ✅ Implemented
  - Service: `backend/app/services/notification_service.py`
  - Providers: `backend/app/notifications/{email_provider.py,push_provider.py,in_app_provider.py,logger_provider.py}`
  - Push: VAPID keys script `backend/scripts/generate_vapid_keys.py`; router `backend/app/api/routes/push.py`

### Observability, Security, DevOps

- Prometheus metrics endpoint: ✅ Implemented
  - `/metrics` in `backend/app/main.py`; collector/middleware `backend/app/core/metrics.py`
- Rate limiting: ✅ In-memory middleware `backend/app/core/rate_limit.py`
- CORS, logging, config: ✅ Present in `backend/app/main.py`, `app/core/config.py`
- Docker/Compose for full stack + Celery: ✅ Both root and `infra/docker-compose.yml`
- GitHub Actions CI: ✅ Present `.github/workflows/ci.yml` (lint, tests, build)
- Sentry error tracking: 🟡 Partial
  - SDK in requirements and config var present, but no app initialization (`sentry_sdk.init(...)` not found)

### Frontend UX and Extras

- Modern UI (Tailwind, Framer Motion): ✅ Implemented
  - Animations: `frontend/src/lib/animations.ts`; components use it widely
- Profile pictures + regional branding: ✅ Implemented
  - Components: `ProfilePictureUpload.tsx`, `ProfilePictureDisplay.tsx`, `RegionalThemeContext.tsx`
- Voice assistant + SOAP generator: ✅ Present
  - Voice: `frontend/src/components/voice/VoiceAssistantWidget.tsx`, service `src/services/voiceAssistant.ts`
  - SOAP generator backend: `backend/app/services/soap_generator.py`
- PWA foundation: ✅ `frontend/public/sw.js` present; integration status not fully validated

## Partial or Missing Items (Actionable)

1) Sentry “ready” but not initialized — 🟡 Partial
- Evidence: `sentry-sdk` in `backend/requirements.txt`, `SENTRY_DSN` in config; no `sentry_sdk.init` usage.
- Action:
  - Add initialization in `backend/app/main.py` (on startup) guarded by env var.
  - Capture FastAPI/Starlette integrations and Celery errors.

2) Pharmacy inventory APIs — 🟡 Partial/Stub
- Evidence: `backend/app/api/routes/pharmacy.py` has TODOs and returns empty lists or mock responses; mentions missing `PharmacyInventory` model.
- Action:
  - Create `app/models/pharmacy_inventory.py` and migration.
  - Implement CRUD and queries for low-stock/expiring.
  - Wire into pharmacist dashboard UI.

3) Documentation vs Migrations mismatch — 🟡 Partial
- Claim: Docs mention migrations `002_add_profile_picture_url.py` and `003_add_medical_conditions.py`.
- Evidence: `backend/alembic/versions/` only contains `001_initial_schema.py`.
- Action:
  - Either add the referenced migrations if needed, or update docs to reflect consolidated initial schema.

4) Test coverage numbers — ❓ Unverified (likely overstated)
- Claim: 80%+ backend, 70%+ frontend in `COMPLETE_PROJECT_STATUS.md`.
- Evidence: Tests exist (`backend/tests/*`, `frontend/__tests__`, `e2e/`), but actual coverage not measured here.
- Action:
  - Run CI to collect coverage (Codecov step exists).
  - If below targets, add unit/integration tests for services and key routes.

5) API Keys management (Super Admin) — ❌ Missing
- Claim: README Super Admin dashboard includes “API key management”.
- Evidence: No API keys model or routes found.
- Action:
  - Add `api_key` model and endpoints; UI for create/rotate/revoke.

6) Inventory monitoring with alerts (Regional Admin) — 🟡 Partial
- Claim: Inventory monitoring with alerts.
- Evidence: General `Inventory` model exists; pharmacy endpoints are stubs; no dedicated alerting service for thresholds.
- Action:
  - Implement scheduled job scanning low-stock; raise notifications via `NotificationService` and SSE.

7) Patient secure messaging — ❌ Missing
- Claim appears in broader docs/UX copy; no messaging models/routes identified.
- Action:
  - Define messaging threads/messages models, routes, and patient portal UI.

8) Accessibility and performance claims (scores) — ❓ Unverified
- Claim: Lighthouse ~94, TTI ~2.4s; strong accessibility.
- Evidence: Optimizations present; metrics not recorded in repo.
- Action:
  - Add automated Lighthouse CI or docs with reproducible runs.

## Quick Evidence Index

- Discharge workflow: `backend/app/api/routes/visits.py`, `backend/app/tasks/discharge.py`, `backend/app/services/{emr_sync_service.py,pdf_service.py,notification_service.py}`
- AI routes: `backend/app/api/routes/ai.py`; adapters `backend/app/ai/*`
- Real-time SSE: `backend/app/core/sse.py`, `backend/app/api/routes/sse.py`
- Metrics + rate limiting: `backend/app/core/{metrics.py,rate_limit.py}`, `/metrics` in `backend/app/main.py`
- CI: `.github/workflows/ci.yml`
- Pharmacy stubs: `backend/app/api/routes/pharmacy.py`
- Dashboards: `frontend/src/app/dashboard/*`

## Recommended Next Steps (1–2 weeks)

1. Wire Sentry init (backend + Celery) and add DSN to envs.
2. Implement PharmacyInventory model + routes + migrations; connect to UI.
3. Add low-stock/expiring inventory alerts via Celery and SSE/notifications.
4. Clarify migrations: add missing migration files or update docs.
5. Run CI to capture real coverage; add tests for service layers (EMR sync, notifications, AI drafts) to hit targets.
6. Optional: add API keys module and admin UI if needed by stakeholders.

---

Prepared to support implementation of the above items—ping me with priorities and I’ll open PRs accordingly.
