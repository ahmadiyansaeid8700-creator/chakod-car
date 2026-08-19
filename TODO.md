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

## Launch-2 — Affiliate TypeScript (تکمیل‌شده)

- [x] شاخه مستقل Launch-2 ساخته شد.
- [x] نوع هدرهای احراز هویت پنل کاربر Affiliate اصلاح شد.
- [x] نوع هدرهای احراز هویت پنل مدیریت Affiliate اصلاح شد.
- [x] TypeScript اختصاصی Affiliate موفق شد.
- [x] TypeScript سراسری بدون خطای Affiliate اجرا شد.
- [x] ۲۷ تست Regression موفق شدند.
- [x] Smoke Test مسیرهای Affiliate موفق شد.
- [x] PR شماره ۴ با Commit `7fa2c8d8c1b851042d441e80b0d9179a76b8f2ee` ادغام شد.
- [x] نتیجه در `docs/LAUNCH-2-AFFILIATE-TYPES-CHECKLIST-FA.md` ثبت شد.

### اقدام‌های باز بعد از Launch-2

- [ ] دو خطای import تست با پسوند `.ts` در پچ TypeScript مستقل تعیین تکلیف شوند.
- [ ] وابستگی‌های محیط Build در `vite.config.ts` فقط در محیط واقعی Cloudflare بررسی شوند.
- [ ] پنج هشدار قدیمی ESLint Affiliate در پچ مستقل اصلاح شوند.
- [ ] ۱۸ آسیب‌پذیری npm در پچ امنیت وابستگی‌ها و بدون `npm audit fix --force` بررسی شوند.

## Launch-3 — جلسه 2026-08-06

### وضعیت شاخه

```text
Base branch: backup-latest-2026-08-03
Launch branch: agent/launch-3-local-baseline
Base head: e60973bcc149559994cc859f87d7f980c8667f0c
Latest saved session handoff: f72d69dc5c171eaecc2cb23168ef30275b0443dc
Main: untouched
```

### آماده‌سازی و Smoke Test انجام‌شده

- [x] Git، Node.js و npm روی لپ‌تاپ تایید شدند.
- [x] شاخه مبنا Fast-forward شد.
- [x] `npm.cmd ci` با نصب ۵۲۸ پکیج موفق شد.
- [x] شاخه `agent/launch-3-local-baseline` فعال شد.
- [x] Vite روی `127.0.0.1:5173` بالا آمد.
- [x] `/` در Chrome باز و برند تایید شد.
- [x] `/cars` در زوم ۱۰۰ درصد باز شد.
- [x] `/login` در زوم ۱۰۰ درصد باز شد.
- [x] `/account/affiliate` رندر شد.
- [x] دسترسی کاربر عادی به `/admin/affiliate` مسدود شد.
- [x] دسترسی مهمان Incognito به `/admin/affiliate` مسدود شد.

### هویت برند

- [x] نام فارسی `چاکود` تایید شد.
- [x] نام لاتین `Chakod` تایید شد.
- [x] شعار `پلتفرم رشد کسب و کار` تایید شد.
- [~] تصویر سه‌بعدی بنفش به عنوان مرجع لوگو دریافت شد.
- [ ] Asset نهایی Open Graph و آیکن‌های لانچ از روی مرجع آماده شوند.

### ایرادهای ثبت‌شده

- [!] دریافت اطلاعات `/account/affiliate` در Local شکست خورد.
- [!] مهمان `/admin/affiliate` به `/` رفت، نه `/login`.
- [!] ورود آزمایشی لوکال باید پیش از Production غیرفعال شود.
- [~] کارت‌های `/cars` عمدتا Placeholder دارند.
- [~] زبان فارسی و انگلیسی و RTL بعضی کارت‌ها یکدست نیست.
- [~] Grid انتهای فهرست خودرو برای تعداد فرد فضای خالی زیاد دارد.
- [~] هشدار `DEP0205 module.register()` در اجرای Vite دیده شد.

## پچ فعال — Admin guest redirect

```text
Rollback point: 3be38a804d6639e863c5f0b7f562566f4d7d130b
Implementation commits:
bf4e9b563bb3b9ff1ec0f97981145f4ff7d78a52
68a016e27d2e1d3916a4ece57a3cb4d2000bf38f
f8fa8cb82ed05fc031f3be6aa06c7c17bce4f1f4
Checklist commit:
b4acbe4d8e141888cf47366e378e0fe639fbccda
```

- [~] تصمیم سه‌حالته `allow | login | home` پیاده‌سازی شده است.
- [~] مهمان به `/login?returnTo=%2Fadmin` هدایت می‌شود.
- [~] کاربر عادی واردشده به `/` برمی‌گردد.
- [~] تست Regression سه حالت اضافه شده است.
- [ ] آخرین Commitهای شاخه روی لپ‌تاپ Pull شوند.
- [ ] `node --test tests/route-access.test.mjs` اجرا شود.
- [ ] `npx.cmd tsc --noEmit -p tsconfig.launch.json` اجرا شود.
- [ ] Vite دوباره اجرا شود.
- [ ] مهمان Incognito از `/admin/affiliate` به `/login?returnTo=%2Fadmin` برسد.
- [ ] کاربر آزمایشی عادی همچنان از `/admin/affiliate` به `/` برگردد.
- [ ] Console و ترمینال برای خطای جدید بررسی شوند.
- [ ] پس از موفقیت واقعی، چک‌لیست پچ و Go-Live به `[x]` به‌روزرسانی شوند.
- [ ] PR مستقل Launch-3 فقط بعد از تست‌های موفق ساخته شود.

## نقطه شروع جلسه بعد

در PowerShell داخل VS Code و مسیر `C:\Users\Computer Bartar\chakod-car`:

```powershell
git status
git pull --ff-only origin agent/launch-3-local-baseline
node --test tests/route-access.test.mjs
npx.cmd tsc --noEmit -p tsconfig.launch.json
npm.cmd run dev
```

اولویت بعد از پایان پچ Redirect:

1. بررسی Network و Console خطای Affiliate.
2. تحلیل امن `npm audit`.
3. رفع دو import تست TypeScript.
4. آماده‌سازی محیط واقعی Build Cloudflare.
5. ادامه تست جریان‌های ورود، آگهی، تصویر، مدیریت و Staging.

## گزارش پایان جلسه

```text
Date: 2026-08-06 03:11 +03:30
Phase: Launch-3 — Local Baseline
Patch: Admin guest redirect
Completed: راه‌اندازی لپ‌تاپ، Smoke Test صفحات پایه، ثبت برند و کشف ایراد Redirect
Tests: تست تصویری انجام شد؛ تست خودکار پچ جدید هنوز اجرا نشده
Published state: تمام کد و مستندات جلسه روی agent/launch-3-local-baseline ذخیره شده‌اند
Open blockers: Affiliate API، Redirect تست‌نشده، Local login در Production، Build Cloudflare، امنیت وابستگی‌ها
Next action: Pull و تست پچ Admin guest redirect
```
