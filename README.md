# Multi-Tenant Client Request & Approval Workflow Engine

A secure, multi-tenant web application for managing software-related client requests through a controlled approval and development workflow.

**Organization:** Neirah Tech Solution
**Project Type:** Full-Stack Software Engineering Internship
**Candidate:** Jeyakumar Renujan

---

## 1. Project Overview

The Multi-Tenant Client Request & Approval Workflow Engine centralizes software-related requests submitted by multiple client organizations.

Each organization operates within its own secure tenant boundary. Authorized users can create, review, approve, assign, track, and complete requests according to their roles and permissions.

### Objectives

- Centralize client software requests.
- Support multiple organizations within one application.
- Provide secure authentication and role-based authorization.
- Manage requests through a controlled approval lifecycle.
- Maintain an auditable activity history.
- Prevent unauthorized cross-organization access.
- Provide dashboards with request statistics and overdue counts.

## 2. Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- React Hook Form
- Zod
- Lucide React

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT
- bcryptjs
- Zod
- Swagger UI

### Development and Testing
- Git and GitHub
- ESLint
- TypeScript
- Node.js test runner
- Supertest

## 3. User Roles and Permissions

The application uses role-based access control.

| Role | Main responsibilities |
|---|---|
| PLATFORM_ADMIN | Provisions organizations and their initial administrators. |
| ORGANIZATION_ADMIN | Manages users and clients within the organization. |
| MANAGER | Reviews requests, makes approval decisions, and assigns developers. |
| DEVELOPER | Views assigned requests and updates permitted work statuses. |
| CLIENT_USER | Creates and tracks requests belonging to their client account. |

Permissions are enforced by the backend. The frontend does not determine or grant authorization.

## 4. Request Workflow

The request lifecycle is:

`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED → IN_PROGRESS → COMPLETED`

Important workflow rules:

- Requests are submitted before entering the review process.
- Authorized managers perform approval and rejection actions.
- Rejection requires a reason.
- Developers cannot approve or reject requests.
- Developers update the work status of requests assigned to them.
- Rejected requests are terminal.
- Status changes use optimistic version checks to prevent conflicting updates.

## 5. Multi-Tenant Architecture and Security

The system separates organization data using tenant-scoped authorization.

Security measures include:

- Authentication using JWT access and refresh tokens.
- Short-lived access tokens and refresh-token handling.
- Password hashing using bcryptjs.
- Protected API routes.
- Role-based authorization.
- Organization-scoped database queries.
- Client users restricted to their own client requests.
- Validation of request bodies and query parameters.
- Optimistic concurrency checks for conflicting updates.
- Security headers using Helmet.
- Configured CORS with credentials.
- Soft deletion for eligible draft requests.
- Read-only activity history for ordinary users.

Organization IDs, client IDs, and roles supplied by the frontend are not trusted as authorization sources. The backend derives the user's access scope from the authenticated identity.

## 6. Database Design

The application uses PostgreSQL with Prisma ORM.

The main database entities include:

- `organizations` — tenant organizations.
- `users` — authenticated users and their roles.
- `clients` — clients belonging to organizations.
- `requests` — software-related requests and their workflow state.
- `activity_history` — auditable request events.
- `refresh_tokens` — refresh-token records.

The Prisma schema and migration files are located in:

`backend/prisma/`

## 7. Project Structure

```text
multi-tenant-client-request-workflow-engine/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── docs/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── requests/
│   │   │   └── users/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── docs/
├── .gitignore
└── README.md
```

## 8. Prerequisites

Install the following before running the application:

- Node.js and npm.
- PostgreSQL.
- Git.

## 9. Installation and Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/JeyakumarRenujan/multi-tenant-client-request-workflow-engine.git

cd multi-tenant-client-request-workflow-engine
```

### Step 2: Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file by copying `.env.example`.

Configure the following variables:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/workflow_engine?schema=public"
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Replace the database credentials and JWT secrets with your own values. Never commit the `.env` file.

### Step 3: Create the database

Create a PostgreSQL database named:

`workflow_engine`

Ensure that the `DATABASE_URL` in the backend `.env` file points to this database.

### Step 4: Run database migrations

From the `backend` directory:

```bash
npx prisma migrate deploy
```

For local schema development, use:

```bash
npx prisma migrate dev
```

### Step 5: Seed development data

```bash
npm run db:seed
```

The seed script creates two demo organizations and their client records, together with sample users.

New demo account passwords are generated randomly and printed only when accounts are created. Save those credentials securely. Running the seed script again does not reset existing account passwords.

The seed data is intended for development and demonstration, not production use.

### Step 6: Start the backend

```bash
npm run dev
```

The backend runs at:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/v1/health`

### Step 7: Configure and start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a frontend `.env` file containing:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open:

`http://localhost:5173`

## 10. API Documentation

Interactive Swagger documentation:

`http://localhost:5000/api/docs`

OpenAPI JSON specification:

`http://localhost:5000/api/docs.json`

The API uses the `/api/v1` prefix.

Main API modules include:

| Module | Base path |
|---|---|
| Authentication | `/api/v1/auth` |
| Requests | `/api/v1/requests` |
| Dashboard | `/api/v1/dashboard` |
| Users | `/api/v1/users` |

## 11. Dashboard and Overdue Requests

The dashboard provides tenant-scoped request statistics, including:

- Total requests.
- Request counts grouped by status.
- Request counts grouped by priority.
- Overdue request count.

Overdue requests are calculated dynamically by comparing due dates with the current time. Completed and rejected requests are excluded.

This avoids relying on a scheduled job to keep an overdue status field synchronized.

## 12. Activity History

The application records request-related events, including:

- Request creation.
- Request updates.
- Developer assignment and unassignment.
- Workflow status changes.

Activity records include the event, actor, previous and new status where applicable, and timestamp.

The history is retrieved through an authenticated, tenant-scoped, read-only API.

## 13. Testing and Quality Checks

### Backend

From the `backend` directory:

```bash
npm run typecheck
npm test
npm run build
```

### Frontend

From the `frontend` directory:

```bash
npm run lint
npm run build
```

The automated backend test suite covers authentication, request validation, request access, workflow transitions, deletion, dashboard behavior, API documentation, user management, and activity history.

## 14. Important Demonstration Scenarios

The following scenarios are important when demonstrating the system:

1. A Client User from Organization A creates a request.
2. The Manager of Organization A reviews and approves it.
3. The Manager assigns a Developer.
4. The assigned Developer progresses the request towards completion.
5. The request activity timeline displays the recorded events.
6. A user from Organization B attempts to access Organization A's request and is denied.
7. A Developer attempts an unauthorized approval action and is denied.
8. Two updates using the same request version are attempted; only one valid update succeeds.
9. An overdue request appears in the appropriate tenant dashboard.

## 15. Design Decisions

- Organization creation and initial administrator provisioning are controlled by the platform administrator.
- Organization administrators manage users and clients within their own organization.
- Request deletion is implemented as soft deletion for eligible drafts.
- Rejection reasons are stored on the request.
- Approval decisions and other request events are recorded in activity history.
- The current workflow state is stored directly on the request.
- Optimistic version checks help prevent conflicting workflow updates.
- Overdue status is computed dynamically.

## 16. Environment and Security Notes

- Never commit `.env` files, passwords, access tokens, refresh tokens, or production data.
- Use strong, unique JWT secrets.
- Use development seed accounts only for local testing and demonstrations.
- Do not publish generated demo credentials in screenshots, documentation, or public repositories.
- Configure production database, frontend origin, and secrets separately before deployment.

## 17. License

This project was developed as part of a Software Engineering Internship assignment at Neirah Tech Solution.
