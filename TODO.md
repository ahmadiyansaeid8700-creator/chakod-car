# TODO — Chakod

## وضعیت جاری

```text
Project: chakod-car
Working branch: backup-latest-2026-08-03
Latest known commit before this update: 3aa99783704055c6c85bf8900d15bb71768ceb2c
Current phase: Launch-1 تکمیل‌شده؛ آماده توسعه روزانه
```

## انجام‌شده

### مرحله ۲ — ممیزی و تثبیت مسیرها

- [x] ممیزی تمام صفحات، APIها، لینک‌ها و Redirectها
- [x] اصلاح امن `returnTo` ورود
- [x] محافظت مسیرهای `/admin/*` و `/dealers/*`
- [x] تثبیت مسیرهای عمومی خودرو روی `/cars/*`
- [x] تثبیت ثبت و مدیریت آگهی روی `/account/listings/*`
- [x] Redirect مسیرهای قدیمی خودرو و آگهی
- [x] صفحه استاندارد 404

### AI-1 — هسته مستقل

- [x] هسته Rule-based مستقل
- [x] fallback هنگام نبود یا خرابی مدل ابری
- [x] پاسخ و Actionهای محدود به داده و مسیر واقعی
- [x] جلوگیری از دریافت اطلاعات حساس
- [x] پنج تست AI، ESLint و TypeScript اختصاصی
- [x] ادغام PR شماره ۲ با Commit `dc3174352d5c1cae46c085dc65bbd5956a9a2e63`

### Launch-1 — استارت اولیه محلی

- [x] ساخت `tsconfig.launch.json`
- [x] افزودن نوع‌های Cloudflare Runtime
- [x] نصب موفق با `npm ci`
- [x] TypeScript اولیه موفق
- [x] ۱۹ تست JavaScript موفق
- [x] ۸ تست TypeScript AI و Moderation موفق
- [x] ESLint موفق
- [x] اجرای موفق `npm run dev`
- [x] پاسخ موفق `/`، `/cars` و `/login`
- [x] توقف صحیح فرایند تست
- [x] ادغام PR شماره ۳ با Commit `375deff98d4d73f11cf630778a0d384b61d4b5a8`
- [x] ثبت کامل نتیجه در `docs/INITIAL-LAUNCH-CHECKLIST-FA.md`

## اقدام بعدی — Launch-2

### اولویت ۱: TypeScript بخش Affiliate

- [ ] ساخت شاخه مستقل Launch-2
- [ ] اصلاح نوع `tokenHeaders` در پنل کاربر Affiliate
- [ ] اصلاح نوع `tokenHeaders` در پنل مدیریت Affiliate
- [ ] حذف خطاهای HeadersInit بدون کاهش `strict`
- [ ] اجرای TypeScript سراسری و ثبت خطاهای باقی‌مانده
- [ ] اجرای تست و ESLint فایل‌های درگیر
- [ ] ساخت PR مستقل و ثبت نتیجه در چک‌لیست

### اولویت ۲: امنیت وابستگی‌ها

- [x] ثبت گزارش اولیه: ۱۸ آسیب‌پذیری شامل ۱ کم، ۴ متوسط و ۱۳ بالا
- [ ] اجرای `npm audit --json` در CI و ذخیره خلاصه غیرحساس
- [ ] تفکیک آسیب‌پذیری مستقیم و انتقالی
- [ ] رفع موارد بدون Breaking Change
- [ ] ممنوعیت `npm audit fix --force` بدون بررسی دستی
- [ ] اجرای مجدد تست و استارت محلی پس از هر تغییر وابستگی

### اولویت ۳: Build تولید Cloudflare

- [!] `.openai/hosting.json` باید توسط محیط میزبانی فراهم شود.
- [!] `build/sites-vite-plugin` باید توسط محیط میزبانی فراهم شود.
- [ ] تأیید وجود پیش‌نیازها بدون Commit فایل‌های محلی
- [ ] اجرای `npm run build` در محیط واقعی Cloudflare
- [ ] ثبت Commit سالم و نقطه بازگشت
- [ ] بررسی دامنه و مسیرهای اصلی پس از استقرار

## قواعد روزانه

- [ ] هر روز فقط یک پچ اصلی انتخاب شود.
- [ ] قبل از تغییر، فاز، فایل‌ها، مسیرها و نقطه بازگشت ثبت شوند.
- [ ] هر مورد کامل‌شده همان روز با `[x]` در چک‌لیست ثبت شود.
- [ ] مورد تست‌نشده `[~]` و مورد مسدود `[!]` باقی بماند.
- [ ] هر پچ پس از تست در PR مستقل ادغام شود.
- [ ] `main` تا تأیید Build تولید تغییر نکند.
- [ ] Secret، فایل محیطی یا داده واقعی کاربر Commit نشود.

## قالب نتیجه روزانه

```text
Date:
Phase:
Patch:
Completed:
Tests:
Published commit:
Open blockers:
Next action:
```
