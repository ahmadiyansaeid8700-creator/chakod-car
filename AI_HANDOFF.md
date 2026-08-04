# AI Handoff — Chakod

این فایل نقطه شروع سریع برای ادامه پروژه در هر چت جدید است و باید پس از هر Patch به‌روزرسانی شود.

## مخزن و شاخه کاری

```text
Repository: ahmadiyansaeid8700-creator/chakod-car
Working branch: backup-latest-2026-08-03
Base commit before recent patches: e067eb8
Latest completed code commit: 85ac1b3
```

> شاخه `main` مبنای ادامه کار نیست. تا زمان تأیید صریح مالک پروژه، روی شاخه بالا کار کن و آن را با `main` ادغام نکن.

## وضعیت فعلی

- ممیزی کامل صفحات، مسیرها، لینک‌ها و دکمه‌ها انجام شده است.
- Patch اصلاح مسیر بازگشت ورود (`returnTo`) در Commit `ff8c224` تکمیل شده است.
- Patch محافظت سروری از مسیرهای مدیریت و نشست مسیرهای `/dealers/*` در Commit `85ac1b3` تکمیل شده است.
- Build محلی پنج‌مرحله‌ای Vinext بعد از آخرین Patch موفق بوده است.
- ۱۵ تست مستقل پروژه موفق بوده‌اند.
- Build مخصوص Cloudflare در محیط قبلی به‌دلیل نبود فایل‌های Git-ignored زیر قابل اجرا نبوده است:

```text
.openai/hosting.json
build/sites-vite-plugin
```

## قدم بعدی

```text
تعیین و تثبیت مسیر نهایی خودروها در ساختار /cars/*
```

قبل از هر تغییر، مسیرهای فعلی `/ads`، `/listing/[id]` و مقصد مصوب در `docs/MASTER-SITEMAP-FA.md` را بررسی کن. مسیر موازی جدید نساز و مهاجرت مسیرها را به‌صورت یک Patch کوچک، قابل تست و قابل بازگشت طراحی کن.

## ترتیب مطالعه در چت جدید

1. `AI_HANDOFF.md`
2. `docs/MASTER-SITEMAP-FA.md`
3. `docs/PROJECT-CHECKLIST-FA.md`
4. `PROJECT_CONTEXT.md`
5. `TODO.md`
6. `AGENTS.md`
7. `CLAUDE.md`
8. `package.json`

## قواعد ادامه کار

- پروژه موجود را ادامه بده؛ آن را از صفر نساز.
- فقط روی `backup-latest-2026-08-03` کار کن.
- قبل از تغییر، هدف و فایل‌های Patch را مشخص کن.
- هر Patch باید کوچک، مستقل و قابل بازگشت باشد.
- پس از هر Patch، تست مرتبط و Build قابل اجرا را انجام بده.
- بعد از هر Patch، `AI_HANDOFF.md`، `PROJECT_CONTEXT.md` و `TODO.md` را به‌روزرسانی کن.
- هر Patch را در Commit مستقل ثبت و همان شاخه را به GitHub Push کن.
- فایل‌های محیطی، رمزها، Tokenها، API Keyها و Secrets را هرگز Commit نکن.

## گزارش آخرین Patchها

| Commit | تغییر | نتیجه |
|---|---|---|
| `ff8c224` | اجرای امن `returnTo` پس از ورود | ۴ تست اختصاصی موفق |
| `85ac1b3` | Guard سروری `/admin/*`، نشست `/dealers/*` و حذف لینک عمومی مدیریت | Build محلی موفق و ۱۵ تست مستقل موفق |

## دستور آماده برای چت جدید

```text
پروژه Chakod را از مخزن ahmadiyansaeid8700-creator/chakod-car و شاخه
backup-latest-2026-08-03 ادامه بده. ابتدا AI_HANDOFF.md را کامل بخوان و سپس
فایل‌های مرجع معرفی‌شده در آن را بررسی کن. پروژه را از صفر نساز و بدون بررسی
نقشه مادر مسیر موازی ایجاد نکن. وضعیت Git و آخرین Commit شاخه را قبل از هر کار
تأیید کن و از قدم بعدی ثبت‌شده در AI_HANDOFF.md ادامه بده.
```

## زمان آخرین به‌روزرسانی

```text
2026-08-04 — پس از تکمیل Patch محافظت مسیرهای مدیریتی
```
