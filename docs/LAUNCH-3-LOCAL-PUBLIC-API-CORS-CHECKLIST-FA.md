# Launch-3 — رفع CORS API عمومی در اجرای Local ویندوز

## اطلاعات پچ

```text
Phase: Launch-3 — Local Baseline
Patch: Local public API CORS bridge
Branch: agent/launch-3-local-baseline
Affected page: /
Local API prefix: /chakod-api
Upstream API: https://api.chakod.com
Database impact: ندارد
Production impact: ندارد؛ Bridge فقط در Development روی localhost فعال است و Proxy فقط در vite.windows.config.ts قرار دارد
Rollback point: 4d81124a3a94cd5236ec2bc36cca13c7240b0583
```

## شواهد پیش از اصلاح

- [x] Console صفحه اصلی چند خطای قرمز CORS از Origin محلی `http://127.0.0.1:5173` نشان داد.
- [x] درخواست های `me.php`، `home-banners.php`، `listings.php`، `home-stories.php` و Endpointهای کسب و کار مسدود شدند.
- [x] چند Component سمت Client آدرس `https://api.chakod.com` را مستقیم فراخوانی می کردند.
- [x] فایل `vite.windows.config.ts` پیش از پچ Proxy محلی نداشت.
- [x] هشدارهای زرد preload جدا از CORS هستند و در این پچ اصلاح نمی شوند.

## پیاده سازی

- [~] Helper بازنویسی امن URL در `lib/local-public-api.ts` اضافه شد.
- [~] Bridge سمت Client در `app/components/LocalPublicApiBridge.tsx` اضافه شد.
- [~] Bridge در `app/layout.tsx` پیش از محتوای صفحه Mount شد.
- [~] Proxy مسیر `/chakod-api` به `https://api.chakod.com` در `vite.windows.config.ts` اضافه شد.
- [x] تست مستقل تایید کرد Production و Hostهای غیرمحلی بدون بازنویسی باقی می مانند.
- [x] تست مستقل `tests/local-public-api.test.mjs` اضافه و با موفقیت اجرا شد.

## Commitها

```text
5b17ac4c25062d11ce6066e3654fbf2d8348fa63
e3f7d323eef0e2c7cf5f2e69ad1d6b2e2ddced64
ecf920e709804d9f4befca2c8d85fe1aeb04938d
6f83388340277438df4245cc10c0b30d9d5c5497
660aabe2f5c6e6b18990f2c81f788b519689ba9b
```

## تست های لازم

- [x] Vite پیش از Pull با `Ctrl + C` متوقف شد و ترمینال به PowerShell برگشت.
- [x] Pull امن با Fast-forward تا Commit `d6a0e50cbd5fc8025298176fc61296dbdbc2b36c` روی لپ تاپ انجام شد و ۸ فایل پچ دریافت شدند.
- [x] `git status --short --branch` شاخه درست و Working tree تمیز و هماهنگ با Origin را تایید کرد.
- [~] Git هنگام پاک سازی Pack قدیمی برای دو فایل `.idx` و `.pack` هشدار `Unlink failed` داد؛ Fast-forward و فایل های پروژه سالم ماندند.
- [x] `node --test tests/local-public-api.test.mjs` اجرا شد: ۳ تست موفق، صفر شکست، صفر Skip.
- [x] `node --test tests/route-access.test.mjs` پس از پچ اجرا شد: ۴ تست موفق، صفر شکست، صفر Skip.
- [x] `npx.cmd tsc --noEmit -p tsconfig.launch.json` بدون خطا و بدون Diagnostic اجرا شد.
- [ ] اجرای دوباره Vite با `npm.cmd run dev`.
- [ ] باز کردن صفحه اصلی و تایید حذف خطاهای قرمز CORS مربوط به `api.chakod.com`.
- [ ] تایید اینکه داده های صفحه اصلی در صورت پاسخ موفق Upstream نمایش داده می شوند.
- [ ] ثبت جداگانه هشدارهای preload باقی مانده بدون مخلوط کردن آن ها با CORS.
- [ ] ثبت نتیجه نهایی در `docs/GO-LIVE-CHECKLIST-FA.md`، `PROJECT_CONTEXT.md`، `TODO.md` و `AI_HANDOFF.md`.

## نتیجه تست مستقل

```text
Command: node --test tests/local-public-api.test.mjs
Tests: 3
Pass: 3
Fail: 0
Skipped: 0
Duration_ms: 179.7501
Verified:
- Proxy فقط روی Host محلی و Development فعال می شود
- URL و Query درخواست های Chakod API درست بازنویسی می شوند
- Fetch bridge خارج از Local Development غیرفعال می ماند
```

## نتیجه Regression دسترسی

```text
Command: node --test tests/route-access.test.mjs
Tests: 4
Pass: 4
Fail: 0
Skipped: 0
Duration_ms: 160.5285
Verified:
- مسیرهای خصوصی Dealer همچنان Session تاییدشده می خواهند
- مسیرهای Admin همچنان هویت ادمین تاییدشده می خواهند
- تفکیک Admin، کاربر عادی و مهمان بدون Regression باقی ماند
- ادمین بودن به تنهایی Commerce را فعال نمی کند
```

## نتیجه TypeScript محدوده Launch

```text
Command: npx.cmd tsc --noEmit -p tsconfig.launch.json
Result: success
Diagnostics: none
```

## وضعیت

```text
Status: پچ روی لپ تاپ Pull شده و تست مستقل، Regression دسترسی و TypeScript محدوده Launch موفق هستند؛ در انتظار تست Runtime مرورگر
Published commit: هنوز ادغام نشده
```
