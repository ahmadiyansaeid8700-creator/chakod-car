# Chakod AI Manager

## هدف

Chakod AI Manager یک لایه مدیریتی جدا از هسته اصلی سایت است. ورود، آگهی، پروفایل، پرداخت و مسیرهای اصلی سایت نباید برای کارکرد عادی به AI وابسته شوند.

## اصول معماری

- AI Manager به‌صورت پیش‌فرض غیرفعال است.
- Provider قابل تعویض است: `disabled`، `openai` یا `local`.
- فاز فعلی فقط `read_suggest` است؛ هیچ Write Action خودکار مجاز نیست.
- Chatbot سراسری در RootLayout وجود ندارد و بدون نیاز محصول دوباره ساخته نمی‌شود.
- Moderation فعلی آگهی سرویس مستقل باقی می‌ماند.
- Secret، API Key و Token هرگز در Status، Log عمومی یا GitHub نمایش داده نمی‌شوند.
- API مدیریتی فقط پس از تأیید نشست ادمین پاسخ می‌دهد.

## Foundation v0.1

- `lib/chakod-ai-manager/contracts.ts`
- `lib/chakod-ai-manager/config.ts`
- `app/api/ai/manager/status/route.ts`
- `tests/chakod-ai-manager-config.test.ts`

`GET /api/ai/manager/status` فقط برای ادمین معتبر در دسترس است و وضعیت غیرمحرمانه Manager را گزارش می‌کند. کاربر غیرادمین پاسخ 404 می‌گیرد.

## Provider Adapter v0.2

Provider Adapter در `lib/chakod-ai-manager/provider.ts` مرز مشترک ارتباط با مدل را ایجاد می‌کند.

### کنترل‌های ایمنی

- Manager و Provider باید صریحاً فعال و پیکربندی شده باشند؛ در غیر این صورت Fail-closed است.
- درخواست ورودی محدودیت اندازه دارد.
- Timeout سمت سرور بین ۱ تا ۳۰ ثانیه Clamp می‌شود.
- خطای شبکه یا Provider به خطای عمومی و بدون نشت جزئیات داخلی تبدیل می‌شود.
- پاسخ OpenAI با `store: false` ارسال می‌شود.
- Adapter هیچ Tool یا Write Action به مدل ارائه نمی‌کند.
- Provider محلی فقط به localhost/loopback متصل می‌شود تا تنظیم اشتباه به ارسال داده به مقصد ناشناس منجر نشود.
- پاسخ Provider قبل از بازگشت باید متن قابل استفاده داشته باشد.

### OpenAI provider

از Responses API سمت سرور استفاده می‌شود. Model از `CHAKOD_AI_MANAGER_OPENAI_MODEL` خوانده می‌شود و Credential همان `OPENAI_API_KEY` سرور است.

### Local provider

Endpoint فقط از `CHAKOD_AI_LOCAL_ENDPOINT` خوانده می‌شود و در این فاز باید loopback باشد. قرارداد پاسخ حداقلی:

```json
{
  "text": "...",
  "model": "optional-model-name"
}
```

## Environment contract

فقط نام و مقدارهای نمونه غیرمحرمانه در `.env.example` نگهداری می‌شوند:

```text
CHAKOD_AI_MANAGER_ENABLED=false
CHAKOD_AI_MANAGER_PROVIDER=disabled
CHAKOD_AI_MANAGER_OPENAI_MODEL=gpt-5.4
CHAKOD_AI_MANAGER_TIMEOUT_MS=12000
CHAKOD_AI_LOCAL_ENDPOINT=
```

مقادیر واقعی Secret خارج از Git هستند.

## مراحل بعدی

1. اجرای Regression Test واقعی Foundation و Provider Adapter.
2. ساخت Tool Registry فقط برای APIهای Read-only تأییدشده چاکود.
3. تعریف Audit event برای درخواست‌های مدیریتی بدون ذخیره Secret یا Token.
4. صفحه `/admin/ai` فقط بعد از آماده شدن API و تست دسترسی.
5. هر Write Action احتمالی در آینده فقط با مجوز صریح، تأیید انسانی و Audit مستقل.

## نقطه بازگشت

هر فاز AI در Commit مستقل نگهداری می‌شود تا در صورت مشکل بدون اثر بر Moderation یا هسته اصلی سایت Revert شود.
