# Rup Research System – Project Context

This project is a full-stack system for managing research projects and research budgets.
It is developed by a team of 3 developers.

---

## Current Status

We are starting the actual project from scratch.

**What already exists:**
- A SQL Server database that already exists and must be used as-is
- A system specification document
- A Base44 prototype used only as a visual and UX reference

**What does NOT exist yet:**
- No backend API
- No production frontend
- No complete authentication flow
- No final project structure

---

## Critical Database Rule

The existing SQL Server database is the source of truth.

**Do NOT create a new database.**
**Do NOT rename tables or columns.**
Match the existing SQL schema exactly.
Build backend models according to the real table names and columns.

### Connection Details

| Property         | Value                    |
|------------------|--------------------------|
| Server           | `media.ruppin.ac.il`     |
| Instance         | `PROJDB`                 |
| Database         | `bgroup11_test2`         |
| Authentication   | SQL Server Authentication |
| User             | `bgroup11`               |
| Password         | `bgroup11_79466`         |
| Encryption       | Yes                      |

> Connection string format:
> `Server=media.ruppin.ac.il\PROJDB;Database=bgroup11_test2;User Id=bgroup11;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;`

---

## Database Tables

All system tables use the prefix `research_`:

- `research_users`
- `research_roles`
- `research_projects`
- `research_centers`
- `research_payment_requests`
- `research_budget_categories`
- `research_budget_plans`
- `research_future_commitments`
- `research_assistants`
- `research_hour_reports`
- `research_monthly_work_approvals`
- `research_providers`
- `research_files`
- `research_users_projects`
- `research_belongs_to_centers`
- `research_center_budgets`
- `research_categories`
- `research_alerts`

Use these table names exactly. Do not invent or rename any table or column.

---

## System Goal

The system manages research projects and their budgets.

**Main capabilities:**
- Research project management
- Budget tracking per research
- Payment requests
- Provider management
- Research assistants management
- Hour reporting
- Approval workflow
- File and document management
- Future commitments management
- Budget forecasting

### Core Smart Feature – Budget Forecast

A core feature of the system is the smart budget forecast.
The system should calculate real available budget based on:
- Approved research budget
- Actual expenses
- Future commitments
- Assistant salaries
- Social benefits

---

## User Roles

- Researcher
- Center Manager
- Research Authority Manager / Admin
- Research Assistant

Permissions should be role-based.

---

## Main Screens

- Login
- Register
- Dashboard (all research projects)
- Research details page
- Payment requests page
- Approvals page
- Budget planning / commitments page
- Files management page

---

## Tech Stack

### Backend
- ASP.NET Core Web API
- .NET 8
- Entity Framework Core
- JWT Authentication
- BCrypt for password hashing

### Frontend
- React with Vite
- React Router
- Context API for authentication
- Axios for API calls

---

## Backend Structure

```
Backend/
├── Controllers/
├── Models/
├── DTOs/
├── Services/
├── Data/
└── Program.cs
```

**Rules:**
- Controllers handle HTTP only — no business logic
- Business logic lives in Services
- DTOs used for all requests and responses
- EF Core used for all database access

---

## Frontend Structure

```
frontend/
└── src/
    ├── components/
    ├── pages/
    ├── context/
    ├── services/
    ├── api/
    ├── hooks/
    └── utils/
```

**Rules:**
- `pages/` = full screens
- `components/` = reusable UI parts
- `api/` = all backend communication
- `context/` = auth state and shared app state
- No API logic directly inside UI components

---

## Development Order

1. Create backend project structure
2. Connect backend to SQL Server (`bgroup11_test2`)
3. Create EF Core models from the real `research_` tables
4. Build authentication: Register, Login, JWT, BCrypt
5. Test with Swagger
6. Build frontend login/register pages
7. Connect frontend to backend
8. Add protected routes
9. Build dashboard
10. Build research page
11. Continue: payment requests, approvals, assistants, files

---

## Coding Style

- Always explain before writing code
- Work incrementally — one step at a time
- Keep naming consistent across backend and frontend
- Match SQL schema exactly — no invented names
- Provide copy-paste ready code
- Always specify exactly which file each code block belongs to
- Prefer simple and clear solutions over clever abstractions
- Small files, readable code, easy to split between team members

---

## Team Collaboration Notes

3 developers working in parallel.
Structure should minimize merge conflicts.
Split work by feature/module when possible.

---

## Final Goal

A real, maintainable, scalable system that matches the specification,
can be developed collaboratively, and is ready for production use.

If something is unclear — ask before coding.
If there is a better approach — suggest it.
If there is a problem with the plan — stop and explain.