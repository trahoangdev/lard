# Technical Architecture — HR Nexus Demo MVP
**Version:** 1.0  
**Date:** 2026-05-30  

---

## 1) Goals
- Ship a demo that runs locally with minimal setup and predictable behavior.
- Keep the architecture “API-first” so providers (Supabase, email) can be swapped later.
- Optimize for a compelling walkthrough: rich UI feedback + downloadable artifacts.

---

## 2) Stack (Demo-First Defaults)
- **Framework:** Next.js (App Router) + TypeScript
- **UI:** Tailwind CSS + component primitives (kept lightweight)
- **DB:** SQLite via Prisma (zero external dependencies for demo)
- **File storage:** local disk (`/storage`) with signed-ish download tokens (demo-safe)
- **Email:** simulated by default; optional provider behind `EMAIL_PROVIDER` env
- **Excel:** `exceljs` for read/write

Rationale: avoids requiring Supabase keys and cloud configuration during a demo while keeping a clean separation to migrate later.

---

## 3) High-Level Architecture
### 3.1 Request flow
1) UI sends user chat message to `POST /api/chat`.
2) Server parses intent with deterministic rules and returns a typed response:
   - `text`
   - optional `cards[]` (leave request card, payroll preview card, payroll run card)
   - optional `actions[]` (confirm/cancel buttons, file upload prompt)
3) UI renders cards/actions; confirmations call follow-up endpoints.

### 3.2 “Impressive demo” patterns
- Use **structured bot messages**: cards with totals, statuses, and next steps.
- Maintain a **run timeline** for payroll to show progress (even if fast).
- Always show **row-level validation** for payroll before confirmation.

---

## 4) Data Model (Prisma)
### 4.1 Entities
- `Employee`
  - `id` (string)
  - `name` (string)
  - `role` (`EMPLOYEE` | `MANAGER` | `HR_ADMIN`)
- `LeaveRequest`
  - `id` (int)
  - `employeeId` (string)
  - `startDate` (date)
  - `endDate` (date)
  - `type` (`ANNUAL` | `SICK` | `UNPAID`)
  - `reason` (string)
  - `status` (`PENDING` | `APPROVED` | `REJECTED`)
  - `createdAt` (datetime)
  - `decidedAt` (datetime, nullable)
  - `decidedBy` (string, nullable)
  - `decisionReason` (string, nullable)
- `PayrollRun`
  - `id` (int)
  - `createdAt` (datetime)
  - `status` (`DRAFT` | `CONFIRMED` | `DONE`)
  - `totalAmount` (decimal)
  - `inputFilename` (string)
  - `inputStoragePath` (string)
  - `bankBatchStoragePath` (string, nullable)
  - `resultXlsxStoragePath` (string, nullable)
- `PayrollItem`
  - `id` (int)
  - `runId` (int)
  - `employeeName` (string)
  - `email` (string)
  - `bankAccount` (string)
  - `amount` (decimal)
  - `status` (`QUEUED` | `SENT` | `FAILED` | `SENT_SIMULATED`)
  - `message` (string, nullable)
  - `processedAt` (datetime, nullable)
- `AuditLog` (optional)
  - `id` (int)
  - `action` (string)
  - `payloadJson` (string)
  - `createdAt` (datetime)

### 4.2 Seed data
- Pre-seed 2 employees (Employee + Manager) and 1 HR Admin to make demo clicks instant.

---

## 5) API Design
### 5.1 Chat
`POST /api/chat`
- Input:
  - `message` (string)
  - `actorEmployeeId` (string)
  - `context` (object, optional) (e.g. pending confirmation id)
- Output:
  - `messages[]` with typed payloads:
    - `kind: "text" | "card" | "actions"`
    - payload varies by kind

### 5.2 Leave
- `GET /api/leave-requests`
  - returns all leave requests for admin page
- `POST /api/leave-requests/{id}/decision`
  - body: `{ decision: "APPROVE" | "REJECT", reason?: string }`

### 5.3 Payroll
- `POST /api/payroll/upload`
  - multipart form-data: `file`
  - returns a `runId` + preview summary + invalid row details
- `POST /api/payroll/confirm`
  - body: `{ runId: number }`
  - generates:
    - `bank_batch.csv`
    - `payroll_result.xlsx`
  - returns artifact download links + counts
- `GET /api/payroll/runs`
  - list runs for optional admin UX
- `GET /api/payroll/runs/{id}/artifact/{type}`
  - `type`: `bank_batch` | `payroll_result`

---

## 6) Parsing & Validation
### 6.1 Chat intent parsing (deterministic)
- “Request leave …” → leave request flow
- “Leave balance …” → compute balance
- “Leave status …” → fetch recent or specific id
- “Run payroll …” → start payroll flow

### 6.2 Payroll Excel validation
Required headers:
- `EmployeeName`
- `Email`
- `BankAccount`
- `Amount`

Rules:
- Amount numeric > 0
- Email contains `@` and `.`
- Non-empty name + bank account

Output:
- `invalidRows[]` with `{ rowNumber, issues[] }`
- `preview` with totals and masked bank accounts (last 4 digits only)

---

## 7) File Storage
- Store all uploads and generated artifacts under `/storage/{yyyy-mm-dd}/{runId}/...`
- Return download URLs that map to `GET /api/payroll/runs/{id}/artifact/{type}`
- Never show raw absolute disk paths in the UI

---

## 8) Email Strategy
Default: simulate sending and mark items as `SENT_SIMULATED`.
Optional: if a provider is configured, send real emails but still record status + message per item.

---

## 9) Frontend UX Outline
### 9.1 Chat page (`/`)
- Chat transcript with rich bot cards
- A sticky composer with:
  - message input
  - “demo identity” selector (Employee/Manager/Admin) to show different perspectives quickly
- Inline confirmation buttons for irreversible actions
- Payroll upload UI appears only when the bot requests it

### 9.2 Admin page (`/admin`)
- Leave requests table with approve/reject
- Optional payroll runs panel with download links

---

## 10) Demo Walkthrough Script (Operational)
1) Employee: request leave → confirm → see leave card (`PENDING`)
2) Admin: approve → immediate state update
3) Employee: ask leave status → sees `APPROVED`
4) Employee: run payroll → upload → preview invalid/valid breakdown → confirm
5) Download bank batch + payroll result → show simulated email statuses

