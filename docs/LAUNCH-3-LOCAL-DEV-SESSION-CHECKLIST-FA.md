# Launch-3 — اتصال Session آزمایشی محلی به گارد سمت سرور

## اطلاعات پچ

```text
Phase: Launch-3 — Local Baseline
Patch: Local development server session bridge
Branch: agent/launch-3-local-baseline
Affected routes:
- /api/auth/dev-session
- /admin/*
Database impact: ندارد
Production impact: ندارد؛ مسیر فقط در NODE_ENV=development و Host محلی فعال است
Admin impact: Session آزمایشی هرگز ادمین نیست
Rollback point: 93bc971782c8db21cba4b952adb1486b7083c798
```

## علت

- [x] ورود آزمایشی قبلی فقط `localStorage` را مقداردهی می کرد.
- [x] گارد سمت سرور فقط Cookie به نام `chakod_session` را می خواند.
- [x] پس از ورود آزمایشی، `/account?complete=1` باز می شد ولی `/admin/affiliate` کاربر را مهمان تشخیص می داد.

## پیاده سازی

- [~] Helper تشخیص Session محلی در `lib/local-development-session.ts` اضافه شد.
- [~] Endpoint محلی `GET/POST /api/auth/dev-session` برای ساخت Cookie توسعه اضافه شد.
- [~] `lib/server-route-access.ts` فقط روی localhost و فقط در Development این Session را به عنوان کاربر عادی می شناسد.
- [~] Session آزمایشی برای `/api/admin-me.php` صراحتا غیرادمین باقی می ماند.
- [x] تست مستقل `tests/local-development-session.test.mjs` اضافه و با موفقیت اجرا شد.
- [x] Logout موجود Cookie `chakod_session` را پاک می کند و با این پچ سازگار است.

## Commitها

```text
20b56f5c878e83c2370def0d795dfdbd2c86dea7
4fc501bf6e592011bceee7f7c6b08ccd6f7cc78b
05f8e75e455ef36f8457b7bf76f51bc378abefd3
f07ff9495d79bd2e01ac447fd6d897580719a63c
```

## تست های لازم

- [x] Pull امن پچ روی لپ تاپ با Fast-forward تا Commit `60e33d22baf2a7108f7519a17079489180c91bcc` انجام شد.
- [x] `node --test tests/local-development-session.test.mjs` اجرا شد: ۳ تست موفق، صفر شکست، صفر Skip.
- [x] `node --test tests/route-access.test.mjs` پس از پچ دوباره اجرا شد: ۴ تست موفق، صفر شکست، صفر Skip.
- [x] `npx.cmd tsc --noEmit -p tsconfig.launch.json` پس از پچ بدون خطا و بدون Diagnostic اجرا شد.
- [ ] اجرای Vite پس از Pull.
- [ ] باز کردن `/api/auth/dev-session` و تایید انتقال به `/account?complete=1`.
- [ ] باز کردن `/admin/affiliate` و تایید انتقال کاربر عادی به `/`.
- [ ] تایید مجدد مهمان Incognito به `/login?returnTo=%2Fadmin`.
- [ ] بررسی Console و ترمینال برای خطای جدید.
- [ ] ثبت نتیجه نهایی در چک لیست Go-Live و فایل های Handoff.

## نتیجه تست مستقل

```text
Command: node --test tests/local-development-session.test.mjs
Tests: 3
Pass: 3
Fail: 0
Skipped: 0
Duration_ms: 162.4838
```

## نتیجه Regression دسترسی

```text
Command: node --test tests/route-access.test.mjs
Tests: 4
Pass: 4
Fail: 0
Skipped: 0
Duration_ms: 145.3869
```

## نتیجه TypeScript

```text
Command: npx.cmd tsc --noEmit -p tsconfig.launch.json
Result: success
Diagnostics: none
```

## وضعیت

```text
Status: پیاده سازی شده، روی لپ تاپ Pull شده و تست مستقل، Regression و TypeScript موفق هستند؛ در انتظار Smoke Test Runtime
Published commit: هنوز ادغام نشده
```
