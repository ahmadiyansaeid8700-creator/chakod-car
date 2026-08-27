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

### Legacy cleanup

- [x] حذف Assistant قدیمی، Route و Library آن.
- [x] حذف ChatGPT/Vinext starter auth و اسناد قدیمی.
- [x] حذف AI_HANDOFF.md، examples/d1، فایل‌های page.before-* و راهنماهای نصب قدیمی.
- [x] جایگزینی README قدیمی با README واقعی چاکود.
- [x] حذف assetهای پیش‌فرض Next/Vercel و لوگوی صفر‌بایت.
- [x] حفظ assetهای واقعی برند و ai-moderation.

### Chakod AI Manager — Foundation v0.1

- [x] Provider contract روی disabled | openai | local.
- [x] Feature Flag پیش‌فرض غیرفعال.
- [x] Mode فاز اول read_suggest.
- [x] ممنوعیت Write Action خودکار.
- [x] GET /api/ai/manager/status فقط برای ادمین.

### Chakod AI Manager — Provider Adapter v0.2

- [x] Provider Adapter مشترک برای OpenAI و Local.
- [x] محدودیت اندازه Instruction و Input.
- [x] Timeout قابل تنظیم با Clamp بین ۱ تا ۳۰ ثانیه.
- [x] Failure isolation و خطاهای عمومی بدون نشت جزئیات داخلی.
- [x] OpenAI Responses API با `store: false`.
- [x] Model مستقل Manager با CHAKOD_AI_MANAGER_OPENAI_MODEL.
- [x] Local provider محدود به localhost/loopback.
- [x] تست Adapter برای Fail-closed، OpenAI، Local و Transport failure اضافه شد.
- [x] Workflow تست AI Manager برای Provider Adapter به‌روز شد.
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

- [ ] اجرای Regression Test برای Foundation، Cleanup و Provider Adapter.
- [ ] ممیزی APIهای Read-only موجود و انتخاب فقط Endpointهای قابل اعتماد.
- [ ] ساخت Read-only Tool Registry بدون دسترسی Write.
- [ ] تعریف Audit event بدون Secret/Token.
- [ ] اضافه‌کردن /admin/ai فقط بعد از آماده‌شدن APIهای پایه و تست دسترسی.
- [ ] تعریف Human Approval برای هر Write Action احتمالی آینده.
- [ ] Chatbot سراسری بدون نیاز محصول دوباره ساخته نشود.

### Legacy / clutter audit

- [x] فایل‌های صفر‌بایت شناخته‌شده و assetهای Starter اصلی پاک‌سازی شدند.
- [ ] سایر Placeholderها یا assetهای تکراری فقط پس از اثبات بلااستفاده بودن حذف شوند.
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
