# Product Requirements Document (PRD) — HR Nexus (Hackathon Demo MVP)
**Version:** 1.0  
**Date:** 2026-05-30  
**Owner:** Team HR Nexus  
**Track:** Productivity Enhancement  

---

## 1) Summary
**HR Nexus** is a chat-based HR workflow assistant that turns simple text commands into HR actions. For the hackathon, we will deliver a **working MVP demo** focusing on:

1) **Leave workflow** (request → approve/reject → status)  
2) **Payroll demo via Excel** (upload payroll spreadsheet → validate/preview → generate bank batch file → send/simulate employee notification emails → export results spreadsheet)

This MVP prioritizes: **fast, reliable demo behavior** (structured commands + confirmation) over broad HRMS coverage.

---

## 2) Problem Statement
HR teams and employees waste time on repetitive HR tasks due to:
- Manual, slow workflows (leave approvals, simple HR requests)
- Communication gaps (back-and-forth, inconsistent answers)
- Data entry errors
- Fragmented tools

**Opportunity:** Provide a single chat interface to initiate HR workflows and automate the “busy work” behind them.

---

## 3) Goals & Non-Goals
### Goals (for the MVP)
- Enable a user to request leave through chat and track approval status end-to-end.
- Enable payroll processing as a demo flow driven by chat:
  - Chat prompts for an Excel file
  - System validates rows and shows a summary preview
  - On confirm, system generates:
    - **Bank upload batch** file (CSV) (demo-safe substitute for real bank API)
    - **Payroll result Excel** file with statuses per employee
    - Email notifications sent via provider if configured, otherwise simulated
- Demonstrate automation readiness: clear “API-first, automation adapter” boundaries (even if bank integration is stubbed).

### Non-Goals (explicitly out of scope for the MVP)
- Full HRMS (recruiting, onboarding, performance management, analytics dashboards)
- Real banking transfer API integration (security/compliance; varies by bank)
- Full authentication/SSO and enterprise security hardening (use a simple demo identity)
- Full policy engine (complex leave rules, accrual, carry-over)

---

## 4) Target Users & Personas
### Persona A — Employee
- Wants fast self-service for HR tasks (leave request, status updates)
- Prefers a simple chat interface instead of forms

### Persona B — Manager
- Needs quick approve/reject actions
- Wants clear context and minimal steps

### Persona C — HR Admin (Demo)
- Wants visibility into requests and payroll execution artifacts (files + statuses)

---

## 5) Key Use Cases (MVP)
### UC1: Request leave via chat
Employee submits leave details; system creates a leave request in `PENDING`.

### UC2: Approve/reject leave (admin page)
Manager (simulated) approves/rejects; employee can query status via chat.

### UC3: Payroll run via Excel (chat-driven)
User initiates payroll in chat; system asks for Excel; user uploads; system validates and previews; user confirms; system generates bank batch + result Excel and triggers/simulates emails.

---

## 6) User Experience (UX)
### 6.1 Chat page (`/`)
- Message list + input box
- Chat supports these intents:
  - **Leave request**
  - **Leave balance**
  - **Leave status**
  - **Payroll run**
- For sensitive/irreversible steps, bot requires explicit confirmation.

### 6.2 Admin page (`/admin`)
- Table of leave requests
- Approve / Reject buttons
- (Optional) Payroll runs list with download links to artifacts

---

## 7) Functional Requirements
### 7.1 Chat Intent: Leave Request
**Trigger examples:**
- “Request leave 2026-06-10 to 2026-06-12 annual reason family”
- “Apply leave tomorrow to next Monday sick reason fever”

**Bot behavior:**
1) Parse message → extract `start_date`, `end_date`, `type`, `reason`
2) Reply with a confirmation summary:
   - “I’m going to submit annual leave from X to Y. Confirm?”
3) On confirm:
   - Create `leave_request` with `status=PENDING`
   - Return request id + status card

**Data captured:**
- employee_id, start_date, end_date, type, reason, status, created_at

---

### 7.2 Chat Intent: Leave Balance
**Trigger examples:**
- “What’s my leave balance?”
- “Show annual leave remaining”

**Bot behavior (MVP):**
- Return a simple balance view:
  - Hardcoded policy (e.g., annual=10, sick=7) minus approved days

---

### 7.3 Chat Intent: Leave Status
**Trigger examples:**
- “Status of my leave request 12”
- “Is my leave approved?”

**Bot behavior:**
- Fetch latest leave request(s) for employee
- Return status + dates + decision info (if any)

---

### 7.4 Admin: Approve/Reject Leave
**Admin actions:**
- Approve leave request
- Reject leave request (optional: add reason)

**System behavior:**
- Update `leave_requests.status` to `APPROVED` or `REJECTED`
- Log action in `audit_logs` (optional, recommended if time)

---

### 7.5 Chat Intent: Payroll Run (Excel-driven)
**Trigger examples:**
- “Run payroll”
- “Do payroll for May”
- “Send salaries”

**Bot behavior:**
1) Respond with instructions + show file uploader:
   - “Please upload payroll.xlsx. Required columns: EmployeeName, Email, BankAccount, Amount.”
2) On upload:
   - Parse Excel and validate rows
   - Show preview summary:
     - row count, total amount, invalid rows (if any)
   - Ask: “Confirm to generate bank batch + send emails?”
3) On confirm:
   - Create `payroll_run` + `payroll_items`
   - Generate artifacts:
     - `bank_batch.csv` (demo-safe “bank upload file”)
     - `payroll_result.xlsx` (original + Status/Message/ProcessedAt)
   - Send or simulate emails:
     - If email provider configured: send real emails
     - Else: mark as `SENT_SIMULATED`
4) Return download links or references in chat response.

---

## 8) Payroll Excel Specification
### 8.1 Input file
**Filename:** `payroll.xlsx`  
**Sheet:** first worksheet  
**Required header columns (row 1):**
- `EmployeeName`
- `Email`
- `BankAccount`
- `Amount`

**Optional:**
- `BankCode`
- `Note`

### 8.2 Validation rules (MVP)
- Amount: must be numeric and > 0
- Email: must contain `@` and a dot (basic validation)
- BankAccount: non-empty string
- EmployeeName: non-empty string

### 8.3 Output artifacts
1) **Bank batch file**: `bank_batch.csv`
   - Columns: `EmployeeName,BankAccount,Amount,Note`
   - Purpose: upload to a bank portal (demo-friendly substitute for bank API)

2) **Payroll result**: `payroll_result.xlsx`
   - Original columns plus:
     - `Status` (QUEUED / SENT / FAILED / SENT_SIMULATED)
     - `Message`
     - `ProcessedAt`

---

## 9) System / Technical Requirements (MVP)
### 9.1 Suggested Architecture (demo-ready)
- **Frontend:** Next.js pages `/` and `/admin`
- **Backend:** Next.js route handlers (`/api/...`)
- **DB:** Postgres (Supabase suggested) or local DB for demo
- **File storage:** Supabase Storage or local disk for demo
- **Email:** optional provider integration; else simulate

### 9.2 Core endpoints (indicative)
- `POST /api/chat` — parse intent + perform action
- `GET /api/leave-requests` — list leave requests (admin)
- `POST /api/leave-requests/{id}/decision` — approve/reject leave request
- `POST /api/payroll/upload` — upload + parse + preview
- `POST /api/payroll/confirm` — generate artifacts + send/simulate emails
- `GET /api/payroll/runs/{id}/artifact/{type}` — download artifacts

### 9.3 Data model (minimum tables)
**Leave**
- `employees(id, name, role, manager_id)`
- `leave_requests(id, employee_id, start_date, end_date, type, reason, status, created_at, decided_at, decided_by, decision_reason)`

**Payroll**
- `payroll_runs(id, created_at, status, total_amount, input_filename, input_storage_path)`
- `payroll_items(id, run_id, employee_name, email, bank_account, amount, status, message, processed_at)`

**Optional**
- `audit_logs(id, action, payload_json, created_at)`

---

## 10) Non-Functional Requirements (demo-pragmatic)
- **Reliability:** predictable parsing (keyword/regex) and explicit confirmation steps
- **Security (demo minimum):**
  - Do not expose bank account numbers in UI beyond last 4 digits
  - Do not store secrets in code; use environment variables
- **Performance:** handle ~200 payroll rows quickly (<5s parse/generate on typical laptop)

---

## 11) Success Metrics (Hackathon)
- Demo can be completed end-to-end in < 3 minutes:
  1) Create leave request in chat
  2) Approve in admin
  3) Confirm status back in chat
  4) Initiate payroll → upload Excel → generate downloads → show “emails sent/simulated”
- 0 crashes during demo; errors shown as readable messages
- Clear artifacts produced: bank batch + payroll results spreadsheet

---

## 12) Demo “Wow Moments” (Impressive by design)
- Chat replies render **rich cards** for leave requests and payroll previews (not plain text).
- Payroll preview highlights invalid rows with **actionable fix messages** before confirmation.
- Payroll confirmation shows a short **progress timeline** (Queued → Validated → Generated Artifacts → Notified).
- Admin approvals reflect instantly in chat via refetch (no manual refresh required for the demo flow).

