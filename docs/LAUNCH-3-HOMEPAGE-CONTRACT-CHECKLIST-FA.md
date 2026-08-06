# چک لیست قفل صفحه اصلی — Launch-3

## معرفی پچ

```text
Date: 2026-08-06
Phase: Launch-3 — Local Baseline
Patch title: Homepage contract and public-link smoke test
Affected route: /
Affected destination routes:
- /cars/luxury
- /cars/free-zone
- /showrooms
- /businesses
Database impact: ندارد
Environment impact: ندارد
UI impact: ندارد؛ فقط قفل ساختار، سند و تست
Rollback point: af175a0b2c6dce2d39e6139964bf1c9dc97cd577
```

## تصمیم مالک

- [x] ترتیب صفحه اصلی تایید شد.
- [x] چیدمان صفحه اصلی از این نقطه قفل شد.
- [x] همه بخش‌های محتوایی صفحه اصلی باید افقی بمانند.
- [x] صفحات مقصد `نمایش همه` باید فهرست چندردیفه و عمودی داشته باشند.
- [x] تغییر ترتیب یا حذف بخش‌ها بدون تایید صریح مالک ممنوع شد.

## ترتیب قفل‌شده

1. استوری‌ها
2. نمایشگاه‌های منتخب
3. خودروهای لوکس
4. خودروهای منطقه آزاد
5. خدمات خودرویی برتر
6. فروشگاه‌های لوازم یدکی برتر
7. تعمیرکاران برتر

## پیاده‌سازی

- [x] سند `docs/HOMEPAGE-STRUCTURE-LOCK-FA.md` اضافه شد.
- [x] تست `tests/homepage-contract.test.mjs` اضافه شد.
- [x] تست ترتیب کامپوننت‌های صفحه اصلی نوشته شد.
- [x] تست نبود Hero قبل از استوری‌ها نوشته شد.
- [x] تست مسیرهای اصلی و مقصدهای `نمایش همه` نوشته شد.
- [x] تست ترتیب خدمات، لوازم یدکی و تعمیرکاران نوشته شد.
- [x] تست اتصال استوری، نمایشگاه، خودرو و کسب‌وکار به انتخاب موقعیت نوشته شد.
- [x] تست جدایی ریل افقی صفحه اصلی از Grid صفحات مقصد نوشته شد.

## اعتبارسنجی

- [~] فایل‌های پچ روی GitHub ذخیره شده‌اند.
- [ ] آخرین Commitها روی لپ‌تاپ Pull شوند.
- [ ] `node --test tests/homepage-contract.test.mjs` اجرا شود.
- [ ] تعداد تست‌های موفق و شکست‌خورده ثبت شود.
- [ ] در صورت شکست، فقط قرارداد یا پیاده‌سازی مرتبط اصلاح شود؛ ساختار تاییدشده تغییر نکند.
- [ ] پس از موفقیت تست، وضعیت قرارداد در Go-Live، `PROJECT_CONTEXT.md` و `TODO.md` به‌روز شود.

## Commitها

```text
Homepage lock document:
496255bce4018cd2449c632ba3ca82d5583da70d

Homepage contract test:
f73cc62e9a89035821e9c91ec1ea027a6f895f29
```

## اقدام بعدی

```powershell
# Terminal: PowerShell
# Folder: C:\Users\Computer Bartar\chakod-car

# ابتدا Vite متوقف شود، سپس:
git pull --ff-only origin agent/launch-3-local-baseline
node --test tests/homepage-contract.test.mjs
```
