# چک‌لیست Launch-2 — TypeScript همکاری در فروش

> هدف این پچ حذف خطاهای `HeadersInit` در پنل کاربر و پنل مدیریت Affiliate بدون کاهش سخت‌گیری TypeScript و بدون تغییر رفتار Runtime است.

## وضعیت

```text
Phase: Launch-2 — تکمیل‌شده
Working branch: backup-latest-2026-08-03
Base branch: backup-latest-2026-08-03
Pull Request: #4 — ادغام‌شده
Published commit: 7fa2c8d8c1b851042d441e80b0d9179a76b8f2ee
Final CI Run: 31047552740 — موفق
Rollback point: b8fe5125c661a859a86c5dc455ee92e54f786eca
```

## کد

- [x] شاخه مستقل Launch-2 ساخته شد.
- [x] نوع خروجی `tokenHeaders` در پنل کاربر به `Record<string, string>` محدود شد.
- [x] نوع خروجی `tokenHeaders` در پنل مدیریت به `Record<string, string>` محدود شد.
- [x] هیچ گزینه سخت‌گیری TypeScript غیرفعال نشد.
- [x] Workflow موقت اعمال پچ پس از استفاده حذف شد.
- [x] پیکربندی `tsconfig.affiliate.json` برای تست متمرکز اضافه شد.
- [x] اعلان استاندارد `*.module.css` برای TypeScript متمرکز اضافه شد.

## کنترل کیفیت

- [x] نصب قفل‌شده وابستگی‌ها با `npm ci` موفق شد.
- [x] TypeScript اختصاصی Affiliate بدون خطا اجرا شد.
- [x] ESLint پچ Affiliate با صفر خطا اجرا شد؛ ۵ هشدار قدیمی ثبت و از این پچ جدا نگه داشته شدند.
- [x] TypeScript سراسری اجرا شد و هیچ خطای Affiliate در خروجی وجود نداشت.
- [x] ۲۷ تست پایه مسیرها، دسترسی، AI و Moderation بدون Regression موفق شدند.
- [x] Workflow عمومی Initial Launch Readiness نیز دوباره موفق شد.

## اجرای محلی

- [x] سرور توسعه بالا آمد.
- [x] مسیر `/account/affiliate` پاسخ HTTP `200` داد.
- [x] مسیر `/admin/affiliate` برای کاربر مهمان Redirect امن HTTP `307` داد.
- [x] فرایند سرور پس از Smoke Test به‌درستی متوقف شد.

## انتشار

- [x] Pull Request مستقل Launch-2 با شماره ۴ ساخته شد.
- [x] GitHub Actions Run شماره `31047367901` موفق شد.
- [x] Pull Request شماره ۴ با Commit `7fa2c8d8c1b851042d441e80b0d9179a76b8f2ee` در `backup-latest-2026-08-03` ادغام شد.
- [x] نتیجه نهایی در `PROJECT_CONTEXT.md` و `TODO.md` ثبت شد.

## بدهی‌های فنی ثبت‌شده و خارج از این پچ

- [!] پنج هشدار قدیمی ESLint شامل dependencyهای Effect و متغیر استفاده‌نشده در پچ جداگانه اصلاح می‌شوند.
- [!] TypeScript سراسری فقط چهار خطای غیر Affiliate گزارش می‌کند: دو import تست با پسوند `.ts` و دو وابستگی محیط Build در `vite.config.ts`.
- [!] خطاهای فایل‌های محیط Build تولید Cloudflare در این پچ اصلاح نمی‌شوند.
- [!] آسیب‌پذیری‌های npm در پچ امنیت وابستگی‌ها بررسی می‌شوند.
- [!] هیچ فایل Secret یا تنظیم محلی میزبانی Commit نمی‌شود.

## نتیجه Launch-2

- [x] خطاهای `HeadersInit` در هر دو پنل Affiliate رفع شدند.
- [x] شرط فنی TypeScript و اجرای محلی Affiliate تأیید شد.
- [x] Launch-2 بسته شد و پروژه برای پچ روزانه بعدی آماده است.

## شرط پایان

هر دو فایل Affiliate با TypeScript سخت‌گیرانه و ESLint پچ سبز باشند، TypeScript سراسری دیگر هیچ خطای Affiliate گزارش نکند و مسیرهای مربوط در اجرای محلی پاسخ امن بدهند.
