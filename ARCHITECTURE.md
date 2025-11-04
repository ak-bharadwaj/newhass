# 🏗️ System Architecture

## Overview

The Hospital Automation System follows a modern, scalable architecture with clear separation between frontend, backend, and data layers. The system is designed for high availability, security, and extensibility.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Browser    │  │    Mobile    │  │   Tablet     │         │
│  │  (Desktop)   │  │    Device    │  │    Device    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    HTTPS / WebSocket
                             │
┌─────────────────────────────┴───────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│                     (Next.js 14 Frontend)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  App Router   │  Server Components  │  Client Components │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Pages & Layouts    │    UI Components    │   Hooks      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Voice Assistant    │    AI Features      │   SSE Client │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                    REST API / SSE Stream
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                        (FastAPI Backend)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication  │  Authorization  │  Rate Limiting      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
│                        (Service Layer)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Auth      │  │   Clinical   │  │   Patient    │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     AI       │  │  Analytics   │  │Notification  │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                   DATA ACCESS LAYER                              │
│                    (Repository Pattern)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SQLAlchemy ORM  │  Alembic Migrations  │  Query Builder│  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PostgreSQL   │  │    Redis     │  │   MinIO/S3   │         │
│  │  (Primary)   │  │   (Cache)    │  │ (File Store) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Next.js 14 App Router Structure

```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── (auth)/            # Auth group
│   │   │   └── login/
│   │   ├── (dashboard)/       # Dashboard group
│   │   │   ├── doctor/
│   │   │   ├── nurse/
│   │   │   ├── patient/
│   │   │   └── ...            # Other roles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   ├── charts/           # Chart components
│   │   └── ai/               # AI-specific components
│   ├── lib/                  # Utilities
│   │   ├── api.ts            # API client
│   │   ├── auth.ts           # Auth utilities
│   │   └── utils.ts          # Helper functions
│   ├── services/             # Business logic
│   │   ├── voiceAssistant.ts
│   │   └── notifications.ts
│   └── types/                # TypeScript types
└── public/                   # Static assets
```

### Component Architecture

```typescript
// Feature-based component structure
Component
├── Container Component (Logic)
│   ├── State Management
│   ├── API Calls
│   ├── Business Logic
│   └── Event Handlers
└── Presentational Component (UI)
    ├── Props Interface
    ├── Rendering Logic
    └── Styling
```

## Backend Architecture

### FastAPI Service Layer

```
backend/
├── app/
│   ├── api/                   # API routes
│   │   └── v1/
│   │       ├── endpoints/    # Route handlers
│   │       │   ├── auth.py
│   │       │   ├── patients.py
│   │       │   ├── clinical.py
│   │       │   └── ...
│   │       └── api.py        # Router aggregation
│   ├── core/                 # Core functionality
│   │   ├── config.py         # Configuration
│   │   ├── security.py       # Auth & security
│   │   └── dependencies.py   # FastAPI dependencies
│   ├── models/               # SQLAlchemy models
│   │   ├── user.py
│   │   ├── patient.py
│   │   └── ...
│   ├── schemas/              # Pydantic schemas
│   │   ├── user.py
│   │   ├── patient.py
│   │   └── ...
│   ├── services/             # Business logic
│   │   ├── auth_service.py
│   │   ├── patient_service.py
│   │   └── ai_service.py
│   ├── repositories/         # Data access
│   │   └── base_repository.py
│   └── main.py              # Application entry
└── alembic/                 # Database migrations
```

### Request Flow

```
1. Client Request
   ↓
2. API Gateway (FastAPI)
   ├── Authentication Middleware
   ├── CORS Middleware
   └── Rate Limiting Middleware
   ↓
3. Route Handler
   ├── Request Validation (Pydantic)
   └── Dependency Injection
   ↓
4. Service Layer
   ├── Business Logic
   ├── Validation Rules
   └── Error Handling
   ↓
5. Repository Layer
   ├── Database Queries
   └── Transaction Management
   ↓
6. Database (PostgreSQL)
   ↓
7. Response Serialization
   ↓
8. Client Response
```

## Data Architecture

### Database Schema

```sql
-- Core Entities
Users (id, email, role, ...)
  ├── Doctors (user_id, specialization, ...)
  ├── Nurses (user_id, department, ...)
  ├── Patients (user_id, medical_record_number, ...)
  └── Staff (user_id, position, ...)

Patients (id, mrn, demographics, ...)
  ├── Appointments (id, patient_id, doctor_id, ...)
  ├── CaseSheets (id, patient_id, chief_complaint, ...)
  ├── Prescriptions (id, patient_id, doctor_id, ...)
  ├── LabOrders (id, patient_id, doctor_id, ...)
  └── Vitals (id, patient_id, recorded_at, ...)

Beds (id, ward, status, ...)
  └── BedAssignments (id, bed_id, patient_id, ...)

AuditLogs (id, user_id, action, timestamp, ...)
```

### Data Flow Patterns

#### 1. **Patient Registration Flow**
```
Reception → Create Patient → Generate MRN → Assign Bed (if admitted)
```

#### 2. **Clinical Workflow**
```
Doctor (Diagnosis) → Prescription → Pharmacist (Dispense) → Lab Order → Lab Tech (Results)
```

#### 3. **AI Analysis Flow**
```
User Input → AI Service → Validation → Database → Response
```

## Security Architecture

### Authentication Flow

```
1. User Login (email/password)
   ↓
2. Backend Validation
   ↓
3. JWT Token Generation
   ├── Access Token (short-lived)
   └── Refresh Token (long-lived)
   ↓
4. Token Storage (httpOnly cookie)
   ↓
5. Subsequent Requests
   ├── Token Validation
   ├── Role Verification
   └── Permission Check
```

### Authorization Matrix

| Role | Patients | Prescriptions | Labs | Beds | Users | Reports |
|------|----------|---------------|------|------|-------|---------|
| Doctor | Read/Write | Read/Write | Read/Write | Read | Read | Read |
| Nurse | Read/Write | Read | Read | Read/Write | - | Read |
| Pharmacist | Read | Read/Write | - | - | - | Read |
| Lab Tech | Read | - | Read/Write | - | - | Read |
| Manager | Read | Read | Read | Read | Read | Read/Write |
| Admin | Full | Full | Full | Full | Read/Write | Full |
| Super Admin | Full | Full | Full | Full | Full | Full |

## AI Architecture

### Voice Assistant Flow

```
1. User Voice Input
   ↓
2. Web Speech API (Browser)
   ├── Speech Recognition
   └── Text Transcription
   ↓
3. Command Parser (Frontend)
   ├── Intent Detection
   └── Parameter Extraction
   ↓
4. Action Dispatcher
   ├── Navigation Commands
   ├── Data Entry Commands
   └── Query Commands
   ↓
5. Execution & Feedback
   └── Voice Response (Text-to-Speech)
```

### AI Prescription Validation

```
1. Doctor Creates Prescription
   ↓
2. AI Validation Service
   ├── Drug Interaction Check
   ├── Dosage Validation
   ├── Contraindication Check
   └── Patient History Analysis
   ↓
3. Warning Generation
   ├── Critical Warnings (blocking)
   └── Informational Warnings
   ↓
4. Doctor Review & Override
   ↓
5. Prescription Approval
```

## Real-time Architecture

### Server-Sent Events (SSE)

```
1. Client Opens SSE Connection
   ↓
2. Backend Maintains Connection Pool
   ↓
3. Event Generation
   ├── New Appointment
   ├── Lab Result Ready
   ├── Prescription Ready
   └── System Alerts
   ↓
4. Push to Relevant Clients
   ├── Role-based Filtering
   └── User-specific Events
   ↓
5. Client Receives & Processes
   ├── UI Update
   ├── Notification Display
   └── Audio Alert (optional)
```

## Deployment Architecture

### Docker Container Structure

```
┌─────────────────────────────────────────────┐
│           Docker Compose Stack              │
├─────────────────────────────────────────────┤
│  Frontend Container (Next.js)               │
│  ├── Node.js 18                            │
│  └── Port: 3000                            │
├─────────────────────────────────────────────┤
│  Backend Container (FastAPI)                │
│  ├── Python 3.11                           │
│  └── Port: 8000                            │
├─────────────────────────────────────────────┤
│  Database Container (PostgreSQL)            │
│  ├── PostgreSQL 15                         │
│  └── Port: 5432                            │
├─────────────────────────────────────────────┤
│  Cache Container (Redis) [Optional]         │
│  ├── Redis 7                               │
│  └── Port: 6379                            │
├─────────────────────────────────────────────┤
│  Nginx Reverse Proxy                        │
│  ├── SSL Termination                       │
│  ├── Load Balancing                        │
│  └── Port: 80, 443                         │
└─────────────────────────────────────────────┘
```

## Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Automatic with Next.js App Router
- **Lazy Loading**: React.lazy() for heavy components
- **Image Optimization**: Next.js Image component
- **Caching**: Service Worker for offline support

### Backend Optimizations
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: SQLAlchemy connection pool
- **Query Optimization**: Eager loading, selective fields
- **Caching**: Redis for frequently accessed data

### Network Optimizations
- **Compression**: Gzip/Brotli compression
- **CDN**: Static asset delivery
- **HTTP/2**: Multiplexing support
- **WebSocket**: Persistent connections for real-time

## Scalability Strategy

### Horizontal Scaling
- **Frontend**: Multiple Next.js instances behind load balancer
- **Backend**: Multiple FastAPI workers with Gunicorn
- **Database**: Read replicas for query distribution

### Vertical Scaling
- **Database**: Increased RAM for caching
- **Backend**: More CPU cores for concurrent requests
- **Redis**: Larger cache for session storage

## Monitoring & Observability

### Metrics
- **Application Metrics**: Request rate, response time, error rate
- **System Metrics**: CPU, memory, disk usage
- **Business Metrics**: User activity, feature usage

### Logging
- **Application Logs**: Structured JSON logging
- **Access Logs**: Nginx access logs
- **Error Logs**: Centralized error tracking

### Alerting
- **Performance Alerts**: Slow queries, high CPU
- **Error Alerts**: 5xx errors, exceptions
- **Business Alerts**: Failed logins, critical operations

---

## Conclusion

This architecture provides a solid foundation for a production-grade healthcare management system with:
- ✅ Clear separation of concerns
- ✅ Scalability and performance
- ✅ Security and compliance
- ✅ Maintainability and extensibility
- ✅ Real-time capabilities
- ✅ AI-powered features
