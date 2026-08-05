# Project Context — Chakod

## هویت پروژه

- **نام:** چاکود (`chakod-car`)
- **نوع محصول:** پلتفرم بازار خودرو، نمایشگاه‌ها و کسب‌وکارهای خودرویی
- **زبان رابط:** فارسی
- **جهت رابط:** راست‌به‌چپ (RTL)
- **اصل توسعه:** ادامه پروژه موجود؛ بازسازی از صفر ممنوع مگر با تصمیم صریح مالک پروژه.

## محل‌های فعلی پروژه

### لوکال

```text
C:\Users\Computer Bartar\chakod-car
```

### GitHub

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Base branch: backup-latest-2026-08-03
Current patch branch: agent/ai-independent-core
Independent AI rollback base: 6ed6fceb540a14ba2a5de31fc9a9dcb1cb540480
Latest independent AI code commit: 185e2b7f79714404b35e240d27f57bf89c8cd0c1
```

> شاخه `main` نسخه مبنای توسعه جاری نیست. شاخه پچ مستقل هوش مصنوعی باید پس از تست به `backup-latest-2026-08-03` پیشنهاد شود و تا زمان تأیید صریح مالک با `main` ادغام نشود.

## وضعیت عملیاتی ثبت‌شده

- ممیزی کامل مرحله ۲ انجام و گزارش آن تأیید شده است.
- Patch 2.3 برای اصلاح امن مسیر بازگشت ورود اجرا شده است.
- Patch 2.9 برای پنهان‌سازی مسیرهای مدیریت از کاربر عادی اجرا شده است.
- همه مسیرهای `/admin/*` پیش از رندر محتوا با نشست و نقش سروری کنترل می‌شوند.
- مسیرهای `/dealers/*` فقط با نشست معتبر باز می‌شوند و لینک مدیریتی آن از صفحه عمومی نمایشگاه‌ها حذف شده است.
- Patchهای ورود و محافظت مسیرهای مدیریتی در Commit منتشرشده `0e177d4` قرار دارند.
- Patch مسیرهای عمومی خودرو در Commit منتشرشده `b5fb874` قرار دارد.
- مسیرهای اصلی بازار و جزئیات خودرو `/cars`، `/cars/luxury`، `/cars/free-zone` و `/cars/[slug]` هستند.
- حالت اقتصادی بدون مسیر موازی روی `/cars?segment=economic` حفظ شده است.
- مسیرهای قدیمی `/ads/*` و `/listing/[id]` با Redirect دائمی `308` به مسیر اصلی منتقل می‌شوند.
- ثبت و مدیریت آگهی در شاخه مبنا روی `/account/listings/*` قرار دارد و مسیرهای قدیمی `/submit` و `/dashboard/listings/*` به مسیرهای اصلی Redirect می‌شوند.
- صفحه استاندارد 404 و مسیر عمومی `/dealerships` نیز در شاخه مبنا وجود دارند.
- Build محلی پنج‌مرحله‌ای Vinext در پچ‌های پیشین موفق شده است.
- Build مخصوص Cloudflare در محیط‌های فاقد فایل‌های محلی و Git-ignored زیر قابل اجرا نیست:

```text
.openai/hosting.json
build/sites-vite-plugin
```

- فایل‌های حساس و محلی نباید وارد Git شوند.

## وضعیت هوش مصنوعی مستقل

### Patch AI-1 — هسته مستقل و fallback آفلاین

- هسته Rule-based جدید در `lib/ai-assistant/offline.ts` اضافه شده است.
- هسته بدون نیاز اجباری به `OPENAI_API_KEY` کار می‌کند.
- مدل ابری همچنان Provider اختیاری است.
- نبود کلید، Timeout، خطای شبکه یا خرابی مدل ابری باعث انتقال پاسخ به هسته مستقل می‌شود.
- هسته مستقل Intentهای جست‌وجوی خودرو، مقایسه، تحلیل قیمت، راهنمای ثبت آگهی، وضعیت آگهی و عملیات مدیریتی را تشخیص می‌دهد.
- پاسخ‌های داده‌محور فقط از `AssistantKnowledge` ساخته‌شده با APIهای رسمی چاکود استفاده می‌کنند.
- کارت آگهی فقط برای شناسه‌های واقعی موجود در داده ورودی ساخته می‌شود.
- لینک‌ها به مسیرهای داخلی مجاز محدود هستند.
- رمز، کد پیامکی، Token و اطلاعات کارت در پاسخ مستقل رد می‌شوند.
- حالت مدیریت فقط در صورت دریافت دانش مدیریتی احرازشده فعال می‌ماند.
- دستیار هیچ تأیید، رد، حذف، پرداخت یا انتشار خودکاری انجام نمی‌دهد.
- پنج سناریوی تست خودکار در `tests/ai-assistant-offline.test.mjs` اضافه شده‌اند.
- اجرای واقعی تست، ESLint، TypeScript و Build این شاخه هنوز تأیید نشده است؛ نتیجه موفق فرض نمی‌شود.

## فناوری‌های مشاهده‌شده در مخزن

- Next.js 16 / App Router
- React 19
- TypeScript
- npm
- Vinext و Vite
- CSS Modules و CSS عمومی
- Cloudflare Workers / Pages
- Wrangler
- Drizzle
- مسیرهای API در پروژه
- متغیرهای محیطی برای سرویس‌های خارجی

> این فهرست براساس ساختار فعلی مخزن است. پیش از تصمیم معماری، `package.json`، فایل‌های تنظیمات و کد واقعی بررسی شوند.

## اسناد مرجع و ترتیب اعتبار

1. `docs/MASTER-SITEMAP-FA.md`
2. `docs/PROJECT-CHECKLIST-FA.md`
3. `docs/AI-ASSISTANT-CHECKLIST-FA.md`
4. `PROJECT_CONTEXT.md`
5. `TODO.md`
6. `README.md`
7. `AGENTS.md`
8. `CLAUDE.md`

در صورت تعارض مسیرها یا نام‌گذاری، `docs/MASTER-SITEMAP-FA.md` مبنای محصول است و تعارض باید گزارش شود؛ بدون تأیید، مسیر جدید موازی ساخته نشود.

## وضعیت فعلی نقشه راه

### مرحله محصول

```text
مرحله ۲: پچ‌های پس از ممیزی
AI-1: هسته مستقل دستیار — در انتظار تست و Build
```

### وضعیت مرحله

- ممیزی کامل بدون تغییر کد انجام و گزارش آن تأیید شده است.
- Patchهای مسیر ورود، مدیریت، خودرو و ثبت آگهی در شاخه مبنا وجود دارند.
- Patch AI-1 در شاخه مستقل `agent/ai-independent-core` پیاده‌سازی شده است.
- این پچ دیتابیس را تغییر نمی‌دهد و متغیر محیطی جدید اجباری ندارد.
- گام بعدی فقط اجرای تست‌های هدفمند، ESLint، TypeScript و Build است.
- پس از تأیید تست، Draft Pull Request باید به `backup-latest-2026-08-03` باز شود؛ نه `main`.

## قواعد ثابت توسعه

1. قبل از هر پچ، شماره فاز و هدف مشخص شود.
2. مسیرها و فایل‌های تحت‌تأثیر قبل از تغییر اعلام شوند.
3. هر پچ کوچک، مستقل و قابل بازگشت باشد.
4. بک‌اند، فرانت‌اند و SQL بی‌دلیل هم‌زمان تغییر نکنند.
5. قابلیت ناقص در نسخه نهایی باقی نماند.
6. قبل از تغییر ساختار، کد موجود و اسناد مرجع بررسی شوند.
7. مسیر موازی برای یک مفهوم ایجاد نشود.
8. اطلاعات ساختگی، کارت آزمایشی و متن تست در نسخه نهایی باقی نماند.
9. بعد از هر پچ، Build و تست مرتبط اجرا شود.
10. `PROJECT_CONTEXT.md` و `TODO.md` بعد از هر مرحله به‌روز شوند.

## الگوی اجباری معرفی هر پچ

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

همچنین هیچ‌کدام از موارد زیر نباید داخل کد یا مستندات Commit شوند:

- API Key واقعی
- Token واقعی
- Password
- Secret
- کلید خصوصی
- اطلاعات اتصال واقعی دیتابیس

## دستور شروع برای هوش مصنوعی در چت جدید

```text
این گفت‌وگو ادامه پروژه موجود Chakod است، نه ساخت پروژه جدید.

Repository:
ahmadiyansaeid8700-creator/chakod-car

Base branch:
backup-latest-2026-08-03

Current independent AI branch:
agent/ai-independent-core

ابتدا این فایل‌ها را به‌ترتیب بخوان:
1. docs/MASTER-SITEMAP-FA.md
2. docs/PROJECT-CHECKLIST-FA.md
3. docs/AI-ASSISTANT-CHECKLIST-FA.md
4. PROJECT_CONTEXT.md
5. TODO.md
6. README.md
7. AGENTS.md
8. CLAUDE.md
9. package.json

قواعد:
- پروژه را از صفر بازسازی نکن.
- مسیر موازی جدید نساز.
- هیچ نتیجه تست یا Build را بدون اجرا موفق اعلام نکن.
- فایل‌های حساس را Commit نکن.
- شاخه پچ AI را بدون تأیید با main ادغام نکن.
```

## یادداشت به‌روزرسانی

بعد از هر Commit مهم، این موارد اصلاح شوند:

```text
Working branch:
Latest known commit:
Current phase:
Completed patch:
Build status:
Known blockers:
Next action:
```
