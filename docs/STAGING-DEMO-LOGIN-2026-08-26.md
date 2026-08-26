# Staging demo login fallback — 2026-08-26

The staging host lost part of the upstream SMS/database test data after host cleanup. To keep presentation testing independent of that upstream state, PR #110 added a staging-only demo login fallback.

- Scope: `staging.chakod.com` only, and only when `PRELAUNCH_FIXTURES=true`.
- Demo OTP: `11111`.
- Any valid Iranian mobile number can request the staging demo OTP.
- Verification creates a staging-only session identity; production/main authentication is unchanged.
- Demo account type is derived from the final mobile digit for repeatable testing: `0=personal`, `1=dealer`, `2=parts_store`, `3=repair_shop`, `4=car_service`.
- The tens digit `1`, `2`, or `3` selects one of three demo profiles for that account type.
- `/api/auth/me` resolves the demo identity locally on staging.
- `/api/auth/dashboard-listings` serves prelaunch listings for demo sessions so the account dashboard remains populated even if the host database is empty.

Merged implementation: PR #110, merge commit `a47cf8a7a3fdc4a0956a7ec1695038c0e1ba17be`.

Deployment note: the preceding staging deploy run was cancelled by workflow concurrency rather than by a source/build failure. A fresh staging push is required to trigger a deployment containing PR #110.
