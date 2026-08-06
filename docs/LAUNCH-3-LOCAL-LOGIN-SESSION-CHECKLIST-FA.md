# Launch-3 — اتصال ورود آزمایشی لوکال به Session سمت سرور

## اطلاعات پچ

```text
Phase: Launch-3 — Local Baseline
Patch: Local login server session bridge
Branch: agent/launch-3-local-baseline
Route: /login
Server endpoint: POST /api/auth/dev-session
Production impact: نباید داشته باشد؛ UI و Endpoint فقط در Development روی Host محلی فعال هستند
Database impact: ندارد
```

## مشکل پیش از اصلاح

- [x] دکمه `ورود آزمایشی لوکال` فقط `localStorage` را مقداردهی می کرد.
- [x] پیش از Redirect هیچ Cookie معتبر سمت سرور ایجاد نمی شد.
- [x] در نتیجه Smoke Test کاربر عادی پس از پچ Admin قابل اتکا نبود و مسیر دوباره رفتار مهمان را نشان می داد.
- [x] Endpoint آماده `POST /api/auth/dev-session` از قبل وجود داشت و Cookie محلی HttpOnly ایجاد می کرد.

## پیاده سازی

- [~] Helper جدید `lib/local-development-login.ts` برای فراخوانی امن Endpoint محلی اضافه شد؛ تست مستقل موفق است و Smoke Test مرورگر باقی مانده است.
- [~] صفحه `app/login/page.tsx` فقط بعد از پاسخ موفق Endpoint، اطلاعات نمایشی Local را در `localStorage` ذخیره می کند؛ تست Runtime مرورگر باقی مانده است.
- [~] Redirect نهایی همچنان از `safeReturnTo` عبور می کند؛ تست مستقل Helper موفق و Smoke Test مسیر واقعی باقی مانده است.
- [~] هنگام خطای Endpoint، Redirect و ثبت Local Storage انجام نمی شود و پیام خطا نمایش داده می شود؛ رفتار Helper تست شده و رفتار UI هنوز Smoke Test نشده است.
- [~] متن دکمه هنگام درخواست به `در حال ورود...` تغییر می کند؛ بررسی دیداری مرورگر باقی مانده است.
- [x] رفتار Production تغییر داده نشد؛ دکمه همچنان فقط با `NODE_ENV=development` رندر می شود.

## تست های اضافه شده

- [x] فایل `tests/local-development-login.test.mjs` اضافه و روی لپ تاپ اجرا شد.
- [x] تست مستقل تایید کرد درخواست `POST` به `/api/auth/dev-session` با `credentials: include` ارسال می شود.
- [x] تست مستقل تایید کرد Redirect موفق از پاسخ Endpoint خوانده می شود.
- [x] تست مستقل تایید کرد پیام خطای Server برگردانده می شود و برای پاسخ نامعتبر یا قطع ارتباط، نتیجه شکست امن تولید می شود.

## Commitها

```text
246219b54d38bfee824b98762892d4a5ab9adc1c
cb1fb56dc40d01b0fbb36f9d31166a07f12e89b9
a0ed755bf438b0f9e497cd912eb030d1e5995d47
```

## تست های لازم روی لپ تاپ

- [x] توقف Vite با `Ctrl + C` و بازگشت ترمینال به PowerShell تایید شد.
- [x] Pull امن شاخه با Fast-forward از `d6a0e50` تا `8ab6831` انجام شد و ۶ فایل پچ روی لپ تاپ دریافت شدند.
- [x] `git status --short --branch` شاخه `agent/launch-3-local-baseline`، Working tree تمیز و هماهنگی با Origin را تایید کرد.
- [x] `node --test tests/local-development-login.test.mjs` اجرا شد: ۳ تست موفق، صفر شکست، صفر Skip، مدت `248.4479ms`.
- [ ] اجرای مجدد `node --test tests/local-development-session.test.mjs`.
- [ ] اجرای مجدد `node --test tests/route-access.test.mjs`.
- [ ] اجرای `npx.cmd tsc --noEmit -p tsconfig.launch.json`.
- [ ] اجرای Vite و Smoke Test دکمه ورود آزمایشی در `/login?returnTo=%2Fadmin%2Faffiliate`.
- [ ] تایید اینکه کاربر عادی پس از ورود آزمایشی به `/` برمی گردد و صفحه Admin باز نمی شود.
- [ ] تایید اینکه مهمان همچنان به `/login?returnTo=%2Fadmin` منتقل می شود.
- [ ] ثبت نتیجه نهایی در اسناد اصلی پروژه.

## نتیجه تست مستقل ورود لوکال

```text
Command: node --test tests/local-development-login.test.mjs
Tests: 3
Pass: 3
Fail: 0
Cancelled: 0
Skipped: 0
Todo: 0
Duration_ms: 248.4479
Verified:
- POST /api/auth/dev-session
- credentials: include
- موفقیت و redirect پاسخ Endpoint
- پیام خطای Server
- شکست امن برای پاسخ نامعتبر یا ارتباط ناموفق
```

## وضعیت

```text
Status: پیاده سازی روی GitHub ذخیره و روی لپ تاپ Pull شده است؛ شاخه تمیز و تست مستقل ورود لوکال موفق است. در انتظار Regression Session، Route access، TypeScript و Smoke Test مرورگر
Published commit: هنوز ادغام نشده
```
