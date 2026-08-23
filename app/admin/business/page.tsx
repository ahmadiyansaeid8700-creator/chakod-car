import Link from "next/link";

const modules = [
  { title: "قیمت‌گذاری مرکزی", href: "/admin/business/pricing", status: "آماده اتصال" },
  { title: "پکیج‌ها و خدمات", href: "/admin/business/packages", status: "در حال ساخت" },
  { title: "سفارش‌ها", href: "/admin/business/orders", status: "در حال ساخت" },
  { title: "پرداخت‌ها", href: "/admin/business/payments", status: "در حال ساخت" },
  { title: "پورسانت معرف", href: "/admin/business/commissions", status: "در حال ساخت" },
  { title: "Refund", href: "/admin/business/refunds", status: "در حال ساخت" },
];

export default function BusinessAdminPage() {
  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>مدیریت تجاری چاکود</h1>
      <p>مرکز کنترل قیمت‌ها، خدمات، پرداخت و درآمدزایی سایت.</p>

      <section style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {modules.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              border: "1px solid #ddd",
              borderRadius: 16,
              padding: 18,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <strong>{item.title}</strong>
            <div>{item.status}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
