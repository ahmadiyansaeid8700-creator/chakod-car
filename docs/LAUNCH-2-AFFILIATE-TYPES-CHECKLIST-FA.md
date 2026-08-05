# چک‌لیست Launch-2 — TypeScript همکاری در فروش

> هدف این پچ حذف خطاهای `HeadersInit` در پنل کاربر و پنل مدیریت Affiliate بدون کاهش سخت‌گیری TypeScript و بدون تغییر رفتار Runtime است.

## وضعیت

```text
Phase: Launch-2
Working branch: agent/launch-2-affiliate-types
Base branch: backup-latest-2026-08-03
Rollback point: b8fe5125c661a859a86c5dc455ee92e54f786eca
```

## کد

- [x] شاخه مستقل Launch-2 ساخته شد.
- [x] نوع خروجی `tokenHeaders` در پنل کاربر به `Record<string, string>` محدود شد.
- [x] نوع خروجی `tokenHeaders` در پنل مدیریت به `Record<string, string>` محدود شد.
- [x] هیچ گزینه سخت‌گیری TypeScript غیرفعال نشد.
- [x] Workflow موقت اعمال پچ پس از استفاده حذف شد.
- [x] پیکربندی `tsconfig.affiliate.json` برای تست متمرکز اضافه شد.

## کنترل کیفیت

- [ ] نصب قفل‌شده وابستگی‌ها با `npm ci` موفق شود.
- [ ] TypeScript اختصاصی Affiliate بدون خطا اجرا شود.
- [ ] ESLint دو فایل Affiliate بدون خطا اجرا شود.
- [ ] TypeScript سراسری اجرا و نبود خطای Affiliate در خروجی تأیید شود.
- [ ] تست‌های پایه مسیرها، دسترسی و AI بدون Regression اجرا شوند.

## اجرای محلی

- [ ] سرور توسعه بالا بیاید.
- [ ] مسیر `/account/affiliate` پاسخ HTTP معتبر بدهد.
- [ ] مسیر `/admin/affiliate` برای کاربر مهمان پاسخ امن 2xx یا Redirect بدهد.
- [ ] فرایند سرور پس از Smoke Test به‌درستی متوقف شود.

## انتشار

- [ ] Pull Request مستقل Launch-2 ساخته شود.
- [ ] آخرین GitHub Actions Run موفق شود.
- [ ] Pull Request پس از موفقیت Checkها در `backup-latest-2026-08-03` ادغام شود.
- [ ] نتیجه نهایی در `PROJECT_CONTEXT.md` و `TODO.md` ثبت شود.

## موارد خارج از این پچ

- [!] خطاهای فایل‌های محیط Build تولید Cloudflare در این پچ اصلاح نمی‌شوند.
- [!] آسیب‌پذیری‌های npm در پچ امنیت وابستگی‌ها بررسی می‌شوند.
- [!] هیچ فایل Secret یا تنظیم محلی میزبانی Commit نمی‌شود.

## شرط پایان

هر دو فایل Affiliate با TypeScript سخت‌گیرانه و ESLint سبز باشند، TypeScript سراسری دیگر هیچ خطای Affiliate گزارش نکند و مسیرهای مربوط در اجرای محلی پاسخ امن بدهند.
