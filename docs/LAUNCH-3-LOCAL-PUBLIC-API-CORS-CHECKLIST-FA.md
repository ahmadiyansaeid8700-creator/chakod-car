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

- [x] Helper بازنویسی امن URL در `lib/local-public-api.ts` اضافه و با تست مستقل تایید شد.
- [x] Bridge سمت Client در `app/components/LocalPublicApiBridge.tsx` اضافه و در Runtime مرورگر فعال شد.
- [x] Bridge در `app/layout.tsx` پیش از محتوای صفحه Mount شد.
- [x] Proxy مسیر `/chakod-api` به `https://api.chakod.com` در `vite.windows.config.ts` اضافه و در Runtime مرورگر استفاده شد.
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
- [x] Vite با `npm.cmd run dev` دوباره اجرا شد و نسخه `8.0.13` در `1568ms` روی `http://127.0.0.1:5173/` آماده شد.
- [~] هشدار قدیمی و غیرمسدودکننده Node با کد `DEP0205` هنگام Startup همچنان مشاهده شد.
- [x] صفحه اصلی پس از Hard Reload در مرورگر Render شد.
- [x] کارت های خودرو و داده های Listing در صفحه اصلی نمایش داده شدند؛ بنابراین مسیر Runtime برای داده های عمومی حداقل در این بخش پاسخ داده است.
- [~] زمان Render صفحه ناپایدار بود: دو درخواست نخست `96.1s` و `104.1s`، سپس `21.9s` و در اجرای گرم تر `1.1s` ثبت شد.
- [x] Console تایید کرد درخواست های قبلی CORS اکنون از Origin محلی و مسیر `/chakod-api` عبور می کنند و هیچ خطای CORS مربوط به `api.chakod.com` باقی نمانده است.
- [!] سه درخواست Proxy شده در Console پاسخ ناموفق گرفتند: یک پاسخ `502 Bad Gateway` و دو پاسخ `522`؛ این خطاها CORS نیستند.
- [!] ترمینال Vite قطع اتصال TLS و `socket hang up` را برای `save-listing.php` و `listings.php` ثبت کرد؛ مشکل باقی مانده در مسیر شبکه یا پایداری Upstream است.
- [x] پنج هشدار preload به صورت جداگانه ثبت شدند و با خطاهای CORS مخلوط نشدند.
- [x] تست مستقیم HTTPS به Upstream از PowerShell اجرا شد: درخواست اول `522` و درخواست بلافاصله بعدی `200 OK` با JSON معتبر و ۱۰ Listing برگشت؛ در نتیجه ناپایداری مستقیما در خود مسیر Upstream/Cloudflare نیز مشاهده شد و منحصر به Vite Proxy نیست.
- [~] خطای `curl: (6) Could not resolve host: curl.exe` ناشی از دوبار چسبیدن دستور در همان خط بود و به وضعیت API ارتباطی ندارد.
- [x] تست مستقیم مسیر Proxy محلی `/chakod-api` اجرا شد و پاسخ واقعی `522` Cloudflare را برگرداند؛ بنابراین مسیر Vite Proxy فعال است و پاسخ Upstream را عبور می دهد.
- [!] در نخستین تست مستقیم Proxy محلی پاسخ موفق `200` دریافت نشد؛ برای ثبت عبور موفق JSON از Proxy یک تکرار کنترل شده لازم است.
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

## نتیجه اجرای Vite پس از پچ

```text
Command: npm.cmd run dev
Vite: 8.0.13
Ready_ms: 1568
Local_url: http://127.0.0.1:5173/
Warning: DEP0205 module.register() deprecation; non-blocking
```

## شواهد Runtime صفحه اصلی

```text
Route: /
Render: success
Listings data: visible
Local bridge path: /chakod-api
CORS errors for api.chakod.com: none observed
Remaining red errors: upstream 502 and 522 responses through local proxy
Preload warnings: 5
Observed render times: 96.1s, 104.1s, 21.9s, 1.1s
```

## لاگ Runtime Proxy

```text
GET / 200 in 96.1s
GET / 200 in 104.1s
GET / 200 in 21.9s
GET / 200 in 1.1s

/api/save-listing.php?listing_id=2
Client network socket disconnected before secure TLS connection was established

/api/listings.php?limit=50&sort=vip
Client network socket disconnected before secure TLS connection was established

/api/listings.php?limit=100&sort=vip
socket hang up

/api/save-listing.php?listing_id=10
Client network socket disconnected before secure TLS connection was established
```

## تست مستقیم Upstream

```text
Command: curl.exe -sS --connect-timeout 15 --max-time 30 -D - -o NUL "https://api.chakod.com/api/listings.php?limit=50&sort=vip"
Attempt 1: HTTP 522 from Cloudflare
Attempt 2: HTTP 200 OK
Payload: success=true, total=10, data and facets returned
Conclusion: Upstream/Cloudflare is intermittently unstable; the failure is not limited to the local Vite proxy
```

## تست مستقیم Proxy محلی

```text
Command: curl.exe -sS --connect-timeout 15 --max-time 30 -D - -o NUL "http://127.0.0.1:5173/chakod-api/api/listings.php?limit=50&sort=vip"
Attempt 1: HTTP 522 from Cloudflare
Proxy path: active
Response propagation: upstream status and headers reached the local client
Conclusion: Vite proxy is functioning, while the upstream request was unsuccessful in this attempt
```

## وضعیت

```text
Status: پچ CORS محلی از نظر تست مستقل، Regression دسترسی، TypeScript، Startup، Runtime مرورگر و فعال بودن مسیر Proxy موفق است؛ ناپایداری 522/TLS مستقیما در Upstream/Cloudflare تایید شده است. در انتظار یک تکرار کنترل شده برای ثبت پاسخ 200 از مسیر Proxy محلی و سپس به روزرسانی اسناد اصلی پروژه
Published commit: هنوز ادغام نشده
```
