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
- [x] ریسپانسیو بودن صفحه اصلی در دسکتاپ، تبلت و موبایل جزو قرارداد قطعی شد.
- [x] در موبایل ریل‌های صفحه اصلی باید افقی و قابل اسکرول بمانند.
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
- [x] تست قرارداد ریسپانسیو برای حفظ ریل افقی، اسکرول افقی و breakpoint کارت خودرو اضافه شد.

## اعتبارسنجی

- [x] فایل‌های پچ روی GitHub ذخیره شدند.
- [x] Commitهای اولیه روی لپ‌تاپ تا `03afd7e` Pull شدند.
- [x] اجرای اولیه `node --test tests/homepage-contract.test.mjs` موفق شد.
- [x] نتیجه اجرای اولیه ثبت شد: ۵ تست موفق، صفر شکست، صفر Skip.
- [~] تست ششم مربوط به ریسپانسیو روی GitHub اضافه شده و هنوز روی لپ‌تاپ اجرا نشده است.
- [ ] Commitهای ریسپانسیو روی لپ‌تاپ Pull شوند.
- [ ] تست قرارداد دوباره اجرا و نتیجه ۶ تست ثبت شود.
- [ ] بررسی تصویری در عرض دسکتاپ، تبلت و موبایل انجام شود.
- [ ] دکمه‌های `نمایش همه` در مرورگر باز و چیدمان عمودی صفحات مقصد تایید شود.
- [ ] پس از موفقیت کامل، وضعیت قرارداد در Go-Live، `PROJECT_CONTEXT.md` و `TODO.md` به‌روز شود.

## Commitها

```text
Homepage lock document:
496255bce4018cd2449c632ba3ca82d5583da70d

Homepage contract test:
f73cc62e9a89035821e9c91ec1ea027a6f895f29

Initial checklist:
03afd7e9f213c4b8dcb753ac74aa60432bba4725

Responsive contract test:
d9c8803513201233802a0846e5c11458198579cb

Responsive lock documentation:
b9c36afde1a2bf2bfbf7bbd898868acf02c87636
```

## اقدام بعدی

```powershell
# Terminal: PowerShell
# Folder: C:\Users\Computer Bartar\chakod-car

git pull --ff-only origin agent/launch-3-local-baseline
node --test tests/homepage-contract.test.mjs
```
