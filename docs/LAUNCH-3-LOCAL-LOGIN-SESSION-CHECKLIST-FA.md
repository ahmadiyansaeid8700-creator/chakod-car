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

- [~] Helper جدید `lib/local-development-login.ts` برای فراخوانی امن Endpoint محلی اضافه شد.
- [~] صفحه `app/login/page.tsx` فقط بعد از پاسخ موفق Endpoint، اطلاعات نمایشی Local را در `localStorage` ذخیره می کند.
- [~] Redirect نهایی همچنان از `safeReturnTo` عبور می کند.
- [~] هنگام خطای Endpoint، Redirect و ثبت Local Storage انجام نمی شود و پیام خطا نمایش داده می شود.
- [~] متن دکمه هنگام درخواست به `در حال ورود...` تغییر می کند.
- [x] رفتار Production تغییر داده نشد؛ دکمه همچنان فقط با `NODE_ENV=development` رندر می شود.

## تست های اضافه شده

- [~] فایل `tests/local-development-login.test.mjs` اضافه شد.
- [ ] تایید ارسال `POST` به `/api/auth/dev-session` با `credentials: include` روی لپ تاپ.
- [ ] تایید عبور Redirect موفق از پاسخ Endpoint روی لپ تاپ.
- [ ] تایید نمایش پیام خطای Server و جلوگیری از Redirect روی لپ تاپ.

## Commitها

```text
246219b54d38bfee824b98762892d4a5ab9adc1c
cb1fb56dc40d01b0fbb36f9d31166a07f12e89b9
a0ed755bf438b0f9e497cd912eb030d1e5995d47
```

## تست های لازم روی لپ تاپ

- [ ] توقف Vite با `Ctrl + C`.
- [ ] Pull امن شاخه با `git pull --ff-only origin agent/launch-3-local-baseline`.
- [ ] تایید شاخه و Working tree با `git status --short --branch`.
- [ ] اجرای `node --test tests/local-development-login.test.mjs`.
- [ ] اجرای مجدد `node --test tests/local-development-session.test.mjs`.
- [ ] اجرای مجدد `node --test tests/route-access.test.mjs`.
- [ ] اجرای `npx.cmd tsc --noEmit -p tsconfig.launch.json`.
- [ ] اجرای Vite و Smoke Test دکمه ورود آزمایشی در `/login?returnTo=%2Fadmin%2Faffiliate`.
- [ ] تایید اینکه کاربر عادی پس از ورود آزمایشی به `/` برمی گردد و صفحه Admin باز نمی شود.
- [ ] تایید اینکه مهمان همچنان به `/login?returnTo=%2Fadmin` منتقل می شود.
- [ ] ثبت نتیجه نهایی در اسناد اصلی پروژه.

## وضعیت

```text
Status: پیاده سازی روی GitHub ذخیره شده؛ در انتظار Pull و تست لپ تاپ
Published commit: هنوز ادغام نشده
```
