# TODO — Chakod

## وضعیت جاری

Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: تثبیت Backend و توسعه مرحله‌ای Chakod AI Manager بدون وابسته‌کردن هسته سایت به AI

## انجام‌شده

### مسیرها و دسترسی

- [x] اصلاح امن returnTo ورود
- [x] محافظت مسیرهای /admin/* و /dealers/*
- [x] تثبیت مسیرهای عمومی خودرو روی /cars/*
- [x] تثبیت ثبت و مدیریت آگهی روی /account/listings/*
- [x] Redirect مسیرهای قدیمی خودرو و آگهی
- [x] صفحه استاندارد 404

### Legacy cleanup

- [x] حذف Assistant و ChatGPT starter قدیمی
- [x] حذف AI_HANDOFF قدیمی، examples/d1 و فایل‌های backup داخل app
- [x] حذف راهنماها و Assetهای Starter بلااستفاده
- [x] حفظ ai-moderation مستقل

### Chakod AI Manager

- [x] Foundation و قرارداد Provider
- [x] Feature Flag با حالت پیش‌فرض غیرفعال
- [x] Mode فعلی read_suggest
- [x] ممنوعیت Auto-write
- [x] Provider Adapter برای OpenAI و Local با Timeout و fail-closed
- [x] Local endpoint محدود به Loopback
- [x] Read-only Tool Registry با وضعیت available / registered / planned
- [x] Status API بدون افشای Secret
- [x] بازطراحی کامل /admin به‌عنوان Command Center
- [x] ساخت صفحه اختصاصی /admin/ai
- [x] نمایش Provider، Runtime، Registry، Guardrail و Human Approval در UI
- [~] Regression/CI برای این مرحله هنوز عمداً اجرا نشده است

## اقدام‌های باز فوری

### Backend / Hosting

- [ ] ساخت یا بازیابی امن chakod-private/secrets.php خارج از Document Root
- [ ] تکمیل تنظیمات دیتابیس بدون ثبت در Git
- [ ] تکمیل Kavenegar API Key و Verify Template بدون ثبت در Git
- [ ] تست اتصال دیتابیس
- [ ] تست OTP ورود
- [ ] استقرار تمام PHP endpointهای موردنیاز نسخه فعلی
- [ ] Smoke Test ورود، پروفایل، آگهی و آپلود تصویر

### AI Manager — مرحله بعد

- [ ] اجرای Regression Test برای Cleanup + Provider + Registry + Admin UI
- [ ] ساخت Executor برای Toolهای registered فقط روی APIهای Read-only تأییدشده
- [ ] اتصال listings_review_overview به Admin listings API
- [ ] اتصال businesses_overview به Admin businesses API
- [ ] اتصال commerce_health فقط به داده‌های غیرتغییردهنده
- [ ] تعریف Audit event بدون Secret/Token
- [ ] ساخت Suggestion endpoint پس از آماده‌شدن حداقل یک Tool واقعی
- [ ] تعریف Human Approval مستقل پیش از هر Write Action آینده

### امنیت وابستگی‌ها

- [ ] اجرای npm audit --json در محیط کنترل‌شده
- [ ] تفکیک آسیب‌پذیری مستقیم و انتقالی
- [ ] رفع موارد بدون Breaking Change
- [ ] ممنوعیت npm audit fix --force بدون بررسی دستی

### Build تولید Cloudflare

- [ ] اجرای npm run build در محیط واقعی Cloudflare پس از فراهم‌شدن پیش‌نیازها
- [ ] بررسی دامنه و مسیرهای اصلی پس از استقرار

## قواعد روزانه

- [ ] Secret، فایل محیطی واقعی یا داده واقعی کاربر Commit نشود
- [ ] main تا تأیید صریح مالک تغییر نکند
- [ ] هیچ فایل تاریخی به‌عنوان Backup داخل app نگهداری نشود؛ Git تاریخچه است
- [ ] نتیجه تست یا Build فقط بعد از اجرای واقعی موفق اعلام شود
