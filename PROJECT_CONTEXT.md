# Project Context — Chakod

## هویت پروژه

- نام: چاکود (`chakod-car`)
- نوع محصول: بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- زبان و جهت رابط: فارسی و RTL
- اصل توسعه: ادامه پروژه موجود؛ مسیر موازی و بازسازی از صفر بدون تأیید ممنوع است.

## مخزن و شاخه کاری

Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Main branch: مبنای توسعه جاری نیست

ادغام با main فقط با تأیید صریح مالک و پس از Build/Regression واقعی انجام شود.

## وضعیت فعلی

### مسیرها و مدیریت

- [x] مسیرهای اصلی ورود، خودرو، آگهی و مدیریت تثبیت شده‌اند.
- [x] `/admin/*` با Server-side admin access gate محافظت می‌شود.
- [x] داشبورد `/admin` به Command Center جدید بازطراحی شده است.
- [x] ماژول‌های آگهی، کسب‌وکار، مالی و AI از یک داشبورد واحد قابل دسترسی‌اند.

### Legacy cleanup

- [x] Assistant سراسری قدیمی، ChatGPT starter و مسیرهای وابسته حذف شده‌اند.
- [x] AI_HANDOFF قدیمی، examples/d1، فایل‌های backup داخل app و راهنماهای قدیمی حذف شده‌اند.
- [x] Assetهای Starter بلااستفاده حذف شده‌اند.
- [x] زنجیره قدیمی Banner Reservation مبتنی بر ChatGPT/email auth، D1 و `demo_paid` حذف شده است.
- [x] صفحه رزرو جدید `/account/ads` که از Commerce/Auth فعلی چاکود استفاده می‌کند حفظ شده است.
- [x] D1 schema/migration و helperهای `admin-access`/`banner-booking` که فقط به رزرو آزمایشی قدیمی وابسته بودند حذف شده‌اند.
- [x] `ai-moderation` مستقل حفظ شده است.

### Chakod AI Manager

- [x] Feature Flag و Provider contract روی `disabled | openai | local`.
- [x] Mode فعلی فقط `read_suggest`.
- [x] Auto-write ممنوع است.
- [x] Provider Adapter با Timeout، Failure isolation و fail-closed اضافه شده است.
- [x] Local Provider فقط Loopback endpoint معتبر می‌پذیرد.
- [x] Read-only Tool Registry و Tool Executor اضافه شده‌اند.
- [x] Tool Snapshotهای Listings / Businesses / Commerce قبل از ورود به Provider Sanitized می‌شوند.
- [x] Status API اطلاعات Runtime و Registry را بدون Secret گزارش می‌دهد.
- [x] Suggestion API فقط Snapshot خلاصه را به Provider می‌دهد و Write Action اجرا نمی‌کند.
- [x] صفحه اختصاصی `/admin/ai` برای Provider، Tool Registry، Guardrail و Human Approval ساخته شده است.
- [x] ناسازگاری Node strip-types در Provider/Tool Error رفع شده و importهای Runtime قابل Resolve شده‌اند.
- [x] تست‌های هدفمند Config + Provider + Tool Executor + Moderation در محیط Node 22 اجرا شدند: 16/16 Pass.
- [~] Full Regression روی GitHub Actions آغاز شده است؛ Run اول `npm ci` را پاس کرد و سه import باقی‌مانده از ChatGPT Auth را در Banner Reservation قدیمی پیدا کرد که اکنون حذف شده‌اند.

## اولویت‌های بعدی

Priority 1: ادامه Full Regression تا عبور TypeScript، Unit Tests، Build و Smoke
Priority 2: تکمیل Backend/API واقعی چاکود و Auth روی هاست
Priority 3: بررسی واقعی پاسخ APIهای Read-only روی هاست
Priority 4: Audit event برای درخواست‌های AI
Priority 5: Build تولید و سپس تصمیم درباره main

## فناوری‌های اصلی

- Next.js 16 / App Router
- React 19
- TypeScript
- Vinext / Vite
- Cloudflare Workers
- PHP/MySQL backend در api.chakod.com

## اسناد مرجع

1. docs/MASTER-SITEMAP-FA.md
2. docs/PROJECT-CHECKLIST-FA.md
3. docs/CHAKOD-AI-MANAGER-FA.md
4. PROJECT_CONTEXT.md
5. TODO.md
6. README.md
7. AGENTS.md
8. CLAUDE.md
9. package.json

## قواعد ثابت توسعه

1. هر پچ کوچک، مستقل و قابل Revert باشد.
2. نتیجه تست یا Build بدون اجرای واقعی موفق اعلام نشود.
3. AI نباید هسته سایت را برای کارکرد عادی وابسته کند.
4. Toolهای AI در این فاز فقط Read-only هستند.
5. هر Write Action آینده نیازمند Permission، Human Approval و Audit مستقل است.
6. Secret، API Key، Token، Password و Credential واقعی وارد Git یا UI نشوند.
7. Backup تاریخی داخل app نگهداری نشود؛ Git تاریخچه است.
8. main تا تأیید صریح مالک تغییر نکند.
