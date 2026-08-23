"use client";

export default function RefundsPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">مدیریت بازگشت وجه</h1>
      <p>مدیریت درخواست‌های Refund، وضعیت بررسی و تاریخچه بازگشت وجه.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border p-4">درخواست‌های جدید</div>
        <div className="rounded-xl border p-4">تایید شده</div>
        <div className="rounded-xl border p-4">رد شده</div>
      </div>
    </main>
  );
}
