# Cloudflare staging build checkpoint — 2026-08-08 02:33 +03:30

- Worker: `chakod-car-staging`
- Production branch for this staging Worker: `agent/launch-3-local-baseline`
- Staging D1 database: `chakod-staging`
- Production Worker `chakod-car` is intentionally not bound to the staging D1 database.
- Cloudflare staging build command is configured as `npm run build:cloudflare`.
- The canonical Sites build remains `npm run build` and is intentionally unchanged.

This file exists to trigger a fresh Cloudflare staging build after updating the build command.
