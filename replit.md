# Woreda 11 — Club Attendance Platform

Club attendance and member management platform for Addis Ababa City Administration Bureau of Youth and Sport.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, requires TTY — use raw SQL in non-interactive shells)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: woreda11, port $PORT / 23517 in dev)
- API: Express 5 (artifact: api-server, port 8080)
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit OIDC (openid-client) with server-side sessions in PostgreSQL `sessions` table
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle for api-server)
- Brand: #255057 teal

## Where things live

- DB schema: `lib/db/src/schema/` (users.ts, auth.ts, clubs.ts, members.ts, etc.)
- OpenAPI contract: `lib/api-spec/openapi.yaml`
- Generated hooks (React Query): `lib/api-client-react/src/generated/`
- Generated Zod schemas: `lib/api-zod/src/generated/`
- Session management: `artifacts/api-server/src/lib/auth.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/authMiddleware.ts`
- Auth routes (OIDC): `artifacts/api-server/src/routes/auth.ts`
- Frontend auth hook: `artifacts/woreda11/src/hooks/use-auth.tsx`
- Theme / CSS: `artifacts/woreda11/src/index.css`

## Architecture decisions

- **Session-based auth (not JWT):** Replit OIDC → server creates a `sessions` row in Postgres. Cookie `sid` carries the session ID. `authMiddleware` re-queries `users` on each request so role/active changes are always fresh.
- **upsertUser strategy:** On OIDC login, look up by `replitSub` → fall back to `email` match (links Replit identity to pre-seeded admin accounts) → create new user with `role=manager`.
- **Two roles:** `admin` (full platform access) and `manager` (scoped to their club). Admin assigns roles in the admin UI.
- **`/api/auth/me` kept:** Frontend `useAuth` hook calls this for the current user profile (backwards compatible with all pages using `useGetMe` hook).
- **`drizzle-kit push` is interactive:** In non-TTY environments (CI, bash), apply schema changes via raw SQL or use `pnpm --filter @workspace/db run push` from an interactive terminal.

## Product

- **Admin**: manages clubs, members across all clubs, reads attendance reports, publishes news
- **Manager**: manages members and attendance for their assigned club, reads news
- Login via "Sign in with Replit" (OIDC); existing email-matched accounts are automatically linked

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `drizzle-kit push` requires an interactive TTY — fails in bash/CI. Use `executeSql` or raw psql for schema changes in non-interactive contexts.
- After any change to `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before typechecking frontend or server code.
- `lib/replit-auth-web` is a composite TS lib — it must stay in root `tsconfig.json references` and its own `tsconfig.json` must have `composite: true`.
- The `REPL_ID` env var is used as the OIDC `client_id` for Replit Auth — Replit provides it automatically in the deployment environment.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `replit-auth` skill for OIDC flow details and mobile token exchange
