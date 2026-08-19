# استقرار چاکود روی cPanel برای تست

این راهنما مخصوص Branch زیر است:

`agent/launch-3-local-baseline`

## پیش‌نیاز

- Node.js 22.13 یا جدیدتر
- cPanel با Setup Node.js App / Application Manager یا امکان اجرای Node.js با Passenger
- Terminal یا SSH کاربر cPanel
- یک دامنه یا ساب‌دامین تست

## 1) ساخت برنامه Node.js در cPanel

در cPanel به Software > Setup Node.js App بروید و یک برنامه بسازید:

- Node.js version: 22
- Application mode: Production
- Application root: `chakod-test`
- Application URL: دامنه یا ساب‌دامین تست
- Application startup file: `app.cjs`

اگر پنل Startup File با پسوند `.cjs` را قبول نکرد، موقتاً `app.cjs` را نگه دارید و از پشتیبانی هاست بخواهید PassengerStartupFile را روی `app.cjs` قرار دهد.

## 2) دریافت سورس از GitHub

در Terminal cPanel:

```bash
cd ~
rm -rf chakod-test
git clone --branch agent/launch-3-local-baseline --single-branch https://github.com/ahmadiyansaeid8700-creator/chakod-car.git chakod-test
cd chakod-test
```

اگر Repository خصوصی است، از GitHub Deploy Key یا Personal Access Token مخصوص Read-only استفاده کنید و توکن را داخل فایل پروژه ذخیره نکنید.

## 3) نصب پکیج‌ها

اگر Setup Node.js App برای پروژه virtual environment ساخته، ابتدا دستور Activate Environment نمایش‌داده‌شده در همان صفحه را اجرا کنید.

سپس:

```bash
cd ~/chakod-test
npm ci
```

## 4) Build مخصوص cPanel

```bash
npm run build:cpanel
```

بعد از Build باید پوشه `dist/` ایجاد شده باشد.

## 5) متغیرهای محیطی

برای تست پایه سایت، API چاکود به‌صورت پیش‌فرض روی `https://api.chakod.com` قرار دارد.

متغیرهای محرمانه را فقط از بخش Environment Variables برنامه Node.js در cPanel وارد کنید. فایل `.env` حاوی Secret را Commit نکنید.

حداقل:

```text
NODE_ENV=production
HOST=127.0.0.1
```

`PORT` را اگر Passenger خودش مدیریت می‌کند دستی ست نکنید.

## 6) Restart

در Setup Node.js App روی Restart بزنید.

اگر از Application Manager/Passenger معمولی استفاده می‌کنید:

```bash
cd ~/chakod-test
mkdir -p tmp
touch tmp/restart.txt
```

## 7) تست اولیه

ابتدا صفحه اصلی دامنه تست را باز کنید، سپس:

```text
/account
/account/listings
/account/listings/18/images
```

آپلود 1 عکس و سپس 6 عکس را تست کنید.

## 8) آپدیت نسخه تست

برای گرفتن آخرین تغییرات Branch:

```bash
cd ~/chakod-test
git fetch origin
git reset --hard origin/agent/launch-3-local-baseline
npm ci
npm run build:cpanel
mkdir -p tmp
touch tmp/restart.txt
```

یا از دکمه Restart داخل Setup Node.js App استفاده کنید.

## عیب‌یابی

اگر برنامه بالا نیامد:

```bash
node -v
npm -v
ls -la dist
node app.cjs
```

و Passenger/Application log را از cPanel بررسی کنید.

اگر خطای `ERR_REQUIRE_ESM` دیدید، Startup File باید `app.cjs` باشد؛ این فایل عمداً CommonJS است و Vinext را با dynamic import اجرا می‌کند.
