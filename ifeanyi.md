# FirstRegistrars BuildWise

## Overview

**BuildWise** is a full-stack enterprise project management system for First Registrars and Investor Services. It combines Jira-like project tracking, vendor management pipelines, and AI-powered business intelligence in one platform.

## Authentication

- Login page at `/login` with First Registrars branding (split-panel layout)
- Signup page at `/signup` with department/role selection
- Auth state stored in `localStorage` under key `buildwise_user` (no backend sessions)
- All protected routes redirect to `/login` if unauthenticated via `useAuth()` context
- API endpoints: `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`
- Passwords stored in MongoDB using a salted `scrypt` hash
- Demo credentials: any seeded user email (e.g. `c.obi@firstregistrars.com`) + `password123`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Frontend/buildwise) — serves at `/`
- **API framework**: Express 5 (Backend/api-server) — serves at `/api`
- **Database**: MongoDB
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: Google Gemini (`gemini-2.5-flash-lite`) — business analysis, profitability predictions, V2 advice
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Structure

```text
Firstregistrars-BuildWise/
├── Frontend/
│   ├── buildwise/                # React+Vite frontend (root path /)
│   └── lib/
│       ├── api-client-react/     # Generated React Query hooks
│       └── integrations-openai-ai-react/
├── Backend/
│   ├── api-server/               # Express API server
│   ├── lib/
│   │   ├── api-spec/             # OpenAPI spec + Orval codegen config
│   │   ├── api-zod/              # Generated Zod schemas from OpenAPI
│   │   ├── db/                   # MongoDB connection + shared data access helpers
│   │   ├── integrations-openai-ai-server/
│   │   └── integrations/
│   └── scripts/                  # Utility scripts
├── artifacts/
│   └── mockup-sandbox/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

### Project Management (Jira-like)
- **All Projects**: Grid view of internal and vendor projects with status, priority, country, budget, completion rate
- **Board View**: Kanban board with columns: Backlog → To Do → In Progress → In Review → Done
- **Backlog**: Task prioritization and sprint assignment
- **Sprints**: Sprint planning and management
- **Task Detail**: Comments, assignee, story points, due dates, labels

### Vendor Management
- **Vendor Directory**: All registered vendors with status (active/pending/blacklisted), specialization, country, contact info
- **Vendor Pipeline**: Kanban pipeline tracking vendor project stages:
  - Submitted → Under Review → Negotiation → Approved → Rejected → Handover In Progress → Handover Complete

### Team Management
- User directory with roles: admin, manager, developer, viewer
- Department tracking

### AI Advisor (Gemini 2.5 Flash-Lite)
Three types of AI analysis:
1. **Project Analysis**: Completion rate analysis, profitability score (0-100), recommendation (continue/pause/stop/expand/review), insights, risks
2. **Business Advice**: Country-specific viability analysis, regulatory environment, market conditions, ROI potential
3. **Version Advice**: When to release V2, what features to include, improvement roadmap

## Database Schema

- `users` — team members with roles and departments
- `vendors` — external vendors with status and contact info
- `projects` — internal and vendor projects with budget, dates, completion rate
- `sprints` — sprint planning within projects
- `tasks` — Jira-like tasks with status, priority, type, assignee
- `comments` — task comments
- `vendor_projects` — vendor project submissions and their pipeline stage

## API Endpoints

All under `/api`:
- CRUD: `/users`, `/projects`, `/tasks`, `/sprints`, `/vendors`, `/vendor-projects`
- Dashboard: `GET /dashboard/stats`
- AI: `POST /ai/analyze-project`, `POST /ai/business-advice`, `POST /ai/version-advice`

## Running Codegen

After OpenAPI spec changes:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## Database Migrations

MongoDB connection settings:
```bash
MONGODB_URI=mongodb://127.0.0.1:27017/buildwise
MONGODB_DB=buildwise
```
