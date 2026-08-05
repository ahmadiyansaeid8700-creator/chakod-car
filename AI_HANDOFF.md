# AI Handoff — Chakod

این فایل نقطه شروع قطعی برای ادامه پروژه در هر چت یا سیستم جدید است. پروژه از صفر شروع نمی‌شود و ادامه کار فقط براساس کد و اسناد موجود در GitHub انجام می‌شود.

## هویت محصول

```text
نام فارسی: چاکود
نام لاتین: Chakod
شعار: پلتفرم رشد کسب و کار
Repository: ahmadiyansaeid8700-creator/chakod-car
Base branch: backup-latest-2026-08-03
Current launch branch: agent/launch-3-local-baseline
Main branch: تا Build تولید و تایید صریح مالک تغییر نکند
```

تصویر سه‌بعدی بنفش ارسال‌شده توسط مالک، مرجع هویت بصری لانچ است. استفاده نهایی آن در Open Graph و Assetهای انتشار هنوز انجام نشده است.

## وضعیت قطعی مراحل قبلی

### مرحله ۲ — ممیزی و تثبیت مسیرها

- [x] مسیرهای عمومی خودرو روی `/cars/*` تثبیت شدند.
- [x] ثبت و مدیریت آگهی روی `/account/listings/*` تثبیت شد.
- [x] مسیرهای قدیمی Redirect شدند.
- [x] صفحه 404 و مسیر `/dealerships` اضافه شدند.
- [x] کنترل اولیه مسیرهای `/admin/*` و `/dealers/*` اضافه شد.

### AI-1 — هسته مستقل دستیار

- [x] هسته آفلاین Rule-based اضافه و تست شد.
- [x] Fallback هنگام نبود کلید یا خرابی مدل ابری اضافه شد.
- [x] PR شماره ۲ در شاخه مبنا ادغام شد.

### Launch-1 — استارت اولیه محلی

- [x] `npm ci`، TypeScript محدوده Launch، ESLint و ۲۷ تست موفق شدند.
- [x] مسیرهای `/`، `/cars` و `/login` در CI بالا آمدند.
- [x] PR شماره ۳ در شاخه مبنا ادغام شد.

### Launch-2 — Affiliate TypeScript

- [x] خطاهای `HeadersInit` پنل کاربر و ادمین Affiliate رفع شدند.
- [x] TypeScript اختصاصی Affiliate و ۲۷ تست Regression موفق شدند.
- [x] PR شماره ۴ و مستندات PR شماره ۵ در شاخه مبنا ادغام شدند.
- [x] آخرین Commit مبنای پیش از Launch-3: `e60973bcc149559994cc859f87d7f980c8667f0c`.

## Launch-3 — وضعیت جلسه 2026-08-06

### آماده‌سازی لپ‌تاپ

- [x] Git `2.55.0.windows.2` تایید شد.
- [x] Node.js `v26.4.0` تایید شد.
- [x] npm `11.17.0` با `npm.cmd` تایید شد.
- [x] شاخه مبنا با Fast-forward تا `e60973b` دریافت شد.
- [x] `npm.cmd ci` موفق شد و ۵۲۸ پکیج نصب شدند.
- [x] شاخه `agent/launch-3-local-baseline` روی GitHub و لپ‌تاپ ساخته و فعال شد.

### اجرای محلی و Smoke Test تصویری

- [x] Vite `8.0.13` در `948ms` روی `http://127.0.0.1:5173/` بالا آمد.
- [x] صفحه اصلی `/` باز شد.
- [x] لوگوی چاکود و شعار `پلتفرم رشد کسب و کار` در صفحه اصلی مشاهده شدند.
- [x] `/cars` در Chrome و زوم ۱۰۰ درصد باز شد؛ کارت‌ها و پنل فیلتر رندر شدند.
- [x] `/login` باز شد؛ فرم شماره موبایل و پذیرش قوانین رندر شدند.
- [x] `/account/affiliate` باز شد و فرم Affiliate رندر شد.
- [x] کاربر آزمایشی عادی نتوانست `/admin/affiliate` را باز کند.
- [x] مهمان واقعی در Incognito نیز نتوانست `/admin/affiliate` را باز کند.

### ایرادهای قطعی پیدا شده

- [!] پنل `/account/affiliate` پیام `دریافت اطلاعات انجام نشد` نشان داد؛ اتصال API، Session یا محیط Local باید بررسی شود.
- [!] مهمان `/admin/affiliate` به اشتباه به `/` Redirect شد، نه `/login`.
- [!] دکمه `ورود آزمایشی لوکال` باید قبل از Production غیرفعال یا از خروجی تولید حذف شود.
- [~] بیشتر کارت‌های `/cars` تصویر Placeholder دارند.
- [~] متن فارسی و انگلیسی بعضی کارت‌ها و RTL یکدست نیست.
- [~] انتهای Grid خودروها برای تعداد فرد فضای خالی زیاد دارد.
- [~] هشدار Node `DEP0205 module.register()` هنگام اجرای Vite دیده شد.

## پچ جاری — Admin guest redirect

### علت

`app/admin/layout.tsx` تمام هویت‌های غیرادمین را بدون تفکیک به `/` می‌فرستاد.

### پیاده‌سازی روی GitHub

- [~] تصمیم سه‌حالته `allow | login | home` در `lib/route-access.ts` اضافه شد.
- [~] مهمان به `/login?returnTo=%2Fadmin` منتقل می‌شود.
- [~] کاربر واردشده ولی غیرادمین به `/` برمی‌گردد.
- [~] تست Regression سه حالت به `tests/route-access.test.mjs` اضافه شد.
- [~] `app/admin/layout.tsx` از تصمیم جدید استفاده می‌کند.

```text
Implementation commits:
bf4e9b563bb3b9ff1ec0f97981145f4ff7d78a52
68a016e27d2e1d3916a4ece57a3cb4d2000bf38f
f8fa8cb82ed05fc031f3be6aa06c7c17bce4f1f4
Checklist commit:
b4acbe4d8e141888cf47366e378e0fe639fbccda
Rollback point:
3be38a804d6639e863c5f0b7f562566f4d7d130b
```

این پچ هنوز روی لپ‌تاپ Pull و تست نشده است؛ بنابراین موارد آن `[~]` هستند و نباید تکمیل‌شده اعلام شوند.

## اسناد مرجع Launch-3

1. `AI_HANDOFF.md`
2. `docs/GO-LIVE-CHECKLIST-FA.md`
3. `docs/LAUNCH-3-ADMIN-REDIRECT-CHECKLIST-FA.md`
4. `PROJECT_CONTEXT.md`
5. `TODO.md`
6. `docs/MASTER-SITEMAP-FA.md`
7. `docs/PROJECT-CHECKLIST-FA.md`
8. `package.json`

## نقطه ادامه دقیق جلسه بعد

در PowerShell داخل VS Code و مسیر زیر کار را ادامه بده:

```text
C:\Users\Computer Bartar\chakod-car
```

اگر Vite هنوز باز است، ابتدا در همان ترمینال `Ctrl + C` بزن. سپس:

```powershell
git status
git pull --ff-only origin agent/launch-3-local-baseline
node --test tests/route-access.test.mjs
npx.cmd tsc --noEmit -p tsconfig.launch.json
npm.cmd run dev
```

بعد در Incognito این مسیر را تست کن:

```text
http://127.0.0.1:5173/admin/affiliate
```

نتیجه مورد انتظار:

```text
http://127.0.0.1:5173/login?returnTo=%2Fadmin
```

سپس کاربر آزمایشی عادی باید همچنان از `/admin/affiliate` به `/` برگردد. فقط بعد از موفقیت تست خودکار و هر دو Smoke Test، موارد پچ با `[x]` علامت بخورند.

## موانع اصلی تا Go-Live

- [!] Build تولید Cloudflare هنوز به `.openai/hosting.json` و `build/sites-vite-plugin` محیط میزبانی وابسته است.
- [ ] دو import تست با پسوند `.ts` تعیین تکلیف نشده‌اند.
- [ ] پنج Warning قدیمی ESLint Affiliate باقی مانده‌اند.
- [ ] گزارش ۱۸ آسیب‌پذیری npm باید بدون `npm audit fix --force` تحلیل شود.
- [ ] جریان‌های واقعی ورود، Session، ثبت آگهی، تصویر، ویرایش، حذف و مدیریت ادمین تست نشده‌اند.
- [ ] Staging، دیتابیس D1، Migration، Backup، Rollback، دامنه، SSL و مانیتورینگ تایید نشده‌اند.
- [ ] SEO، Open Graph با لوگوی مرجع، موبایل و مرورگرهای مختلف کامل بررسی نشده‌اند.

## قواعد غیرقابل تغییر

- پروژه از صفر بازسازی نشود.
- هر پچ کوچک، مستقل، قابل بازگشت و مستند باشد.
- هر مورد فقط پس از تست واقعی `[x]` شود.
- مورد پیاده‌سازی‌شده ولی تست‌نشده `[~]` بماند.
- مورد مسدود `[!]` ثبت شود.
- `main` بدون Build تولید و تایید صریح مالک تغییر نکند.
- Secret، Token، رمز، فایل محیطی و داده واقعی کاربر Commit نشود.

## زمان آخرین به‌روزرسانی

```text
2026-08-06 03:11 +03:30 — پایان جلسه Launch-3 و ثبت نقطه ادامه
```
