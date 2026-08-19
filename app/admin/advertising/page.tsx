import Link from "next/link";

export const dynamic = "force-dynamic";

const modules = [
  {
    title: "نمایشگاه های منتخب",
    text: "رزروهای پرداخت شده را بررسی، تایید یا رد کنید و بازه نمایش را کنترل کنید.",
    href: "/admin/featured-showrooms",
  },
  {
    title: "استوری و تعرفه استان ها",
    text: "قیمت استوری، فعال بودن استان ها و خدمات تبلیغاتی از Commerce اصلی مدیریت می شوند.",
    href: "/admin/commerce",
  },
  {
    title: "سفارش ها و پرداخت های تبلیغاتی",
    text: "وضعیت سفارش، پرداخت، تخفیف، فاکتور و بازپرداخت را از مرکز مالی بررسی کنید.",
    href: "/admin/orders",
  },
  {
    title: "سوابق تبلیغات قدیمی",
    text: "رزروهای Legacy بنر فقط برای سازگاری و سابقه نگهداری می شوند و محصول صفحه اول نیستند.",
    href: "/admin/commerce",
  },
];

export default function AdminAdvertisingPage() {
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#f8f6fb", padding: "28px 18px 90px", color: "#24162f" }}>
      <div style={{ width: "min(1120px, 100%)", margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#6d28d9", fontWeight: 900, textDecoration: "none" }}>← داشبورد مدیریت</Link>
        <header style={{ margin: "18px 0 22px", borderRadius: 24, padding: "28px", color: "#fff", background: "linear-gradient(135deg,#32104f,#6d28d9)" }}>
          <span style={{ fontSize: 11, fontWeight: 900, opacity: .8 }}>ADVERTISING CONTROL</span>
          <h1 style={{ margin: "7px 0 9px" }}>مدیریت تبلیغات چاکود</h1>
          <p style={{ margin: 0, lineHeight: 2, opacity: .82 }}>هر محصول از پنل canonical خودش مدیریت می شود؛ هیچ سیستم قیمت یا رزرو موازی در این صفحه ساخته نشده است.</p>
        </header>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
          {modules.map((item) => (
            <Link key={item.title} href={item.href} style={{ display: "flex", minHeight: 190, flexDirection: "column", border: "1px solid #e7dff0", borderRadius: 20, background: "#fff", padding: 22, color: "inherit", textDecoration: "none", boxShadow: "0 14px 36px rgba(57,37,78,.06)" }}>
              <strong style={{ fontSize: 18 }}>{item.title}</strong>
              <p style={{ color: "#76677f", lineHeight: 1.9 }}>{item.text}</p>
              <span style={{ marginTop: "auto", color: "#6d28d9", fontWeight: 900 }}>ورود به بخش ←</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
