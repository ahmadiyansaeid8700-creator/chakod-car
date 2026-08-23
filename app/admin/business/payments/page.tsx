export default function PaymentsManagementPage() {
  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>مدیریت پرداخت‌ها</h1>
      <p>
        این بخش برای مدیریت تراکنش‌های تجاری، وضعیت پرداخت، بازگشت وجه و
        اتصال به درگاه پرداخت مرکزی آماده شده است.
      </p>

      <section>
        <h2>موارد قابل مدیریت</h2>
        <ul>
          <li>لیست تراکنش‌ها</li>
          <li>وضعیت پرداخت سفارش‌ها</li>
          <li>پرداخت‌های ناموفق</li>
          <li>بازگشت وجه (Refund)</li>
          <li>گزارش مالی</li>
        </ul>
      </section>
    </main>
  );
}
