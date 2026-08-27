# TODO — Chakod

## وضعیت جاری

Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: تثبیت Backend و توسعه مرحله‌ای Chakod AI Manager جدید بدون وابسته‌کردن هسته سایت به AI

## انجام‌شده

### مسیرها و دسترسی

- [x] اصلاح امن returnTo ورود
- [x] محافظت مسیرهای /admin/* و /dealers/*
- [x] تثبیت مسیرهای عمومی خودرو روی /cars/*
- [x] تثبیت ثبت و مدیریت آگهی روی /account/listings/*
- [x] Redirect مسیرهای قدیمی خودرو و آگهی
- [x] صفحه استاندارد 404

### Legacy AI cleanup

- [x] حذف ChakodAiAssistant از RootLayout و تمام صفحات سایت.
- [x] حذف UI/CSS دستیار گفتگویی قدیمی.
- [x] حذف /api/ai/assistant و lib/ai-assistant/*.
- [x] حذف تست، Workflow و مستندات Assistant قدیمی.
- [x] حذف app/chatgpt-auth.ts مربوط به OpenAI/Vinext starter.
- [x] حذف AI_HANDOFF.md قدیمی و متناقض با وضعیت فعلی.
- [x] جایگزینی README قدیمی vinext-starter با README واقعی چاکود.
- [x] حذف examples/d1 نمونه Scaffold.
- [x] حذف app/submit/page.before-cover-fix.tsx و app/submit/page.before-dealer-select-fix.tsx.
- [x] حذف INSTALL-FA.txt و LOCALHOST-FA.txt قدیمی.
- [x] حفظ ai-moderation و تست Policy آن برای بررسی آگهی.

### Chakod AI Manager — Foundation v0.1

- [x] تعریف Provider روی disabled | openai | local.
- [x] Feature Flag با حالت پیش‌فرض غیرفعال.
- [x] Mode فاز اول read_suggest.
- [x] ممنوعیت Write Action خودکار در Contract.
- [x] Status غیرمحرمانه Manager.
- [x] GET /api/ai/manager/status فقط برای نشست معتبر ادمین.
- [x] تست Config و fail-closed behavior.
- [x] Workflow اولیه برای تست AI Manager به‌روز شده است.
- [x] docs/CHAKOD-AI-MANAGER-FA.md اضافه شده است.
- [~] اجرای واقعی Regression/CI هنوز باید تأیید شود.

## اقدام‌های باز فوری

### Backend / Hosting

- [ ] ساخت یا بازیابی امن chakod-private/secrets.php خارج از Document Root.
- [ ] تکمیل تنظیمات دیتابیس بدون ثبت در Git.
- [ ] تکمیل Kavenegar API Key و Verify Template بدون ثبت در Git.
- [ ] تست اتصال دیتابیس.
- [ ] تست OTP ورود.
- [ ] شناسایی و استقرار تمام PHP endpointهای موردنیاز نسخه فعلی.
- [ ] Smoke Test ورود، پروفایل، آگهی و آپلود تصویر.

### AI Manager جدید

- [ ] اجرای Regression Test برای Foundation و Cleanup.
- [ ] ساخت Provider Adapter مشترک با Timeout و Failure isolation.
- [ ] ساخت Tool Registry فقط برای APIهای Read-only تأییدشده چاکود.
- [ ] تعریف Audit event بدون Secret/Token.
- [ ] اضافه‌کردن /admin/ai فقط بعد از آماده‌شدن APIهای پایه و تست دسترسی.
- [ ] تعریف Human Approval برای هر Write Action احتمالی آینده.
- [ ] Chatbot سراسری بدون نیاز محصول دوباره ساخته نشود.

### Legacy / clutter audit

- [ ] فایل‌های عمومی قدیمی یا Placeholder فقط پس از اثبات بلااستفاده بودن بررسی و حذف شوند.
- [ ] فایل‌های صفر بایت، assetهای Starter و مسیرهای نسخه‌ای/پشتیبان دوباره جست‌وجو شوند.
- [ ] هیچ فایل تاریخی داخل app/ به‌عنوان Backup نگهداری نشود؛ تاریخچه باید در Git باشد.

### امنیت وابستگی‌ها

- [ ] اجرای npm audit --json در محیط کنترل‌شده و ثبت خلاصه غیرحساس.
- [ ] تفکیک آسیب‌پذیری مستقیم و انتقالی.
- [ ] رفع موارد بدون Breaking Change.
- [ ] ممنوعیت npm audit fix --force بدون بررسی دستی.

### Build تولید Cloudflare

- [ ] اجرای npm run build در محیط واقعی Cloudflare پس از فراهم‌شدن پیش‌نیازها.
- [ ] بررسی دامنه و مسیرهای اصلی پس از استقرار.

## قواعد روزانه

- [ ] هر بار فقط یک پچ اصلی انتخاب شود.
- [ ] قبل از تغییر، فاز، فایل‌ها، مسیرها و نقطه بازگشت ثبت شوند.
- [ ] Secret، فایل محیطی واقعی یا داده واقعی کاربر Commit نشود.
- [ ] main تا تأیید صریح مالک تغییر نکند.
- [ ] پس از پچ مهم، PROJECT_CONTEXT.md و TODO.md به‌روز شوند.
