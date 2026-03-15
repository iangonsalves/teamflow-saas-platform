# TeamFlow SaaS Platform

TeamFlow is a multi-tenant task management SaaS platform built with NestJS, Next.js, and PostgreSQL. This repository is organized as a monorepo with separate `backend` and `frontend` applications.

## Stack

- Frontend: Next.js App Router with TypeScript and Tailwind CSS
- Backend: NestJS with TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT access and refresh tokens
- Billing: Stripe test-mode subscriptions
- Local infrastructure: Docker Compose

## Repository Structure

- `backend/`: NestJS API
- `frontend/`: Next.js application
- `docs/`: planning and project documentation

## Current Setup Scope

This initial setup branch includes:

- official NestJS and Next.js app scaffolds
- root project documentation
- Docker Compose baseline
- environment variable template
- backend API bootstrap with validation and Swagger
- frontend landing page branded for TeamFlow
- Prisma initialization scaffold

## Local Development

### 1. Install dependencies

The generated apps already contain their own `package.json` files.

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2. Set environment variables

Copy the example values from [`.env.example`](/Users/iangonsalves/Documents/Github/teamflow-saas-platform/.env.example) into the appropriate local `.env` files for your environment.

### 3. Start PostgreSQL with Docker

```bash
docker compose up -d db
```

### 4. Run the apps

Backend:

```bash
cd backend
npm run start:dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Next Planned Branches

- `feature/database-schema`
- `feature/auth`
- `feature/workspaces`
- `feature/rbac-memberships`
- `feature/projects`
- `feature/tasks`

## Notes

- Prisma is pinned to `6.16.0` in the backend because the current local Node version is `20.15.0` and Prisma `7.x` requires Node `20.19+`.
- The project standardizes on `workspaces` rather than mixing `workspaces` and `organizations`.

