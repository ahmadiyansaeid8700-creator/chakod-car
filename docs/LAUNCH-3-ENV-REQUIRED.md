# Launch-3 Environment Contract

این فایل فقط نام و نقش Environment Variableهای جدید Launch-3 را ثبت می کند. هیچ مقدار واقعی، Merchant Secret یا Token نباید در Git ذخیره شود.

## Wallet Settlement

پرداخت مستقیم خدمات با موجودی کیف پول فقط زمانی فعال شود که Backend اصلی قرارداد Settlement را ارائه کند:

```text
CHAKOD_WALLET_SETTLEMENT_ENDPOINT
CHAKOD_WALLET_SETTLEMENT_ACTION
CHAKOD_WALLET_SETTLEMENT_SECRET
```

### رفتار Fail-safe

- نبود `ENDPOINT` باعث می شود پرداخت کیف پول برای خرید خدمت شروع نشود.
- Secret فقط سمت سرور خوانده می شود.
- Timeout مبهم نباید باعث برداشت دوباره شود.
- سفارش در حالت بازیابی/بررسی باقی می ماند تا نتیجه قطعی شود.

## Gateway Refund

بازپرداخت بانکی فقط با Adapter سروری فعال می شود:

```text
CHAKOD_REFUND_ENDPOINT
CHAKOD_REFUND_ACTION
CHAKOD_REFUND_SECRET
```

### رفتار Fail-safe

- نبود Endpoint باعث می شود مدیر نتواند بازپرداخت بانکی را موفق علامت بزند.
- بازپرداخت کیف پول مستقل از Gateway Adapter قابل اجرا است.
- درخواست بازپرداخت قبل از اجرا از `approved` به `processing` قفل می شود تا درخواست همزمان دوباره اجرا نشود.
- Secret فقط در Server Environment قرار می گیرد.

## Existing Payment Gateway

تنظیمات درگاه بانکی اصلی باید مطابق قرارداد موجود Backend `api.chakod.com` و Environment فعلی پروژه ادامه پیدا کند. این فایل نام یا مقدار جدیدی برای Merchant ID فعلی حدس نمی زند.

## D1 / Drizzle

قبل از اجرای قابلیت های زیر در محیط تازه، Migration استاندارد Drizzle باید از `db/schema.ts` تولید و روی D1 همان محیط اعمال شود:

```text
wallets
wallet_transactions
commerce_orders
payment_attempts
invoices
payment_refunds
featured_showroom_placements
support_tickets
support_replies
```

`banner_reservations` فقط برای سازگاری Legacy در Schema باقی مانده و محصول بنر نمایشگاهی صفحه اول دیگر در UI وجود ندارد.

## قوانین Secret

- هیچ Secret در Commit، Screenshot، Client Component یا پاسخ Public API قرار نگیرد.
- فایل `.env` واقعی Commit نشود.
- Client فقط capability/status عمومی مثل `wallet_payment_ready` یا `gateway_refund_ready` دریافت کند.
- پیام خطا نباید مقدار Secret یا Header داخلی را افشا کند.
