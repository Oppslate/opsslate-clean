# OpsSlate Suite

Monorepo for the OpsSlate app family.

## Structure

```txt
apps/
  web/
  estimating/
  scheduler/
  books/
  takeoff/

packages/
  suite-config/
  suite-auth/
  suite-ui/
```

Each Vercel project should point at its own app directory. Shared product navigation, toolbar UI, bundle config, and auth helpers live in `packages/`.
