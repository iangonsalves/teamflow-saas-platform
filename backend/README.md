# TeamFlow Backend

I built this backend to be the operational core of TeamFlow.

It owns:

- authentication and profile updates
- workspace and membership rules
- project and task operations
- invitation management
- audit logging
- billing integration
- database access

The frontend consumes this API, but this is where the actual business rules live.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT authentication
- Stripe
- Swagger
- Jest

## Main Dependencies

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/jwt`
- `@nestjs/passport`
- `@prisma/client`
- `prisma`
- `passport-jwt`
- `stripe`
- `multer`
- `jest`

## Backend Role In The Product

I use the backend to turn user actions into validated domain behavior.

Examples:

- a user can only access a workspace if they belong to it
- only the right roles can manage members or create certain records
- task edits and status changes are persisted consistently
- billing state is synced through Stripe webhook handling
- avatar uploads are stored and linked back to the user profile

## Features

### Core API Features

- authentication and profile management
- workspace, project, and task APIs
- invitation handling
- audit logging

### Security And Access Features

- JWT-protected endpoints
- role-based membership enforcement
- validated request DTOs
- auth rate limiting

### Billing Features

- Stripe checkout session creation
- customer portal session creation
- invoice retrieval
- webhook-based subscription synchronization

## Backend Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── auth/
│   ├── audit-logs/
│   ├── billing/
│   ├── invitations/
│   ├── prisma/
│   ├── projects/
│   ├── tasks/
│   ├── workspaces/
│   ├── app.module.ts
│   ├── bootstrap.ts
│   └── main.ts
└── test/
```

## How The Backend Is Organized

I use a feature-based NestJS structure.

Instead of keeping all controllers in one folder and all services in another, I gave each business area its own module. That keeps related code together and makes the system easier to scale.

Typical feature contents:

- `*.module.ts` wires the feature into Nest
- `*.controller.ts` defines the HTTP routes
- `*.service.ts` contains the business logic
- `dto/` defines validated request shapes
- `*.spec.ts` holds tests

## Feature Guide

### `src/auth/`

Handles:

- registration
- login
- current-user lookup
- profile updates
- avatar upload/remove
- JWT protection and auth rate limiting

Important routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

### `src/workspaces/`

Handles:

- workspace creation
- workspace listing and retrieval
- member add/update/remove
- RBAC checks

### `src/projects/`

Handles:

- project creation inside a workspace
- project listing and lookup

### `src/tasks/`

Handles:

- task creation
- task detail edits
- assignee updates
- status movement
- board/list retrieval

### `src/invitations/`

Handles:

- invite creation
- invitation listing
- invitation acceptance

### `src/audit-logs/`

Handles:

- recording important product events
- exposing workspace activity history

Examples of logged events:

- workspace created
- member added or role updated
- billing session created
- task updated

### `src/billing/`

Handles:

- Stripe checkout sessions
- Stripe customer portal sessions
- invoice history retrieval
- subscription synchronization from webhooks

### `src/prisma/`

I use this as the shared Prisma client/module across the backend.

## Request Flow

A typical request follows this path:

1. controller receives the HTTP request
2. DTO validation checks the incoming payload
3. auth guards and role checks run
4. service applies business logic
5. Prisma reads or writes PostgreSQL data
6. controller returns the response to the frontend

That separation is intentional:

- controllers stay thin
- services hold the real logic
- Prisma stays behind the service layer

## How The Backend Connects To The Frontend

The frontend uses this API for all live product data.

Examples:

- auth pages call backend auth endpoints
- dashboard and workspace pages load workspaces, projects, tasks, and audit history
- billing pages request checkout, portal, subscription, and invoices
- account page uploads avatar files through multipart form-data

## API Integration

The Next.js frontend consumes the backend through REST endpoints under `/api`.

Main integration patterns:

- JSON requests for auth, workspaces, projects, tasks, invitations, audit logs, and billing reads
- multipart form-data for profile avatar upload
- webhook handling for Stripe subscription lifecycle events

## Runtime Behavior

- all API routes are prefixed with `/api`
- Swagger is available at `/docs`
- uploaded files are served from `/uploads/...`
- global validation is enabled in the app bootstrap

## Testing

I included:

- unit tests for key services and guards
- end-to-end coverage for core flows

Useful commands:

```bash
npm run build
npm run test
npm run test:e2e
npm run prisma:studio
```

## Available Scripts

- `npm run start:dev` start the backend in watch mode
- `npm run build` compile the Nest app
- `npm run test` run unit tests
- `npm run test:e2e` run end-to-end tests
- `npm run prisma:studio` open Prisma Studio

## Key Feature Implementation

### Authentication

- I use JWT auth with protected routes
- I expose current-user lookup and profile update endpoints

### Workspace RBAC

- membership roles drive create, update, and remove permissions
- services enforce access instead of relying on the frontend

### Task Execution

- task edits, assignment changes, and status movement are persisted through the task service layer

### Billing

- Stripe billing state is not just read from the frontend
- I keep checkout creation, portal session creation, and webhook sync in the backend

### Profile Avatars

- profile updates accept multipart form-data
- uploaded files are served back through backend static file handling

## Running Locally

If you want to run only the backend:

```bash
cd backend
npm install
cp ../.env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Local Storage And Schema Locations

- database schema: `prisma/schema.prisma`
- migrations: `prisma/migrations/`
- uploaded avatars: `uploads/avatars/`

## Deployment Notes

- for production, I would run PostgreSQL, uploaded assets, and Stripe on proper managed infrastructure
- uploaded assets should move to object storage such as S3 or Cloudinary
- webhook endpoints must be publicly reachable in production

- membership roles drive create/update/remove permissions
- services enforce access instead of relying on the frontend

### Task Execution

- task edits, assignment changes, and status movement are persisted through the task service layer

### Billing

- Stripe billing state is not just read from the frontend
- backend owns checkout creation, portal session creation, and webhook sync

### Profile Avatars

- profile updates accept multipart form-data
- uploaded files are served back through backend static file handling

## Running Locally

If you want to run only the backend:

```bash
cd backend
npm install
cp ../.env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Local Storage And Schema Locations

- database schema: `prisma/schema.prisma`
- migrations: `prisma/migrations/`
- uploaded avatars: `uploads/avatars/`

## Deployment Notes

- for production, I would run PostgreSQL, uploaded assets, and Stripe on proper managed infrastructure
- webhook endpoints must be publicly reachable in production
