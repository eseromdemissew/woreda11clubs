---
name: DB schema migration approach
description: drizzle-kit push requires an interactive TTY; non-interactive approach for CI/bash contexts.
---

## Rule
`pnpm --filter @workspace/db run push` (drizzle-kit push) is **interactive-only** — it prompts the user for confirmation when destructive changes are detected (e.g. adding a UNIQUE constraint to a table with existing rows). It fails with `Interactive prompts require a TTY terminal` in bash/CI/non-TTY shells.

**Why:** drizzle-kit uses an interactive CLI for safety confirmations.

## How to apply in non-TTY contexts
Use `executeSql` in the code_execution notebook (which has DB access via the pre-registered callback), e.g.:
```js
await executeSql({ sqlQuery: `ALTER TABLE users ADD COLUMN IF NOT EXISTS replit_sub TEXT` });
```

For constraints:
```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_replit_sub_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_replit_sub_unique UNIQUE (replit_sub);
  END IF;
END $$;
```

## When drizzle push IS safe to run
From an interactive terminal (e.g. the Replit shell tab), it works normally.
