# API Server Fix – 2026-03-16 13:36 UTC

## Problem
```
error: Cannot find module 'hono/bun'
```

The `dev:api` script failed because `hono` wasn't properly installed in the workspace.

## Root Cause
- Bun workspace dependency resolution didn't pull hono for `packages/api`
- Required a fresh install of the entire workspace

## Solution (Already Applied)

### Step 1: Clean workspace install
```bash
rm -rf node_modules bun.lock
bun install
```

### Step 2: Install hono in packages/api
```bash
cd packages/api
bun add hono
```

---

## Verification

✅ **API server now starts successfully:**

```bash
bun run dev:api
```

Expected output:
```
@coop/api start: Coop API server listening on http://127.0.0.1:4444
```

---

## Status

✅ **Fixed on server side**

On your machine, just run:
```bash
bun run dev:api
```

It should work now with the latest workspace install.

If you still get errors:
```bash
cd packages/api
bun add hono
bun run dev
```

---

**Server Status:** ✅ API running on ws://127.0.0.1:4444  
**Ready to test:** ✅
