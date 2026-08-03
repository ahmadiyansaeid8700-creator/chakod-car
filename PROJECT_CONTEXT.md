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
Working branch: backup-latest-2026-08-03
Latest known commit: 2491a56
```

> شاخه `main` در زمان تهیه این سند از شاخه کاری عقب‌تر است. تا پیش از تأیید Build و بررسی تغییرات، Merge خودکار انجام نشود.

## وضعیت عملیاتی ثبت‌شده

- آخرین نسخه محلی Commit و Push شده است.
- اصلاح دسترسی اجرای فایل زیر ثبت و Push شده است:

```text
scripts/sites-env.sh
mode: 100755
commit: 2491a56
```

- نتیجه نهایی Build جدید Cloudflare پس از این Commit هنوز باید تأیید شود.
- فایل‌های حساس و محلی نباید وارد Git شوند.

## فناوری‌های مشاهده‌شده در مخزن

- Next.js
- TypeScript
- npm
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
3. `PROJECT_CONTEXT.md`
4. `TODO.md`
5. `README.md`
6. `AGENTS.md`
7. `CLAUDE.md`

در صورت تعارض مسیرها یا نام‌گذاری، `docs/MASTER-SITEMAP-FA.md` مبنای محصول است و تعارض باید گزارش شود؛ بدون تأیید، مسیر جدید موازی ساخته نشود.

## وضعیت فعلی نقشه راه

### مرحله محصول

```text
مرحله ۲: ممیزی کامل مسیرها، صفحات و کلیدها
```

### قاعده این مرحله

- در مرحله ممیزی هیچ کدی تغییر نمی‌کند.
- ابتدا گزارش کامل تولید می‌شود.
- پس از تأیید گزارش، اصلاح‌ها به‌صورت پچ‌های کوچک و مستقل انجام می‌شوند.

### خروجی الزامی ممیزی

- صفحات موجود
- صفحات ناقص
- دکمه‌های خراب
- دکمه‌های بدون عملکرد
- مسیرهای تکراری
- صفحات بدون لینک ورودی
- مسیرهای مدیریت قابل مشاهده برای کاربر عادی
- پیشنهاد مسیر نهایی هر بخش

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

Branch:
backup-latest-2026-08-03

ابتدا این فایل‌ها را به‌ترتیب بخوان:
1. docs/MASTER-SITEMAP-FA.md
2. docs/PROJECT-CHECKLIST-FA.md
3. PROJECT_CONTEXT.md
4. TODO.md
5. README.md
6. AGENTS.md
7. CLAUDE.md
8. package.json

قواعد:
- پروژه را از صفر بازسازی نکن.
- مسیر موازی جدید نساز.
- در مرحله فعلی هیچ کدی تغییر نده.
- ابتدا ممیزی کامل مسیرها، صفحات، لینک‌ها و دکمه‌ها را انجام بده.
- خروجی ممیزی را قبل از هر پچ ارائه کن.
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
