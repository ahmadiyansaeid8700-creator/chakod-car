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

- [x] تصمیم دسترسی سه حالته `allow | login | home` در `lib/route-access.ts` اضافه و با تست Regression تایید شد.
- [~] ادمین تاییدشده طبق منطق گارد اجازه ورود دارد؛ Runtime با نقش ادمین واقعی هنوز تست نشده است.
- [x] کاربر واردشده ولی غیرادمین در Runtime به `/` برگشت.
- [x] مهمان بدون Session در Runtime به `/login?returnTo=%2Fadmin` منتقل شد.
- [x] تست Regression برای هر سه حالت در `tests/route-access.test.mjs` اضافه و با موفقیت اجرا شد.

## تست های لازم

- [x] آخرین Commitهای شاخه با Fast-forward روی لپ تاپ دریافت شدند.
- [x] `node --test tests/route-access.test.mjs` پس از پچ Session محلی نیز اجرا شد: ۴ تست موفق، صفر شکست، صفر Skip.
- [x] TypeScript محدوده Launch با `npx.cmd tsc --noEmit -p tsconfig.launch.json` بدون خطا و بدون خروجی اجرا شد.
- [x] سرور محلی پس از تغییر با Vite `8.0.13` روی `http://127.0.0.1:5173/` در `1383ms` آماده شد.
- [~] هشدار غیرمسدودکننده Node با کد `DEP0205` هنگام استارت دیده شد و نیازمند بررسی منبع است.
- [x] مهمان ناشناس در Incognito پیش از اضافه شدن Session bridge از `/admin/affiliate` به `/login?returnTo=%2Fadmin` منتقل شد.
- [x] تلاش نخست برای تست کاربر عادی به `/login?returnTo=%2Fadmin` رسید و نشان داد ورود آزمایشی قبلی فقط `localStorage` را تنظیم کرده بود.
- [x] مسیر محلی `/api/auth/dev-session` در پنجره عادی باز شد و مرورگر به `/account?complete=1` رسید؛ Session سمت سرور برای کاربر عادی ساخته شد.
- [x] کاربر عادی دارای Session سمت سرور از `/admin/affiliate` به `/` برگشت و صفحه ادمین باز نشد.
- [ ] بازآزمایی مهمان Incognito پس از اضافه شدن Session bridge.
- [ ] بررسی نبود خطای جدید در ترمینال و Console.
- [~] نتیجه کاربر عادی در چک لیست اختصاصی Session ثبت شد؛ ثبت نهایی Go-Live و Handoff پس از بازآزمایی مهمان و بررسی خطا انجام می شود.

## وضعیت انتشار

```text
Implementation commits:
- bf4e9b563bb3b9ff1ec0f97981145f4ff7d78a52
- 68a016e27d2e1d3916a4ece57a3cb4d2000bf38f
- f8fa8cb82ed05fc031f3be6aa06c7c17bce4f1f4

Local development Session bridge commits:
- 20b56f5c878e83c2370def0d795dfdbd2c86dea7
- 4fc501bf6e592011bceee7f7c6b08ccd6f7cc78b
- 05f8e75e455ef36f8457b7bf76f51bc378abefd3
- f07ff9495d79bd2e01ac447fd6d897580719a63c

Local regression result:
- tests: 4
- pass: 4
- fail: 0
- duration_ms: 145.3869

TypeScript result:
- command: npx.cmd tsc --noEmit -p tsconfig.launch.json
- result: success; no diagnostics printed

Runtime result:
- command: npm.cmd run dev
- Vite: 8.0.13
- ready_ms: 1383
- local_url: http://127.0.0.1:5173/
- warning: DEP0205 module.register() deprecation; non-blocking

Guest smoke result before Session bridge:
- input: http://127.0.0.1:5173/admin/affiliate
- final_url: http://127.0.0.1:5173/login?returnTo=%2Fadmin
- result: success

Signed-in non-admin preparation:
- input: http://127.0.0.1:5173/api/auth/dev-session
- final_url: http://127.0.0.1:5173/account?complete=1
- result: server-visible local development Session established

Signed-in non-admin smoke result:
- input: http://127.0.0.1:5173/admin/affiliate
- final_url: http://127.0.0.1:5173/
- result: success; admin page blocked

Status: تست واحد، TypeScript، مهمان پیش از Session bridge و کاربر عادی پس از Session bridge موفق هستند؛ در انتظار بازآزمایی مهمان و بررسی Console/ترمینال
Published commit: هنوز ادغام نشده
```
