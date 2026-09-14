# Demo readiness review — 2026-09-05

Verdict: blocked for an authenticated end-to-end demo.

## Fresh evidence

- Frontend was initially unreachable. Started with `npm run dev:client` outside the sandbox because Vite encountered an access-denied error while traversing the OneDrive path. Login page now renders.
- API startup attempted with `npm run dev:server`. Prisma exits with P1001: cannot reach PostgreSQL at 127.0.0.1:5432.
- Docker is not on PATH. No PostgreSQL Windows service or executable was found by the targeted checks. This does not prove the database is absent elsewhere on the machine.
- Browser login using the existing demo fixture account fails. The UI says to check credentials despite API unavailability. LoginPage.tsx line 35 uses that fallback for server/network errors.
- Client lint passed. Server integration tests were not repeated against the unavailable database.
- No authenticated route, write workflow, permission boundary, export, or document download passed fresh end-to-end verification during this review.

## Advisory assessment

The prior successful build and mobile screenshots do not prove demo readiness. The strongest counterexample is a fresh session: login currently fails before any feature can be demonstrated. Restore the existing database connection first; additional visual polish does not address this dependency.

## Completion criteria

1. Locate and start the existing development PostgreSQL instance; verify API readiness. Preserve existing data.
2. Distinguish unavailable-service errors from invalid credentials in the login UI.
3. Verify Admin, HR, manager, and employee logins and unauthorized-route behavior using dedicated demo/test accounts.
4. Exercise employee lookup, recruitment pipeline, travel submission/approval, asset assignment/return, performance review, training, helpdesk, and document retrieval with clearly identified test records.
5. Verify persisted results after refresh, validation failures, expired sessions, empty/search states, and role restrictions.
6. Validate keyboard interactions and layouts at 375, 471, 768, and 1280px against DESIGN.md; capture evidence and console failures.
7. Run database-dependent tests against an isolated test database. Existing suites change records and credentials and must not be run indiscriminately against demo data.
8. Rehearse a fresh login-to-completion demo and record a final pass/blocked matrix.

## Other source findings

- README instructs `npm run seed` in server, but server/package.json defines `prisma:seed`, not `seed`.
- CountUp rounds all animated values to integers; decimal end values would display differently from the accessible final value. Current dashboard callers use counts. Treat this as a component limitation, not a proven current demo failure.
- CountUp uses 350ms animation while DESIGN.md specifies 150–250ms for normal transitions; review this discrepancy during visual QA.

Source files and remote branches were not modified by this review. The pre-existing generated client/tsconfig.app.tsbuildinfo modification remains.
