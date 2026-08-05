# Launch-3 — اصلاح Redirect مسیرهای ادمین

## اطلاعات پچ

```text
Phase: Launch-3 — Local Baseline
Patch: Admin guest redirect
Branch: agent/launch-3-local-baseline
Affected route: /admin/*
Login route: /login?returnTo=/admin
Database impact: ندارد
Environment impact: ندارد
Rollback point: 3be38a804d6639e863c5f0b7f562566f4d7d130b
```

## شواهد پیش از اصلاح

- [x] کاربر آزمایشی واردشده و غیرادمین از `/admin/affiliate` به `/` برگردانده شد.
- [x] مهمان واقعی در پنجره ناشناس نیز از `/admin/affiliate` به `/` برگردانده شد.
- [x] علت در `app/admin/layout.tsx` پیدا شد: تمام هویت های غیرادمین بدون تفکیک به `/` Redirect می شدند.

## پیاده سازی

- [~] تصمیم دسترسی سه حالته `allow | login | home` در `lib/route-access.ts` اضافه شد.
- [~] ادمین تاییدشده اجازه ورود دارد.
- [~] کاربر واردشده ولی غیرادمین به `/` برمی گردد.
- [~] مهمان بدون Session به `/login?returnTo=%2Fadmin` منتقل می شود.
- [~] تست Regression برای هر سه حالت در `tests/route-access.test.mjs` اضافه شد.

## تست های لازم

- [ ] دریافت آخرین Commitهای شاخه روی لپ تاپ.
- [ ] اجرای `node --test tests/route-access.test.mjs`.
- [ ] اجرای TypeScript محدوده Launch.
- [ ] اجرای سرور محلی پس از تغییر.
- [ ] تایید مهمان ناشناس: `/admin/affiliate` به `/login?returnTo=%2Fadmin` برسد.
- [ ] تایید کاربر عادی: `/admin/affiliate` باز نشود و به `/` برگردد.
- [ ] بررسی نبود خطای جدید در ترمینال و Console.
- [ ] ثبت نتیجه نهایی در `docs/GO-LIVE-CHECKLIST-FA.md`.

## وضعیت انتشار

```text
Implementation commits:
- bf4e9b563bb3b9ff1ec0f97981145f4ff7d78a52
- 68a016e27d2e1d3916a4ece57a3cb4d2000bf38f
- f8fa8cb82ed05fc031f3be6aa06c7c17bce4f1f4

Status: پیاده سازی شده، در انتظار تست محلی
Published commit: هنوز ادغام نشده
```
