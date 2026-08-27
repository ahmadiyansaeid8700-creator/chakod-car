# Chakod AI Manager — Foundation

## هدف

Chakod AI Manager یک لایه مدیریتی جدا از هسته اصلی سایت است. این لایه نباید ورود، آگهی، پروفایل، پرداخت یا مسیرهای اصلی را برای کارکرد عادی سایت به AI وابسته کند.

## اصول معماری

- AI Manager به‌صورت پیش‌فرض غیرفعال است.
- Provider قابل تعویض است: `disabled`، `openai` یا `local`.
- فاز اول فقط `read_suggest` است؛ هیچ Write Action خودکار مجاز نیست.
- Chatbot سراسری در RootLayout وجود ندارد و بدون نیاز محصول دوباره ساخته نمی‌شود.
- Moderation فعلی آگهی به‌عنوان سرویس مستقل حفظ می‌شود و با AI Manager ادغام اجباری ندارد.
- Secret، API Key و Token هرگز در پاسخ Status یا GitHub نمایش داده نمی‌شوند.
- API مدیریتی فقط پس از تأیید نشست ادمین پاسخ می‌دهد.

## Foundation v0.1

### فایل‌ها

- `lib/chakod-ai-manager/contracts.ts`
- `lib/chakod-ai-manager/config.ts`
- `app/api/ai/manager/status/route.ts`
- `tests/chakod-ai-manager-config.test.ts`

### Status API

`GET /api/ai/manager/status`

این Route فقط برای ادمین معتبر در دسترس است و اطلاعات غیرمحرمانه زیر را گزارش می‌کند:

- فعال یا غیرفعال بودن درخواست‌شده Manager
- Provider انتخاب‌شده
- آماده بودن Provider بدون افشای Credential
- Mode فعلی (`read_suggest`)
- ممنوع بودن Write Action
- وضعیت پیکربندی Moderation موجود بدون نمایش Secret

کاربر غیرادمین پاسخ 404 می‌گیرد تا سطح مدیریت افشا نشود.

## Environment contract

فقط نام تنظیمات در `.env.example` نگهداری می‌شود؛ مقدار واقعی خارج از Git است.

```text
CHAKOD_AI_MANAGER_ENABLED=false
CHAKOD_AI_MANAGER_PROVIDER=disabled
CHAKOD_AI_LOCAL_ENDPOINT=
```

برای Provider `openai` از `OPENAI_API_KEY` سرور استفاده می‌شود. AI Manager هیچ Credential جدیدی داخل کد نگهداری نمی‌کند.

## مراحل بعدی

1. Provider adapter با قرارداد مشترک و Timeout/Failure isolation.
2. Tool registry فقط برای APIهای Read-only تأییدشده چاکود.
3. ثبت Audit event برای درخواست‌های مدیریتی بدون ذخیره Secret یا Token.
4. صفحه `/admin/ai` فقط بعد از آماده شدن API و تست دسترسی.
5. هر Write Action احتمالی در آینده فقط با مجوز صریح، تأیید انسانی و Audit مستقل.

## نقطه بازگشت

Foundation باید در یک Commit مستقل باشد تا در صورت مشکل بدون اثر بر Moderation یا هسته سایت Revert شود.
