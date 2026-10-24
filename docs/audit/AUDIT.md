# RASTA Phase-A Audit — Source Inventory, Traceability & Decisions

Audit date: 2026-10-19. Source: `RASTA_HR_System_v1_Frontend_Checkpoint.zip` (Vite + React 19 + TypeScript + Tailwind CSS 4, bun.lock, mock data layer).
Original preserved as git tag `checkpoint/frontend-v1`. Bundled requirement docs (`HANDOFF_FOR_CLAUDE.md`, `FRONTEND_DATA_CONTRACT.md`, `UI_SPEC.md`, `security_spec.md`) are treated as the product-requirements source of truth; the draft Firestore ruleset/blueprint is superseded by the mandated Supabase target.

## 1. Route / page inventory (frontend as supplied)

| # | Screen (mock page id) | Purpose & users | Data shown | Data changed | Existing status | Missing backend |
|---|---|---|---|---|---|---|
| 1 | Login (`LoginView`) | Entry for ADMIN/VIEWER | Demo role picker, username/password | none (fake login, demo credentials baked in) | Simulated; not wired | Real auth, sessions, inactive-account handling, first-admin setup |
| 2 | Dashboard (`DashboardView`) | Overview for both roles | KPI cards, category/city/status distributions, recent applicants, open vacancies | none | Works off mock store; `newThisMonth` hardcoded | Aggregate queries, real counts |
| 3 | Applicant Directory (`ApplicantDirectory`) | Search pool — both roles | Table: name, job title, city, degree, experience, priority, recruitment status, completeness | none; CSV export (client-side) | Filters/sort/pagination client-side over full mock array | Server-side search/filter/sort/pagination; authorized CSV export |
| 4 | Applicant Profile (`ApplicantProfile`) | 9 tabs: identity (admin unmask of national ID/phone/address), employment (+verification workflow), education, skills & certificates, preferences, group-priority management, attachments, candidacies, admin notes | Full profile | verification status (admin), admin notes (client-state only!) | Verification persists in mock; notes don't persist | Verification state machine + history, notes persistence, PII masking per role |
| 5 | Applicant Form (`ApplicantForm`) | 4-step create/edit — ADMIN | Identity, employment history (repeatable, group-entity flag), education, skills/preferences | create/update applicant | Fabricated defaults (father name "محمد", fake national ID/phone/email) violate data-integrity requirements | Real create/update w/ validation, no artificial defaults, completeness computed |
| 6 | Attachment Center (`AttachmentCenter`) | Resume versioning + 10 doc categories — upload/delete ADMIN, view both | Primary resume, previous versions, supporting docs | upload/delete metadata only (`isSimulatedLocalOnly`) | Binary storage intentionally pending | Private storage, signed downloads, real upload validation + audit |
| 7 | Vacancy Directory (`VacancyDirectory`) | Job openings — both roles | Cards w/ counts | create vacancy (ADMIN) | Works off mock | Real CRUD + status transitions |
| 8 | Vacancy Detail (`VacancyDetail`) | Pipeline per vacancy | Requirements, linked candidates w/ match %, stage select | link applicant, change stage (ADMIN) | Works off mock; match score stored but not explained | Candidacy records, stage history, explainable match score |
| 9 | Reports (`ReportsView`) | Filtered analytics + CSV + print | KPIs, category/degree breakdowns, table | none (CSV export client-side) | Client-side aggregation of full mock dataset | Server aggregation respecting RLS, authorized export |
| 10 | Organization (`OrganizationView`) | Holding structure: parent + 4 subsidiaries + projects | Org cards, projects | create subsidiary (ADMIN, mock) | Works off mock | organizations/projects tables, real create |
| 11 | Users (`UserManagementView`) | Accounts & roles — ADMIN | Users table | role change, active toggle | Simulated only | Supabase Auth users, profile management, admin API provisioning |
| 12 | Audit Log (`AuditLogView`) | Event history — both roles | Events table w/ filters | none | Mock events w/ fake timestamps | Append-only audit written by real operations |
| 13 | Settings (`SettingsView`) | Controlled vocabularies (cities, job categories; read-only education/attachment lists) — ADMIN edits | Vocab lists | add/remove city, category | Mock persistence | Vocabulary tables + admin-gated updates |
| — | Footer/ZIP download, demo role switcher, demo banner | — | — | — | Prototype-only artifacts to remove | — |

## 2. Business rules extracted from source (must survive redesign)

1. **Group employment priority (5 classes, deterministic):** `VERIFIED_PARENT` > `VERIFIED_SUBSIDIARY` > `PENDING_VERIFICATION` > `NO_GROUP_HISTORY` > `INSUFFICIENT_DATA`. Derived from employment records flagged as group entities and their verification status. Sort weight 4/3/2/1/0 with experience tie-break. UI must show the reason text, not just the rank (PriorityBadge + reason box).
2. **Employment verification workflow (ADMIN):** status ∈ VERIFIED/PENDING/REJECTED/NOT_APPLICABLE; verify/reject records reviewer, date, and notes; rejection requires documented reason; verification updates the applicant's derived priority. Mission §4.3 adds: editing a verified record invalidates verification until re-reviewed.
3. **PII isolation (security_spec v2.0):** full national ID, full home address, unmasked phone, previous salaries, confidential notes live in an admin-only store; general profile carries masked values only; admin unmask is an explicit action. Test matrix TC01–TC16 (tests/security.test.ts simulator) must be re-verified against real RLS/API.
4. **Authorization matrix (authService):** VIEW_DATA + EXPORT_DATA allowed for both roles; CREATE/EDIT applicant, VERIFY employment, MANAGE vacancies, MANAGE users, manage vocab/organization = ADMIN. Client-side only today → must be enforced server-side + RLS.
5. **Match score (transparent):** base 50, city match +15, experience ≥ requirement +15, priority +15 (parent) / +10 (subsidiary), required-skills intersection scaled to +15, capped 99. No AI, explainable — keep formula, expose breakdown.
6. **Candidacies:** independent per (applicant, vacancy) pair with stage NEW→SCREENING→INTERVIEW/SHORTLIST→ACCEPTED/REJECTED/WITHDRAWN and notes; vacancy counts (applicantCount, shortlistedCount) derived.
7. **Resume versioning:** uploading a new primary resume demotes the previous one to PREVIOUS_RESUME with version numbers; 10 attachment categories; file limits pdf/doc/docx/jpg/jpeg/png ≤ 10 MB (storageService).
8. **Persian/RTL requirements:** Vazirmatn, `<html dir="rtl" lang="fa">`, Jalali dates, Persian digits, tabular-nums for tables, LTR islands for IDs/phones/emails, Persian normalization (ي/ی ك/ک أ/آ ة/ه, diacritics, ZWNJ, Persian/Arabic digits) for search, CSV with UTF-8 BOM + formula-injection guard, anti-pill discipline, slate-900/teal-700 palette, fixed right sidebar.
9. **Audit events:** every mutation logs actor, role, category, record identifier, Persian summary/details, outcome; client-channel low-severity events (VIEW_RESUME, SEARCH_DIRECTORY, EXPORT_LIST) allowed; audit immutable for everyone.
10. **Dashboard metrics:** totals, verified parent/subsidiary/pending/external counts, incomplete profiles (<70%), open vacancies, category/city/status distributions, recent applicants, open vacancies (4).

## 3. Known defects to fix (not preserve)

- Role switcher in TopBar + Sidebar lets anyone become ADMIN (client state) → replaced by real sessions.
- `nationalIdFull`, `phoneNumberFull`, `addressSummary`, `lastSalary` shipped to the browser for every user → masked server-side per role.
- ApplicantForm fabricates missing values (father name, national ID, phone, email, completeness 85) → required-field validation, honest empty values, computed completeness.
- Pagination/search/sort/export computed after downloading the whole dataset → server-side.
- Hardcoded city/category options in views → controlled vocabularies from DB.
- Fake timestamps (`۱۴۰۳/۰۸/۱۲ - ۱۲:۰۰`), hardcoded `newThisMonth: 6`, audit IDs from `Date.now()` → real timestamps/IDs/aggregates.
- Admin notes on profile page are client-state only; login demo accepts any input; footer links to a nonexistent ZIP; `main.tsxE` artifact.
- VacancyDetail assumes `matchScorePercent ?? 85` fallback fabrication.
- `calculateMockMatch` only called on link (existing candidacies keep stale score) → recompute on relevant changes + display breakdown.

## 4. Traceability matrix (page/interaction → backend op → test)

| Frontend interaction | Backend operation (target) | Permission | Test |
|---|---|---|---|
| Login form | Supabase Auth sign-in w/ cookie session (`/login`) | public | E2E-01; RLS: unauthenticated denial |
| First-admin setup | One-time `/setup` gated by `RASTA_SETUP_TOKEN`; creates admin profile | token holder | unit (token gate) + E2E |
| Logout | Session termination | any authenticated | E2E-02 |
| Dashboard | `getDashboardMetrics` (SQL aggregates) | any authenticated (RLS) | E2E-03/04 (both roles) |
| Directory list/filter/sort/paginate | `listApplicants` server query (normalized search, indexed) | authenticated | E2E-05/06; unit: filters |
| Export CSV (directory/reports) | Route handler `GET /api/export/applicants` (column allowlist, formula-guard) | authenticated (role-scoped columns) | unit: sanitizer; E2E-13 |
| Create/edit applicant (+children) | Server actions `createApplicant/updateApplicant` + child tables | ADMIN | E2E-07/08; RLS: viewer denied |
| View profile / unmask PII | `getApplicant` masked per role; unmask = server action + audit | viewer: masked only; admin: full on action | RLS TC05–TC09 equivalents; E2E-16 leak check |
| Verify/reject employment | `verifyEmployment` (state machine + history + priority recompute) | ADMIN | E2E-10; DB: trigger invalidation test |
| Edit verified employment record | trigger reverts verification to PENDING + history | ADMIN | DB test |
| Upload document | `POST /api/documents` (size/type/signature checks, private bucket) | ADMIN | E2E-09; RLS/storage policy |
| Download document | `GET /api/documents/[id]` → expiring signed URL + audit | authenticated w/ access | RLS: unauthorized denial |
| Delete document | Server action (storage + row) | ADMIN | E2E |
| Create vacancy / change status | `createVacancy/updateVacancyStatus` | ADMIN | E2E-11 |
| Link applicant to vacancy | `linkApplicantToVacancy` (unique pair, match score + breakdown) | ADMIN | E2E-11 |
| Change candidacy stage | `updateCandidacyStage` (+ history row) | ADMIN | E2E-12 |
| Manage users (role/status, create account) | Admin API (service role, server-only) + profile updates | ADMIN | RLS TC15/16; E2E-14 |
| Edit vocabularies / subsidiary | Server actions | ADMIN | unit + E2E |
| Audit log view | `listAuditEvents` (RLS: admin all, viewer read) | authenticated | RLS TC10–TC14 |
| Inactive account login | Session rejected with generic error | — | unit/RLS |

## 5. Architecture decisions (documented per mission §16)

1. **Framework:** controlled migration Vite/React → Next.js 16 App Router (mandated target), preserving all §2 business rules and rebuilding the UI to the redesign spec. TypeScript strict (~5.9 stable line rather than the 7.0 preview of the native compiler — documented compatibility decision).
2. **Backend:** Supabase (Postgres + Auth + Storage). No SQLite/Firestore/custom auth. `@supabase/ssr` cookie sessions; every query runs as the authenticated user under RLS; service-role key only inside narrowly scoped server operations (admin user provisioning, storage finalization).
3. **Roles:** `ADMIN` / `VIEWER` (values match supplied contract; labels «مدیر سامانه», «مشاهده‌گر منابع انسانی»). Public signup disabled; first admin via one-time setup token; subsequent users provisioned by ADMIN through Admin API.
4. **PII:** `applicant_sensitive` 1:1 table (national_id_full, home_address_full, phone_full, alt phone) + `employment_sensitive` (last_salary, reason_for_leaving) — RLS admin-only; masked values derived server-side; unmask = explicit audited admin action. Confidential internal notes admin-only (RLS on `is_confidential`).
5. **Audit:** single `audit_events` table w/ channel column; INSERT only via security-definer function `rasta.log_audit(...)`; UPDATE/DELETE revoked from all; admin-channel events require admin; client-channel restricted to LOW severity categories VIEW_RESUME/SEARCH_DIRECTORY/EXPORT_LIST with `actor = auth.uid()`.
6. **Dates:** stored as `timestamptz`/`date`; Jalali display via `Intl.DateTimeFormat('fa-IR-u-ca-persian')` — no external date dependency.
7. **Search:** persisted normalized text columns + pg_trgm indexes; normalization mirrors `persianUtils.normalizePersianText` (shared rules, unit-tested on both sides).
8. **Files:** private bucket `applicant-documents`; path `{applicantId}/{uuid}.ext`; server-validated extension/MIME/size/magic bytes; downloads via expiring signed URLs through an authorizing route handler; ≤10 MB uploads through route handler (within Vercel body limits).
9. **CSV import:** not present in the supplied frontend nor required by the bundled specs → intentionally omitted (decision recorded); CSV export exists in the source and is implemented server-side with sanitization.
10. **Package manager:** npm + committed `package-lock.json` (bun not guaranteed in CI/Vercel; reproducible install on Windows).
11. **Demo artifacts:** DemoBanner, role switcher, ZIP download link, simulated login removed. Mock data stays only as a git-history reference; a separate opt-in seed script (`supabase/seed.sql`-style, dev-only) may load sample records — never auto-run, never in production.
