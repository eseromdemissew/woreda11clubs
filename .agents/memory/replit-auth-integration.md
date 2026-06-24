---
name: Replit Auth integration
description: OIDC session-based auth using openid-client; how sessions, middleware, and upsertUser work together.
---

## Session flow
- Login: `GET /api/login` → OIDC redirect → `GET /api/callback` → upsertUser → create `sessions` row → set `sid` cookie.
- `authMiddleware` (in `artifacts/api-server/src/middlewares/authMiddleware.ts`) runs on every request: reads `sid` from cookie or `Authorization: Bearer`, loads session from DB, re-queries `users` table for fresh role data, sets `req.user`.
- Logout: `GET /api/logout` → delete session row → OIDC end-session URL redirect.

## upsertUser strategy
1. Look up by `users.replit_sub = claims.sub`
2. Fall back to `users.email = claims.email` (links Replit identity to pre-seeded admin accounts)
3. Create new user with `role = 'manager'` (admin assigns roles later)

**Why:** Admins are pre-seeded with email/password; when they first log in via Replit OIDC, step 2 links their Replit identity without losing their `role = 'admin'`.

## lib/replit-auth-web
- Copied from `.local/skills/replit-auth/templates/lib/replit-auth-web/`
- Must be `composite: true` in its `tsconfig.json` and listed in root `tsconfig.json references`.
- Fixed `import.meta.env.BASE_URL` → `window.location.pathname` (not Vite-aware in composite lib context).

## Frontend
- `artifacts/woreda11/src/hooks/use-auth.tsx` calls `useGetMe` → `GET /api/auth/me` (kept for backward compat with all pages).
- Login page: single "Sign in with Replit" button → `window.location.href = /api/login?returnTo=...`.
- Logout: `window.location.href = /api/logout` (no mutation needed).

## Key files
- Session lib: `artifacts/api-server/src/lib/auth.ts`
- Middleware: `artifacts/api-server/src/middlewares/authMiddleware.ts`
- Routes: `artifacts/api-server/src/routes/auth.ts`
- DB tables: `lib/db/src/schema/auth.ts` (sessionsTable), `lib/db/src/schema/users.ts` (replitSub col, passwordHash nullable)
