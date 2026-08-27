# TODO — Chakod

## وضعیت جاری

```text
Project: chakod-car
Working branch: backup-latest-2026-08-03
Current focus: تثبیت Backend و توسعه مرحله‌ای Chakod AI Manager جدید بدون وابسته‌کردن هسته سایت به AI
```

## انجام‌شده

### مرحله ۲ — ممیزی و تثبیت مسیرها

- [x] اصلاح امن `returnTo` ورود
- [x] محافظت مسیرهای `/admin/*` و `/dealers/*`
- [x] تثبیت مسیرهای عمومی خودرو روی `/cars/*`
- [x] تثبیت ثبت و مدیریت آگهی روی `/account/listings/*`
- [x] Redirect مسیرهای قدیمی خودرو و آگهی
- [x] صفحه استاندارد 404

### Launch-2 — Affiliate TypeScript

- [x] نوع هدرهای احراز هویت پنل کاربر Affiliate اصلاح شد.
- [x] نوع هدرهای احراز هویت پنل مدیریت Affiliate اصلاح شد.
- [x] TypeScript اختصاصی Affiliate موفق شد.
- [x] PR شماره ۴ با Commit `7fa2c8d8c1b851042d441e80b0d9179a76b8f2ee` ادغام شد.

### Legacy AI cleanup

- [x] حذف `ChakodAiAssistant` از RootLayout و تمام صفحات سایت.
- [x] حذف UI/CSS دستیار گفتگویی قدیمی.
- [x] حذف `/api/ai/assistant`.
- [x] حذف `lib/ai-assistant/*`.
- [x] حذف تست‌ها و Workflow اختصاصی دستیار قدیمی.
- [x] حذف مستندات اختصاصی نسخه قدیمی Assistant.
- [x] حذف تنظیمات محیطی اختصاصی Assistant از `.env.example`.
- [x] حفظ `ai-moderation` و تست Policy آن برای بررسی آگهی.

### Chakod AI Manager — Foundation v0.1

- [x] تعریف قرارداد Provider روی `disabled | openai | local`.
- [x] Feature Flag با حالت پیش‌فرض غیرفعال اضافه شد.
- [x] Mode فاز اول روی `read_suggest` قفل شد.
- [x] Write Action خودکار در Contract ممنوع شد.
- [x] Status غیرمحرمانه Manager پیاده‌سازی شد.
- [x] `GET /api/ai/manager/status` فقط برای نشست معتبر ادمین قابل مشاهده است.
- [x] وضعیت Moderation موجود بدون افشای Secret گزارش می‌شود.
- [x] تست Config و fail-closed behavior اضافه شد.
- [x] Workflow اولیه برای اجرای تست AI Manager به‌روز شد.
- [x] سند `docs/CHAKOD-AI-MANAGER-FA.md` اضافه شد.
- [~] اجرای واقعی Regression/CI این Foundation هنوز باید تأیید شود.

## اقدام‌های باز فوری

### Backend / Hosting

- [ ] ساخت یا بازیابی امن `/home/fqiradvr/chakod-private/secrets.php` خارج از Document Root.
- [ ] تکمیل `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` بدون ثبت در Git.
- [ ] تکمیل Kavenegar API Key و Verify Template بدون ثبت در Git.
- [ ] تست اتصال دیتابیس.
- [ ] تست OTP ورود.
- [ ] شناسایی و استقرار تمام PHP endpointهای موردنیاز نسخه فعلی در `api.chakod.com/api`.
- [ ] Smoke Test ورود، پروفایل، آگهی و آپلود تصویر.

### AI Manager جدید

- [ ] اجرای تست Foundation و تأیید عدم Regression.
- [ ] ساخت Provider Adapter مشترک با Timeout و Failure isolation.
- [ ] ساخت Tool Registry فقط برای APIهای Read-only تأییدشده چاکود.
- [ ] تعریف Audit event برای درخواست‌های مدیریتی بدون Secret/Token.
- [ ] اضافه‌کردن `/admin/ai` فقط بعد از آماده‌شدن APIهای پایه و تست دسترسی.
- [ ] تعریف سیاست Human Approval برای هر Write Action احتمالی آینده.
- [ ] Moderation موجود فقط در همان مرز مستقل فعلی حفظ شود مگر ادغام آن واقعاً لازم شود.
- [ ] Chatbot سراسری بدون نیاز محصول دوباره ساخته نشود.

### امنیت وابستگی‌ها

- [ ] اجرای `npm audit --json` در محیط کنترل‌شده و ثبت خلاصه غیرحساس.
- [ ] تفکیک آسیب‌پذیری مستقیم و انتقالی.
- [ ] رفع موارد بدون Breaking Change.
- [ ] ممنوعیت `npm audit fix --force` بدون بررسی دستی.

### Build تولید Cloudflare

- [!] `.openai/hosting.json` باید توسط محیط میزبانی فراهم شود.
- [!] `build/sites-vite-plugin` باید توسط محیط میزبانی فراهم شود.
- [ ] اجرای `npm run build` در محیط واقعی Cloudflare پس از فراهم‌شدن پیش‌نیازها.
- [ ] بررسی دامنه و مسیرهای اصلی پس از استقرار.

## قواعد روزانه

- [ ] هر بار فقط یک پچ اصلی انتخاب شود.
- [ ] قبل از تغییر، فاز، فایل‌ها، مسیرها و نقطه بازگشت ثبت شوند.
- [ ] Secret، فایل محیطی واقعی یا داده واقعی کاربر Commit نشود.
- [ ] `main` تا تأیید صریح مالک تغییر نکند.
- [ ] پس از پچ مهم، `PROJECT_CONTEXT.md` و `TODO.md` به‌روز شوند.
