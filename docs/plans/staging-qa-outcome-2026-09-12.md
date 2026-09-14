# Staging QA Outcome

Date: 2026-09-12  
Branch: `staging`  
Pushed commit: `fe09cd6`

## Result

**DONE_WITH_CONCERNS**

The local application and staging branch are verified for the tested paths. The API is ready, seeded Admin authentication works, the primary route smoke passes, and all automated test, lint, build, and dependency-audit gates are green.

## Fixes delivered

- Removed irregular whitespace that blocked the client lint gate.
- Restored the server Jest, Supertest, ESLint, and TypeScript ESLint toolchain.
- Added the minimal `server/jest.config.cjs` required by the existing TypeScript integration tests.
- Added server-side prevention for overlapping travel requests, excluding rejected requests from the conflict check.
- Removed unused vulnerable `xlsx` and `exceljs` server dependencies and pinned patched `qs` resolution.
- Added staging-triggered deterministic CI checks for installs, builds, tests, lint, and production dependency audits.
- Added route-level lazy loading for authenticated pages with the existing accessible loading spinner.
- Made the server test command serial by default so shared integration fixtures run deterministically.
- Preserved the full UI review and QA plan in `docs/plans/full-ui-feature-review-2026-09-12.md`.

## Verification evidence

- API live/readiness: HTTP 200 for `/api/live` and `/api/ready`.
- Client tests: 6 files, 8 tests passed.
- Server tests: 6 suites, 47 tests passed.
- Client lint: passed.
- Server lint: passed.
- Server build: passed.
- Client production build: passed.
- Server production dependency audit: passed with 0 vulnerabilities.
- Client production dependency audit: passed with 0 vulnerabilities.
- Browser smoke: dashboard, employees, recruitment, travel, office expenses, and audit loaded with zero console errors.
- Responsive spot check: 375px dashboard had no horizontal overflow and exposed the accessible navigation-menu control; browser viewport restored to 1280px.

## Remaining concern

The client production build still reports a non-blocking chunk-size warning. Route splitting reduced the main bundle from approximately 1.24 MB to approximately 547 KB, while the attrition chunk is approximately 410 KB. Further vendor/manual chunking can be considered after staging performance measurements.

## Staging recommendation

The verified changes are ready to push to `origin/staging`. Continue with deeper role-by-role and non-happy-path QA before production release, especially approval transitions, uploads/exports, expired sessions, the full 375/471/768/1280 responsive matrix, and a deployed staging canary.
