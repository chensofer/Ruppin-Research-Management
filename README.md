
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

 

| Property         | Value                    |

|------------------|--------------------------|

| Server           | `media.ruppin.ac.il`     |

| Instance         | `PROJDB`                 |

| Database         | `bgroup11_test2`         |

| Authentication   | SQL Server Authentication |

| User             | `bgroup11`               |

| Password         | `bgroup11_79466`         |

| Encryption       | Yes                      |

 

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

 

---

 

## Full Database Schema Script

 

The following SQL script is the source-of-truth schema for the database and should be used as-is.

Do not rename tables, columns, or foreign keys.

 

```sql

USE [bgroup11_test2]

GO

/****** Object:  Table [dbo].[research_alerts]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_alerts](

    [alert_id] [int] NOT NULL,

    [alert_content] [nvarchar](510) NULL,

    [description] [nvarchar](510) NULL,

PRIMARY KEY CLUSTERED

(

    [alert_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_assistants]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_assistants](

    [assistant_user_id] [char](10) NOT NULL,

    [project_id] [int] NOT NULL,

    [role] [nvarchar](50) NULL,

    [salary_per_hour] [decimal](10, 2) NULL,

    [social_benefits_percent] [decimal](5, 2) NULL,

    [employment_status] [nvarchar](50) NULL,

 CONSTRAINT [PK_research_assistants] PRIMARY KEY CLUSTERED

(

    [assistant_user_id] ASC,

    [project_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_budget_categories]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_budget_categories](

    [research_budget_category_id] [int] NOT NULL,

    [project_id] [int] NULL,

    [category_name] [nvarchar](50) NULL,

    [allocated_amount] [decimal](12, 2) NULL,

    [notes] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [research_budget_category_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_budget_plans]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_budget_plans](

    [budget_plan_id] [int] NOT NULL,

    [project_id] [int] NULL,

    [category_name] [nvarchar](50) NULL,

    [plan_description] [nvarchar](500) NULL,

    [planned_amount] [decimal](12, 2) NULL,

    [planned_date] [date] NULL,

    [notes] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [budget_plan_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_categories]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_categories](

    [category_name] [nvarchar](50) NOT NULL,

    [category_description] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [category_name] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_center_budgets]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_center_budgets](

    [center_budget_id] [int] NOT NULL,

    [center_id] [smallint] NULL,

    [budget_year] [int] NULL,

    [total_budget] [decimal](12, 2) NULL,

    [notes] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [center_budget_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_centers]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_centers](

    [center_id] [smallint] NOT NULL,

    [center_name] [nvarchar](255) NULL,

    [opening_date] [date] NULL,

    [closing_date] [date] NULL,

    [center_description] [nvarchar](500) NULL,

    [manager_id1] [char](10) NULL,

    [manager_id2] [char](10) NULL,

PRIMARY KEY CLUSTERED

(

    [center_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_files]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_files](

    [file_id] [int] NOT NULL,

    [file_name] [nvarchar](255) NULL,

    [uploaded_by_user_id] [char](10) NULL,

    [path] [nvarchar](500) NULL,

    [file_type] [nvarchar](50) NULL,

    [created_date] [datetime] NULL,

    [project_id] [int] NULL,

    [folder_name] [nvarchar](100) NULL,

PRIMARY KEY CLUSTERED

(

    [file_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_future_commitments]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_future_commitments](

    [commitment_id] [int] NOT NULL,

    [project_id] [int] NULL,

    [category_name] [nvarchar](50) NULL,

    [commitment_description] [nvarchar](500) NULL,

    [expected_date] [date] NULL,

    [expected_amount] [decimal](12, 2) NULL,

    [status] [nvarchar](50) NULL,

    [notes] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [commitment_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_hour_reports]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_hour_reports](

    [hour_report_id] [int] NOT NULL,

    [user_id] [char](10) NULL,

    [project_id] [int] NULL,

    [report_date] [date] NULL,

    [from_hour] [time](7) NULL,

    [to_hour] [time](7) NULL,

    [worked_hours] [decimal](5, 2) NULL,

    [comments] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [hour_report_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_monthly_work_approvals]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_monthly_work_approvals](

    [monthly_approval_id] [int] NOT NULL,

    [user_id] [char](10) NULL,

    [project_id] [int] NULL,

    [month] [int] NULL,

    [year] [int] NULL,

    [approval_status] [nvarchar](50) NULL,

    [approved_by_user_id] [char](10) NULL,

    [approval_date] [date] NULL,

    [total_worked_hours] [decimal](6, 2) NULL,

    [comments] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [monthly_approval_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_payment_requests]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_payment_requests](

    [payment_request_id] [int] NOT NULL,

    [project_id] [int] NULL,

    [requested_by_user_id] [char](10) NULL,

    [provider_id] [int] NULL,

    [category_name] [nvarchar](50) NULL,

    [request_title] [nvarchar](255) NULL,

    [request_description] [nvarchar](1000) NULL,

    [requested_amount] [decimal](12, 2) NULL,

    [request_date] [date] NULL,

    [due_date] [date] NULL,

    [status] [nvarchar](50) NULL,

    [approved_by_user_id] [char](10) NULL,

    [decision_date] [date] NULL,

    [rejection_reason] [nvarchar](500) NULL,

    [quotation_file_path] [nvarchar](500) NULL,

    [comments] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [payment_request_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_projects]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_projects](

    [project_id] [int] NOT NULL,

    [project_name_he] [nvarchar](255) NULL,

    [project_name_en] [nvarchar](255) NULL,

    [project_description] [nvarchar](1000) NULL,

    [total_budget] [decimal](12, 2) NULL,

    [center_id] [smallint] NULL,

    [principal_researcher_id] [char](10) NULL,

    [created_date] [date] NULL,

    [start_date] [date] NULL,

    [end_date] [date] NULL,

    [status] [nvarchar](50) NULL,

    [research_expenses] [decimal](12, 2) NULL,

    [funding_source] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [project_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_providers]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_providers](

    [provider_id] [int] NOT NULL,

    [provider_name] [nvarchar](255) NULL,

    [phone] [nvarchar](20) NULL,

    [email] [nvarchar](255) NULL,

    [notes] [nvarchar](255) NULL,

PRIMARY KEY CLUSTERED

(

    [provider_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_roles]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_roles](

    [role_name] [nvarchar](50) NOT NULL,

    [type] [tinyint] NULL,

PRIMARY KEY CLUSTERED

(

    [role_name] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_users]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_users](

    [user_id] [char](10) NOT NULL,

    [employee_no] [int] NULL,

    [first_name] [nvarchar](50) NULL,

    [last_name] [nvarchar](50) NULL,

    [email] [nvarchar](255) NULL,

    [system_authorization] [nvarchar](50) NULL,

    [password] [nvarchar](255) NOT NULL,

PRIMARY KEY CLUSTERED

(

    [user_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

/****** Object:  Table [dbo].[research_users_projects]    Script Date: 02/04/2026 17:04:21 ******/

SET ANSI_NULLS ON

GO

SET QUOTED_IDENTIFIER ON

GO

CREATE TABLE [dbo].[research_users_projects](

    [user_id] [char](10) NOT NULL,

    [project_id] [int] NOT NULL,

    [project_role] [nvarchar](50) NULL,

 CONSTRAINT [PK_research_users_projects] PRIMARY KEY CLUSTERED

(

    [user_id] ASC,

    [project_id] ASC

)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]

GO

ALTER TABLE [dbo].[research_assistants]  WITH CHECK ADD FOREIGN KEY([assistant_user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_assistants]  WITH CHECK ADD FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_budget_categories]  WITH CHECK ADD  CONSTRAINT [FK_budget_categories_category] FOREIGN KEY([category_name])

REFERENCES [dbo].[research_categories] ([category_name])

GO

ALTER TABLE [dbo].[research_budget_categories] CHECK CONSTRAINT [FK_budget_categories_category]

GO

ALTER TABLE [dbo].[research_budget_categories]  WITH CHECK ADD  CONSTRAINT [FK_budget_categories_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_budget_categories] CHECK CONSTRAINT [FK_budget_categories_project]

GO

ALTER TABLE [dbo].[research_budget_plans]  WITH CHECK ADD  CONSTRAINT [FK_budget_plans_category] FOREIGN KEY([category_name])

REFERENCES [dbo].[research_categories] ([category_name])

GO

ALTER TABLE [dbo].[research_budget_plans] CHECK CONSTRAINT [FK_budget_plans_category]

GO

ALTER TABLE [dbo].[research_budget_plans]  WITH CHECK ADD  CONSTRAINT [FK_budget_plans_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_budget_plans] CHECK CONSTRAINT [FK_budget_plans_project]

GO

ALTER TABLE [dbo].[research_center_budgets]  WITH CHECK ADD  CONSTRAINT [FK_center_budgets_center] FOREIGN KEY([center_id])

REFERENCES [dbo].[research_centers] ([center_id])

GO

ALTER TABLE [dbo].[research_center_budgets] CHECK CONSTRAINT [FK_center_budgets_center]

GO

ALTER TABLE [dbo].[research_centers]  WITH CHECK ADD  CONSTRAINT [FK_research_centers_manager1] FOREIGN KEY([manager_id1])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_centers] CHECK CONSTRAINT [FK_research_centers_manager1]

GO

ALTER TABLE [dbo].[research_centers]  WITH CHECK ADD  CONSTRAINT [FK_research_centers_manager2] FOREIGN KEY([manager_id2])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_centers] CHECK CONSTRAINT [FK_research_centers_manager2]

GO

ALTER TABLE [dbo].[research_files]  WITH CHECK ADD  CONSTRAINT [FK_files_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_files] CHECK CONSTRAINT [FK_files_project]

GO

ALTER TABLE [dbo].[research_files]  WITH CHECK ADD  CONSTRAINT [FK_files_user] FOREIGN KEY([uploaded_by_user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_files] CHECK CONSTRAINT [FK_files_user]

GO

ALTER TABLE [dbo].[research_future_commitments]  WITH CHECK ADD  CONSTRAINT [FK_future_commitments_category] FOREIGN KEY([category_name])

REFERENCES [dbo].[research_categories] ([category_name])

GO

ALTER TABLE [dbo].[research_future_commitments] CHECK CONSTRAINT [FK_future_commitments_category]

GO

ALTER TABLE [dbo].[research_future_commitments]  WITH CHECK ADD  CONSTRAINT [FK_future_commitments_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_future_commitments] CHECK CONSTRAINT [FK_future_commitments_project]

GO

ALTER TABLE [dbo].[research_hour_reports]  WITH CHECK ADD  CONSTRAINT [FK_hour_reports_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_hour_reports] CHECK CONSTRAINT [FK_hour_reports_project]

GO

ALTER TABLE [dbo].[research_hour_reports]  WITH CHECK ADD  CONSTRAINT [FK_hour_reports_user] FOREIGN KEY([user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_hour_reports] CHECK CONSTRAINT [FK_hour_reports_user]

GO

ALTER TABLE [dbo].[research_monthly_work_approvals]  WITH CHECK ADD  CONSTRAINT [FK_monthly_approver] FOREIGN KEY([approved_by_user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_monthly_work_approvals] CHECK CONSTRAINT [FK_monthly_approver]

GO

ALTER TABLE [dbo].[research_monthly_work_approvals]  WITH CHECK ADD  CONSTRAINT [FK_monthly_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_monthly_work_approvals] CHECK CONSTRAINT [FK_monthly_project]

GO

ALTER TABLE [dbo].[research_monthly_work_approvals]  WITH CHECK ADD  CONSTRAINT [FK_monthly_user] FOREIGN KEY([user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_monthly_work_approvals] CHECK CONSTRAINT [FK_monthly_user]

GO

ALTER TABLE [dbo].[research_payment_requests]  WITH CHECK ADD  CONSTRAINT [FK_payment_approver] FOREIGN KEY([approved_by_user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_payment_requests] CHECK CONSTRAINT [FK_payment_approver]

GO

ALTER TABLE [dbo].[research_payment_requests]  WITH CHECK ADD  CONSTRAINT [FK_payment_category] FOREIGN KEY([category_name])

REFERENCES [dbo].[research_categories] ([category_name])

GO

ALTER TABLE [dbo].[research_payment_requests] CHECK CONSTRAINT [FK_payment_category]

GO

ALTER TABLE [dbo].[research_payment_requests]  WITH CHECK ADD  CONSTRAINT [FK_payment_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_payment_requests] CHECK CONSTRAINT [FK_payment_project]

GO

ALTER TABLE [dbo].[research_payment_requests]  WITH CHECK ADD  CONSTRAINT [FK_payment_provider] FOREIGN KEY([provider_id])

REFERENCES [dbo].[research_providers] ([provider_id])

GO

ALTER TABLE [dbo].[research_payment_requests] CHECK CONSTRAINT [FK_payment_provider]

GO

ALTER TABLE [dbo].[research_payment_requests]  WITH CHECK ADD  CONSTRAINT [FK_payment_user] FOREIGN KEY([requested_by_user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_payment_requests] CHECK CONSTRAINT [FK_payment_user]

GO

ALTER TABLE [dbo].[research_projects]  WITH CHECK ADD  CONSTRAINT [FK_projects_center] FOREIGN KEY([center_id])

REFERENCES [dbo].[research_centers] ([center_id])

GO

ALTER TABLE [dbo].[research_projects] CHECK CONSTRAINT [FK_projects_center]

GO

ALTER TABLE [dbo].[research_projects]  WITH CHECK ADD  CONSTRAINT [FK_projects_principal_researcher] FOREIGN KEY([principal_researcher_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_projects] CHECK CONSTRAINT [FK_projects_principal_researcher]

GO

ALTER TABLE [dbo].[research_users]  WITH CHECK ADD  CONSTRAINT [FK_users_roles] FOREIGN KEY([system_authorization])

REFERENCES [dbo].[research_roles] ([role_name])

GO

ALTER TABLE [dbo].[research_users] CHECK CONSTRAINT [FK_users_roles]

GO

ALTER TABLE [dbo].[research_users_projects]  WITH CHECK ADD  CONSTRAINT [FK_rup_up_project] FOREIGN KEY([project_id])

REFERENCES [dbo].[research_projects] ([project_id])

GO

ALTER TABLE [dbo].[research_users_projects] CHECK CONSTRAINT [FK_rup_up_project]

GO

ALTER TABLE [dbo].[research_users_projects]  WITH CHECK ADD  CONSTRAINT [FK_rup_up_user] FOREIGN KEY([user_id])

REFERENCES [dbo].[research_users] ([user_id])

GO

ALTER TABLE [dbo].[research_users_projects] CHECK CONSTRAINT [FK_rup_up_user]

GO

 

 




 

