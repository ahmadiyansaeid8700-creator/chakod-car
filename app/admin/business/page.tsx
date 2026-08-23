import Link from "next/link";

const sections = [
  {
    title: "قیمت‌گذاری",
    description: "مدیریت قوانین قیمت، آگهی‌ها و تعرفه‌ها",
    items: [
      { title: "قیمت‌گذاری مرکزی", href: "/admin/business/pricing" },
      { title: "پکیج‌ها و خدمات", href: "/admin/business/packages" },
    ],
  },
  {
    title: "تخفیف و معرف",
    description: "مدیریت تخفیف‌ها و پورسانت معرف‌ها",
    items: [
      { title: "پورسانت معرف", href: "/admin/business/commissions" },
    ],
  },
  {
    title: "عملیات مالی",
    description: "سفارش‌ها، پرداخت‌ها و برگشت وجه",
    items: [
      { title: "سفارش‌ها", href: "/admin/business/orders" },
      { title: "پرداخت‌ها", href: "/admin/business/payments" },
      { title: "Refund", href: "/admin/business/refunds" },
    ],
  },
];

export default function BusinessAdminPage() {
  return (
    <main dir="rtl" style={{ padding: 24 }}>
      <h1>مرکز مدیریت تجارت چاکود</h1>
      <p>کنترل قیمت‌گذاری، درآمد، پرداخت و بازاریابی در یک پنل مرکزی.</p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginTop: 24,
        }}
      >
        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              border: "1px solid #ddd",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <div style={{ display: "grid", gap: 10 }}>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #eee",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
