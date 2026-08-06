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

- [x] Helper تشخیص Session محلی در `lib/local-development-session.ts` اضافه و با تست مستقل تایید شد.
- [x] Endpoint محلی `GET/POST /api/auth/dev-session` برای ساخت Cookie توسعه اضافه و در Runtime تایید شد.
- [x] `lib/server-route-access.ts` فقط روی localhost و فقط در Development این Session را به عنوان کاربر عادی می شناسد.
- [x] Session آزمایشی برای `/api/admin-me.php` صراحتا غیرادمین باقی ماند و مسیر ادمین در Runtime باز نشد.
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
- [x] Vite پس از Pull با نسخه `8.0.13` روی `http://127.0.0.1:5173/` در `1383ms` آماده شد.
- [~] هشدار غیرمسدودکننده Node با کد `DEP0205` هنگام اجرای Vite همچنان مشاهده شد.
- [x] مسیر `/api/auth/dev-session` در پنجره عادی باز شد و انتقال نهایی به `/account?complete=1` تایید شد؛ Cookie آزمایشی سمت سرور ساخته شد.
- [x] `/admin/affiliate` با Session آزمایشی کاربر عادی باز نشد و انتقال نهایی به `/` تایید شد.
- [!] بازآزمایی مهمان در پنجره ای که به عنوان Incognito استفاده شد به `/` رسید؛ این نتیجه نشان می دهد آن فضای مرورگر Cookie کاربر عادی داشته و تست مهمان پاک محسوب نمی شود. همه پنجره های Incognito باید بسته و یک Session ناشناس تازه ایجاد شود.
- [ ] تایید مهمان پاک پس از بستن همه پنجره های Incognito: `/admin/affiliate` باید به `/login?returnTo=%2Fadmin` برسد.
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

## نتیجه اجرای Vite

```text
Command: npm.cmd run dev
Vite: 8.0.13
Ready_ms: 1383
Local_url: http://127.0.0.1:5173/
Warning: DEP0205 module.register() deprecation; non-blocking
```

## نتیجه Runtime Session محلی

```text
Input: http://127.0.0.1:5173/api/auth/dev-session
Final_url: http://127.0.0.1:5173/account?complete=1
Result: success; local development server Session established
```

## نتیجه Runtime کاربر عادی روی مسیر ادمین

```text
Input: http://127.0.0.1:5173/admin/affiliate
Identity: local development signed-in non-admin user
Final_url: http://127.0.0.1:5173/
Result: success; admin page blocked and no admin access granted
```

## بازآزمایی مهمان نیازمند پاک سازی

```text
Input: http://127.0.0.1:5173/admin/affiliate
Reported window: Incognito
Final_url: http://127.0.0.1:5173/
Interpretation: authenticated non-admin Cookie was present; not a clean guest result
Status: blocked until all Incognito windows are closed and a fresh Incognito session is used
```

## وضعیت

```text
Status: پیاده سازی، تست ها و Smoke Test کاربر عادی موفق هستند؛ تست مهمان پاک به دلیل وجود Cookie در فضای Incognito استفاده شده باید تکرار شود
Published commit: هنوز ادغام نشده
```
