# TeamFlow Frontend

I built this frontend as the user-facing product surface for TeamFlow.

It is where users:

- sign in
- move through the dashboard shell
- manage workspaces and members
- work with projects and tasks
- review billing
- update their account and avatar

It sits on top of the backend API rather than owning the core business logic on its own.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS

## Main Dependencies

- `next`
- `react`
- `tailwindcss`
- `lucide-react`
- `clsx`
- project API/auth helpers from `src/lib`

## Frontend Role In The Product

I use the frontend to:

- render the application shell
- manage client-side auth state
- call the backend API
- present data from workspaces, projects, tasks, billing, and account flows
- keep the product visually consistent through shared layout primitives

## Features

### Core Features

- landing page with signed-in and signed-out behavior
- login and registration
- account profile management
- shared application shell and page-header system

### Product Features

- dashboard overview
- workspace management
- project and task execution surfaces
- invitation handling
- audit and recent activity presentation

### Billing Features

- billing summary
- Stripe checkout initiation
- customer portal access
- invoice history display

## Frontend Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── account/
│   │   ├── dashboard/
│   │   ├── invitations/
│   │   ├── login/
│   │   ├── projects/
│   │   ├── register/
│   │   ├── settings/
│   │   └── workspaces/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── shell/
│   │   └── ui/
│   └── lib/
└── public/
```

## Route Guide

### Public Routes

- `/` landing page
- `/login`
- `/register`
- `/invitations/accept`

### Authenticated Product Routes

- `/dashboard`
- `/workspaces/[workspaceId]`
- `/projects/[projectId]`
- `/settings/billing`
- `/account`

## Component Structure

### `src/app/`

This folder holds the route entry points for the Next.js app.

I keep most of the UI work inside reusable components instead of placing everything directly inside page files.

### `src/components/`

This is the main UI layer.

Important areas:

- `dashboard/` dashboard-specific panels and layout pieces
- `shell/` shared page-shell primitives
- `ui/` shared UI support like toasts and skeletons

### `src/components/shell/`

This is the main shared layout layer for the app.

Important primitives:

- `app-page-shell.tsx` shared page canvas and outer layout
- `shell-hero-header.tsx` shared hero + control-panel pattern

These components are what keep dashboard, workspace, project, billing, auth, account, and invitation pages aligned visually.

### `src/components/dashboard/`

This contains the reusable building blocks behind the dashboard shell and related operational views.

Examples:

- header/summary components
- sidebar
- task board
- workspace/project support panels

### `src/components/ui/`

I use these shared support components across the product:

- toast provider
- skeleton loading states

### `src/lib/`

Shared client-side helpers:

- `api.ts` request helpers for backend communication
- `auth-storage.ts` local auth session persistence

## Components

Important component groups:

- `shell/` shared outer page shell and hero/control header components
- `dashboard/` dashboard-specific navigation, task board, and summary surfaces
- `ui/` toasts and skeleton states
- feature shells such as billing, account, workspace, project, and invitation pages

## How The Frontend Connects To The Backend

The frontend is an API consumer.

Examples:

- auth pages call `/api/auth/register` and `/api/auth/login`
- dashboard/workspace/project pages load workspace, project, task, and audit data
- billing calls checkout, portal, and invoice endpoints
- account page calls `GET /api/auth/me` and `PATCH /api/auth/me`
- avatar uploads are sent to the backend as multipart form-data

## API Integration

I treat the frontend as a thin client over the backend API.

Main integration patterns:

- auth pages call the backend auth routes
- page-level surfaces load workspace, project, task, billing, and audit data from backend endpoints
- profile avatar updates use multipart form-data
- billing redirects are initiated through backend-generated Stripe sessions

## Main Product Surfaces

### Landing Page

- product entry point
- different actions for signed-in and signed-out users

### Auth Pages

- registration and login
- entry into the product

### Dashboard

- overview page
- workspace context
- recent project/task activity

### Workspace Pages

- members
- invitations
- projects

### Project Pages

- task board
- task editing
- task assignment and movement

### Billing

- subscription summary
- checkout
- customer portal access
- invoices

### Account

- name updates
- avatar upload/remove

## UI Direction

I use a shared shell system instead of isolated one-off pages.

Current visual direction:

- anchored application shell
- shared hero/control header pattern
- reusable secondary surface styling
- consistent button hierarchy
- shared toasts and loading treatment

That keeps the dashboard, workspace, project, billing, and account pages feeling like one product rather than a collection of separate screens.

## Runtime Behavior

- signed-in landing-page behavior is handled through a client-safe auth state snapshot
- avatar rendering depends on backend-served uploaded file URLs

## Key Feature Implementation

### Authentication

- register/login surfaces call the Nest auth API
- local auth state drives signed-in navigation and gated product actions

### Shared Shell System

- dashboard, workspace, project, billing, auth, account, and invitation pages use a common shell direction
- this keeps the product visually consistent as features grow

### Workspace And Project Navigation

- overview pages route users into dedicated workspace and project surfaces instead of keeping everything on one crowded screen

### Billing

- billing UI uses backend checkout and portal endpoints rather than embedding Stripe logic directly in the client

### Account Management

- account page supports profile updates and avatar upload/remove

## Running Locally

If you want to run only the frontend:

```bash
cd frontend
npm install
cp ../.env.example .env.local
npm run dev
```

Expected frontend variable:

- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

Useful commands:

```bash
npm run lint
npm run build
npm run start
```

## Available Scripts

- `npm run dev` start the Next.js development server
- `npm run lint` run frontend linting
- `npm run build` build the production bundle
- `npm run start` run the built production app

## Deployment Notes

- I would deploy this frontend to Vercel from the `frontend/` directory
- in production, the frontend should point to a reachable deployed backend API URL
- the main frontend production env is `NEXT_PUBLIC_API_URL`
- I would pair authentication with a production-ready session strategy as the deployment model evolves
- uploaded avatars are rendered from backend-served file URLs, so production hosting should pair the frontend with proper asset hosting on the backend side
