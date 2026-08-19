# Project Context — Chakod

## هویت پروژه

- **نام:** چاکود (`chakod-car`)
- **نوع محصول:** بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- **زبان و جهت رابط:** فارسی و RTL
- **اصل توسعه:** ادامه پروژه موجود؛ بازسازی از صفر و ایجاد مسیر موازی بدون تأیید ممنوع است.

## مخزن و شاخه کاری

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Latest known commit: 0da39d12692461c35d4d30504a15989a2bef4619
Main branch: مبنای توسعه جاری نیست
```

تا پیش از تأیید Build تولید، شاخه کاری با `main` ادغام نشود.

## وضعیت عملیاتی فعلی

### مرحله ۲ — پچ‌های پس از ممیزی

- [x] ممیزی کامل مسیرها، صفحات، لینک‌ها و دکمه‌ها انجام شد.
- [x] بازگشت امن ورود با `returnTo` اصلاح شد.
- [x] مسیرهای مدیریت برای کاربر عادی محافظت و پنهان شدند.
- [x] مسیرهای عمومی خودرو روی `/cars/*` تثبیت شدند.
- [x] مسیرهای ثبت و مدیریت آگهی روی `/account/listings/*` قرار دارند.
- [x] مسیرهای قدیمی خودرو و آگهی به مسیرهای اصلی Redirect می‌شوند.
- [x] صفحه 404 استاندارد و مسیر عمومی `/dealerships` وجود دارند.

### AI-1 — هسته مستقل دستیار

- [x] هسته Rule-based مستقل در `lib/ai-assistant/offline.ts` اضافه شد.
- [x] نبود کلید، Timeout یا خرابی مدل ابری به fallback مستقل منتهی می‌شود.
- [x] پاسخ داده‌محور فقط از داده رسمی چاکود ساخته می‌شود.
- [x] اطلاعات ورود، Token و داده کارت در گفتگو رد می‌شوند.
- [x] پنج تست AI مستقل، ESLint و TypeScript اختصاصی هسته موفق شدند.
- [x] Pull Request شماره ۲ با Commit `dc3174352d5c1cae46c085dc65bbd5956a9a2e63` ادغام شد.

### Launch-1 — استارت اولیه محلی

- [x] `tsconfig.launch.json` برای محدوده استارت اولیه اضافه شد.
- [x] نوع‌های حداقلی Cloudflare Runtime اضافه شدند.
- [x] نصب قفل‌شده با `npm ci` موفق شد.
- [x] TypeScript اولیه بدون خطا اجرا شد.
- [x] ۲۷ تست مسیرها، ورود، دسترسی، AI و Moderation موفق شدند.
- [x] ESLint فایل‌های پچ موفق شد.
- [x] سرور با `npm run dev` بالا آمد.
- [x] مسیرهای `/`، `/cars` و `/login` پاسخ HTTP موفق دادند.
- [x] Pull Request شماره ۳ با Commit `375deff98d4d73f11cf630778a0d384b61d4b5a8` ادغام شد.
- [x] چک‌لیست نهایی Launch-1 در `docs/INITIAL-LAUNCH-CHECKLIST-FA.md` ثبت شد.

## وضعیت Build و موانع باز

- Build تولید Cloudflare در محیط فاقد فایل‌های زیر قابل اجرا نیست:

```text
.openai/hosting.json
build/sites-vite-plugin
```

این فایل‌ها محلی و Git-ignored هستند و نباید برای رفع CI به مخزن Commit شوند.

- TypeScript بخش‌های Affiliate هنوز در پچ جداگانه نیازمند اصلاح است.
- گزارش `npm ci` شامل ۱۸ آسیب‌پذیری بود: ۱ کم، ۴ متوسط و ۱۳ بالا.
- هیچ `npm audit fix --force` اجرا نشده و نباید بدون تحلیل اثرات اجرا شود.

## اقدام بعدی

```text
Phase: Launch-2
Priority 1: اصلاح TypeScript بخش‌های Affiliate بدون کاهش strictness
Priority 2: تحلیل npm audit و رفع امن آسیب‌پذیری‌های قابل اصلاح
Priority 3: فراهم‌کردن پیش‌نیازهای محیط Cloudflare و تأیید Build تولید
```

هر کدام باید پچ، تست، PR و نقطه بازگشت مستقل داشته باشند.

## فناوری‌های مخزن

- Next.js 16 / App Router
- React 19
- TypeScript
- Vinext و Vite
- npm
- Cloudflare Workers / Pages و Wrangler
- Drizzle و D1
- CSS Modules و CSS عمومی

## اسناد مرجع و ترتیب اعتبار

1. `docs/MASTER-SITEMAP-FA.md`
2. `docs/PROJECT-CHECKLIST-FA.md`
3. `docs/INITIAL-LAUNCH-CHECKLIST-FA.md`
4. `docs/AI-ASSISTANT-CHECKLIST-FA.md`
5. `PROJECT_CONTEXT.md`
6. `TODO.md`
7. `README.md`
8. `AGENTS.md`
9. `CLAUDE.md`
10. `package.json`

در تعارض مسیرها، `docs/MASTER-SITEMAP-FA.md` مبنای محصول است.

## قواعد ثابت توسعه

1. قبل از هر پچ، فاز، هدف، مسیرها و فایل‌های درگیر اعلام شوند.
2. هر پچ کوچک، مستقل و قابل بازگشت باشد.
3. فرانت‌اند، بک‌اند و دیتابیس بی‌دلیل هم‌زمان تغییر نکنند.
4. نتیجه تست یا Build بدون اجرای موفق اعلام نشود.
5. هر مورد تکمیل‌شده همان لحظه در چک‌لیست مرتبط با `[x]` ثبت شود.
6. موارد در حال بررسی با `[~]` و موارد مسدود با `[!]` ثبت شوند.
7. مسیر موازی، داده ساختگی و قابلیت نیمه‌کاره وارد نسخه نهایی نشود.
8. پس از هر پچ، تست مرتبط، `PROJECT_CONTEXT.md` و `TODO.md` به‌روز شوند.
9. ادغام با `main` فقط با تأیید صریح مالک و پس از Build تولید انجام شود.

## فایل‌ها و اطلاعات ممنوع برای Git

```text
.env
.env.local
.env.*
!.env.example
.npmrc
.openai/
node_modules/
.next/
build/
dist/
out/
uploads/
app/api/config.php
app/api/config.php.secure
```

همچنین API Key، Token، Password، Secret، کلید خصوصی و اطلاعات اتصال واقعی دیتابیس نباید Commit شوند.

## قالب معرفی هر پچ

```text
Phase:
Patch title:
Purpose:
Affected routes:
Affected files:
Database impact:
Environment impact:
Rollback point:
Tests:
Result:
```

## Launch-2 — Affiliate TypeScript (تکمیل‌شده)

- خطاهای `HeadersInit` در پنل کاربر و مدیریت همکاری در فروش رفع شدند.
- هر دو تابع `tokenHeaders` اکنون فقط `Record<string, string>` برمی‌گردانند.
- TypeScript اختصاصی Affiliate بدون خطا اجرا شد و TypeScript سراسری دیگر هیچ خطای Affiliate گزارش نمی‌کند.
- ۲۷ تست Regression موفق شدند.
- مسیر `/account/affiliate` پاسخ HTTP `200` و مسیر `/admin/affiliate` برای مهمان Redirect امن `307` داد.
- Pull Request شماره ۴ با Commit `7fa2c8d8c1b851042d441e80b0d9179a76b8f2ee` در `backup-latest-2026-08-03` ادغام شد.
- GitHub Actions Run شماره `31047552740` موفق شد.
- چهار خطای غیر Affiliate باقی مانده‌اند: دو import تست با پسوند `.ts` و دو وابستگی محیط Build در `vite.config.ts`.
- پنج هشدار قدیمی ESLint در Effectها و متغیر استفاده‌نشده برای پچ جداگانه ثبت شده‌اند.
- اقدام بعدی باید در پچ مستقل انتخاب شود؛ امنیت وابستگی‌ها، بدهی ESLint یا TypeScript سراسری نباید با هم ترکیب شوند.

## Launch-3 — به‌روزرسانی قطعی 2026-08-06

این بخش وضعیت‌های قدیمی بالاتر را برای ادامه جاری پروژه اصلاح و تکمیل می‌کند.

### شاخه و نقطه جاری

```text
Base branch: backup-latest-2026-08-03
Base head before Launch-3: e60973bcc149559994cc859f87d7f980c8667f0c
Launch branch: agent/launch-3-local-baseline
Latest saved Launch-3 session commit: f72d69dc5c171eaecc2cb23168ef30275b0443dc
Main: untouched
```

### هویت برند تاییدشده

```text
نام فارسی: چاکود
نام لاتین: Chakod
شعار: پلتفرم رشد کسب و کار
```

تصویر سه‌بعدی بنفش ارسال‌شده توسط مالک مرجع بصری لانچ است؛ استفاده در Open Graph و Assetهای نهایی هنوز `[~]` است.

### اجرای محلی تاییدشده

- [x] Git `2.55.0.windows.2`، Node.js `v26.4.0` و npm `11.17.0` روی لپ‌تاپ تایید شدند.
- [x] `npm.cmd ci` موفق شد و ۵۲۸ پکیج نصب شدند.
- [x] Vite `8.0.13` در `948ms` روی `127.0.0.1:5173` بالا آمد.
- [x] `/`، `/cars` و `/login` با اسکرین‌شات در Chrome تایید شدند.
- [x] `/account/affiliate` رندر شد.
- [x] کاربر عادی و مهمان نتوانستند `/admin/affiliate` را باز کنند.

### ایرادهای مشاهده‌شده

- [!] دریافت داده `/account/affiliate` در Local شکست خورد.
- [!] مهمان `/admin/affiliate` به `/` رفت؛ رفتار مورد انتظار `/login?returnTo=%2Fadmin` است.
- [!] ورود آزمایشی لوکال نباید در Production فعال بماند.
- [~] تصاویر Placeholder، ترکیب زبان و چیدمان انتهای Grid در `/cars` نیازمند پچ‌های مستقل‌اند.
- [~] هشدار `DEP0205 module.register()` هنگام اجرای Vite ثبت شد.

### پچ جاری Redirect ادمین

```text
Phase: Launch-3
Patch title: Admin guest redirect
Affected routes: /admin/* و /login
Affected files:
- app/admin/layout.tsx
- lib/route-access.ts
- tests/route-access.test.mjs
Database impact: ندارد
Environment impact: ندارد
Rollback point: 3be38a804d6639e863c5f0b7f562566f4d7d130b
```

- [~] تصمیم `allow | login | home` پیاده‌سازی شده است.
- [~] مهمان به `/login?returnTo=%2Fadmin` هدایت می‌شود.
- [~] کاربر عادی واردشده به `/` برمی‌گردد.
- [~] تست Regression سه حالت اضافه شده است.
- [ ] پچ روی لپ‌تاپ Pull و اجرا نشده است.
- [ ] تست واحد، TypeScript و Smoke Test پس از Pull باقی مانده‌اند.

```text
Implementation commits:
bf4e9b563bb3b9ff1ec0f97981145f4ff7d78a52
68a016e27d2e1d3916a4ece57a3cb4d2000bf38f
f8fa8cb82ed05fc031f3be6aa06c7c17bce4f1f4
Checklist commit:
b4acbe4d8e141888cf47366e378e0fe639fbccda
Session handoff commit:
f72d69dc5c171eaecc2cb23168ef30275b0443dc
```

### نقطه ادامه

جلسه بعد ابتدا `AI_HANDOFF.md` و سپس `docs/LAUNCH-3-ADMIN-REDIRECT-CHECKLIST-FA.md` خوانده شود. روی لپ‌تاپ، بعد از توقف Vite:

```powershell
git status
git pull --ff-only origin agent/launch-3-local-baseline
node --test tests/route-access.test.mjs
npx.cmd tsc --noEmit -p tsconfig.launch.json
npm.cmd run dev
```

سپس مهمان Incognito و کاربر آزمایشی عادی جداگانه تست شوند. تا قبل از موفقیت واقعی، وضعیت پچ `[~]` باقی می‌ماند.
