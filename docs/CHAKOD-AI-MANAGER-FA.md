# Chakod AI Manager — Foundation

## هدف

Chakod AI Manager یک لایه مدیریتی جدا از هسته اصلی سایت است. ورود، آگهی، پروفایل، پرداخت و مسیرهای اصلی برای کارکرد عادی نباید به AI وابسته باشند.

## اصول معماری

- Provider: `disabled | openai | local`
- Mode فعلی: `read_suggest`
- Auto-write ممنوع است.
- Moderation آگهی مستقل باقی می‌ماند.
- Secret، API Key، Token و Password در UI یا Status نمایش داده نمی‌شوند.
- هر Write Action آینده نیازمند Permission، Audit و Human Approval مستقل است.

## Foundation v0.4

### Provider Adapter

`lib/chakod-ai-manager/provider.ts`

- قرارداد مشترک برای OpenAI و Local
- Timeout محدود و Failure isolation
- Fail-closed behavior
- Local endpoint فقط روی Loopback معتبر
- محدودیت اندازه ورودی و خروجی
- OpenAI request با `store: false`

### Read-only Tool Registry

`lib/chakod-ai-manager/tools.ts`

Registry ابزارها را با Stageهای `available`، `registered` و `planned` نگه می‌دارد.

### Read-only Tool Executor

`lib/chakod-ai-manager/tool-executor.ts`

Executor فقط GET انجام می‌دهد و خروجی APIهای مدیریت را Sanitized می‌کند:

- `manager_status`
- `listing_moderation_status`
- `listings_review_overview`
- `businesses_overview`
- `commerce_health`
- `site_operations_summary`

قواعد Sanitization:

- آگهی‌ها: فقط Stats و Pagination؛ آیتم خام حذف می‌شود.
- کسب‌وکارها: فقط Total و Stats؛ نام، موبایل، تلفن و داده هویتی مالک حذف می‌شود.
- تجارت: فقط Summary، Warning و Capabilityهای غیرمحرمانه؛ سفارش خام، اطلاعات کاربر و جزئیات حساس حذف می‌شود.
- Snapshot تجمیعی با `Promise.allSettled` ساخته می‌شود تا خطای یک Source کل تحلیل را از کار نیندازد.

### Tool API

`GET /api/ai/manager/tools/[toolId]`

- فقط ادمین معتبر
- فقط Read-only
- بدون Write method
- خروجی Sanitized

### Suggestion API

`POST /api/ai/manager/suggest`

- فقط ادمین معتبر
- Cross-site mutation guard فعال
- فقط `site_operations_summary` را به Provider می‌دهد
- Prompt به AI صریحاً حدس‌زدن، ادعای اجرای عمل و درخواست Secret را ممنوع می‌کند
- خروجی فقط پیشنهاد مدیریتی است و `writeActionsExecuted=false` برمی‌گردد

### Status API

`GET /api/ai/manager/status`

Provider، Runtime، Timeout، Model غیرمحرمانه و Tool Registry را بدون Secret گزارش می‌کند.

### Admin UI

`/admin`

Command Center جدید برای آگهی، کسب‌وکار، تجارت، AI و Governance.

`/admin/ai`

AI Center شامل:

- Provider و Runtime
- Tool Registry
- معماری پردازش
- Guardrailها
- Human Approval
- کنسول پیشنهاد مدیریتی Read-only

اگر Provider آماده نباشد، کنسول به‌صورت Safe Off نمایش داده می‌شود و هسته سایت بدون AI ادامه می‌دهد.

## Environment contract

```text
CHAKOD_AI_MANAGER_ENABLED=false
CHAKOD_AI_MANAGER_PROVIDER=disabled
CHAKOD_AI_MANAGER_TIMEOUT_MS=12000
CHAKOD_AI_MANAGER_OPENAI_MODEL=
CHAKOD_AI_LOCAL_ENDPOINT=
```

برای Provider `openai` از `OPENAI_API_KEY` سرور استفاده می‌شود.

## مراحل بعدی

1. اجرای Regression Test برای Cleanup، Provider، Registry، Executor و Admin UI.
2. بررسی واقعی Shape پاسخ APIهای Backend روی هاست.
3. اضافه‌کردن Audit event برای درخواست‌های AI بدون Secret/Token.
4. بعد از تثبیت Read-only، طراحی Human Approval برای Write Actionهای آینده.

## نقطه بازگشت

AI Manager باید همیشه قابل خاموش‌کردن مستقل باشد تا مشکل در AI هیچ اثر ضروری روی سرویس اصلی نداشته باشد.
