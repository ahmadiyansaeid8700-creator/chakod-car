# Chakod — چاکود

چاکود یک پلتفرم فارسی و RTL برای بازار خودرو، آگهی‌ها، نمایشگاه‌ها و کسب‌وکارهای خودرویی است.

## Repository

Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03

شاخه main تا تأیید صریح مالک پروژه مبنای توسعه و انتشار نیست.

## ساختار

- app/ — رابط کاربری و Routeهای Next.js
- lib/ — منطق مشترک و سرویس‌های داخلی
- app/api/ — Routeهای داخلی و sourceهای backend موجود
- db/ و drizzle/ — ساختار داده پروژه
- docs/ — نقشه مسیرها و چک‌لیست‌های رسمی

## Chakod AI

دستیار سراسری قدیمی از Runtime حذف شده است. معماری فعلی AI فقط شامل Foundation جدید Chakod AI Manager و سرویس مستقل Moderation آگهی است. AI Manager به‌صورت پیش‌فرض غیرفعال و در فاز اول فقط Read/Suggest است.

هیچ ChatGPT starter auth یا Global AI Assistant بخشی از معماری فعلی چاکود نیست.

## توسعه محلی

Node.js >=22.13.0

npm ci
npm run dev

## اسناد مرجع

1. docs/MASTER-SITEMAP-FA.md
2. docs/PROJECT-CHECKLIST-FA.md
3. docs/INITIAL-LAUNCH-CHECKLIST-FA.md
4. docs/CHAKOD-AI-MANAGER-FA.md
5. PROJECT_CONTEXT.md
6. TODO.md

قبل از هر Patch، PROJECT_CONTEXT.md و TODO.md بررسی شوند.
