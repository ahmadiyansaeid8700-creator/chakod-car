import Link from "next/link";

const documents = [
  { href: "/terms", title: "شرایط استفاده" },
  { href: "/privacy", title: "حریم خصوصی" },
  { href: "/refund-policy", title: "سیاست بازپرداخت" },
  { href: "/legal", title: "اطلاعات حقوقی" },
  { href: "/rules", title: "قوانین چاکود" },
];

export default function AdminLegalPage() {
  return (
    <main dir="rtl" style={{ minHeight: "100vh", padding: "28px 18px 90px", background: "#f8f6fb", color: "#24162f" }}>
      <div style={{ width: "min(980px, 100%)", margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#6d28d9", fontWeight: 900, textDecoration: "none" }}>← مدیریت</Link>
        <header style={{ margin: "18px 0 22px", padding: 26, borderRadius: 22, background: "#fff", border: "1px solid #e7dff0" }}>
          <span style={{ color: "#6d28d9", fontWeight: 900, fontSize: 12 }}>LEGAL REVIEW</span>
          <h1 style={{ margin: "8px 0" }}>بازبینی صفحات حقوقی</h1>
          <p style={{ margin: 0, color: "#76677f", lineHeight: 1.9 }}>این صفحه مسیر بازبینی نسخه عمومی اسناد حقوقی لانچ است. متن حقوقی جدید بدون تایید مالک یا قرارداد محتوایی جداگانه ساخته نمی‌شود.</p>
        </header>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {documents.map((item) => (
            <Link key={item.href} href={item.href} target="_blank" style={{ minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 18, borderRadius: 18, border: "1px solid #e7dff0", background: "#fff", color: "inherit", textDecoration: "none" }}>
              <strong>{item.title}</strong>
              <span style={{ color: "#6d28d9", fontWeight: 900 }}>باز کردن نسخه عمومی ←</span>
            </Link>
          ))}
        </section>
        <div style={{ marginTop: 18, padding: 18, borderRadius: 18, background: "#fff", border: "1px solid #e7dff0" }}>
          <strong>محتوای آموزشی و مقاله‌ها</strong>
          <p style={{ color: "#76677f", lineHeight: 1.8 }}>برای مدیریت محتوای CMS از بخش مقالات استفاده کنید.</p>
          <Link href="/admin/articles" style={{ color: "#6d28d9", fontWeight: 900 }}>رفتن به مدیریت محتوا</Link>
        </div>
      </div>
    </main>
  );
}
