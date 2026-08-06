# Launch-3 — اصلاح Redirect مسیرهای ادمین

## اطلاعات پچ

```text
Phase: Launch-3 — Local Baseline
Patch: Admin guest redirect
Branch: agent/launch-3-local-baseline
Affected route: /admin/*
Login route: /login?returnTo=/admin
Database impact: ندارد
Environment impact: ندارد
Rollback point: 3be38a804d6639e863c5f0b7f562566f4d7d130b
```

## شواهد پیش از اصلاح

- [x] کاربر آزمایشی واردشده و غیرادمین از `/admin/affiliate` به `/` برگردانده شد.
- [x] مهمان واقعی در پنجره ناشناس نیز از `/admin/affiliate` به `/` برگردانده شد.
- [x] علت در `app/admin/layout.tsx` پیدا شد: تمام هویت های غیرادمین بدون تفکیک به `/` Redirect می شدند.

## پیاده سازی

- [~] تصمیم دسترسی سه حالته `allow | login | home` در `lib/route-access.ts` اضافه شد.
- [~] ادمین تاییدشده اجازه ورود دارد.
- [~] کاربر واردشده ولی غیرادمین به `/` برمی گردد.
- [x] مهمان بدون Session در Runtime به `/login?returnTo=%2Fadmin` منتقل شد.
- [x] تست Regression برای هر سه حالت در `tests/route-access.test.mjs` اضافه و با موفقیت اجرا شد.

## تست های لازم

- [x] آخرین Commitهای شاخه با Fast-forward روی لپ تاپ دریافت شدند و HEAD محلی تا `08cfcb904529276bc53afa1a1a7bf4646447b6d8` به روز شد.
- [x] `node --test tests/route-access.test.mjs` اجرا شد: ۴ تست موفق، صفر شکست، صفر Skip.
- [x] TypeScript محدوده Launch با `npx.cmd tsc --noEmit -p tsconfig.launch.json` بدون خطا و بدون خروجی اجرا شد.
- [x] سرور محلی پس از تغییر با Vite `8.0.13` روی `http://127.0.0.1:5173/` در `3246ms` آماده شد.
- [~] هشدار غیرمسدودکننده Node با کد `DEP0205` هنگام استارت دیده شد و نیازمند بررسی منبع است.
- [x] مهمان ناشناس در Incognito از `/admin/affiliate` به `/login?returnTo=%2Fadmin` منتقل شد.
- [~] تلاش برای تست کاربر عادی نیز به `/login?returnTo=%2Fadmin` رسید؛ این نتیجه نشان می دهد Session معتبر کاربر عادی وجود نداشت و این اجرا دوباره فقط رفتار مهمان را تایید کرد.
- [ ] کاربر آزمایشی عادی باید دوباره وارد شود و سپس تایید شود که `/admin/affiliate` باز نمی شود و به `/` برمی گردد.
- [ ] بررسی نبود خطای جدید در ترمینال و Console.
- [~] نتیجه مهمان در `docs/GO-LIVE-CHECKLIST-FA.md` ثبت شد؛ نتیجه نهایی پچ پس از تست کاربر عادی ثبت می شود.

## وضعیت انتشار

```text
Implementation commits:
- bf4e9b563bb3b9ff1ec0f97981145f4ff7d78a52
- 68a016e27d2e1d3916a4ece57a3cb4d2000bf38f
- f8fa8cb82ed05fc031f3be6aa06c7c17bce4f1f4

Local regression result:
- tests: 4
- pass: 4
- fail: 0
- duration_ms: 5533.182

TypeScript result:
- command: npx.cmd tsc --noEmit -p tsconfig.launch.json
- result: success; no diagnostics printed

Runtime result:
- command: npm.cmd run dev
- Vite: 8.0.13
- ready_ms: 3246
- local_url: http://127.0.0.1:5173/
- warning: DEP0205 module.register() deprecation; non-blocking

Guest smoke result:
- input: http://127.0.0.1:5173/admin/affiliate
- final_url: http://127.0.0.1:5173/login?returnTo=%2Fadmin
- result: success

Signed-in user smoke attempt:
- final_url: http://127.0.0.1:5173/login?returnTo=%2Fadmin
- interpretation: no valid signed-in Session was present; result is not valid evidence for the non-admin signed-in branch

Status: تست مهمان، تست واحد و TypeScript موفق هستند؛ در انتظار ورود دوباره کاربر آزمایشی، تست Runtime کاربر عادی و بررسی Console
Published commit: هنوز ادغام نشده
```
