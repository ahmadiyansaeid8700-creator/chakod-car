import Link from "next/link";
import type { ReactNode } from "react";

export default async function BusinessProfileLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const safeSlug = String(slug || "").trim().slice(0, 160);
  const subject = `گزارش پروفایل کسب‌وکار ${safeSlug}`;
  const message = `صفحه مورد گزارش: /businesses/${safeSlug}\nدلیل گزارش را اینجا بنویسید: `;
  const href = `/support?topic=report&subject=${encodeURIComponent(subject)}&message=${encodeURIComponent(message)}#request`;

  return (
    <>
      {children}
      <section
        dir="rtl"
        style={{
          width: "min(1180px, calc(100% - 24px))",
          margin: "0 auto 42px",
          border: "1px solid #eadff2",
          borderRadius: 18,
          background: "#fff",
          padding: "17px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ display: "block", color: "#2c1d37", marginBottom: 4 }}>
            اطلاعات نادرست یا تخلف در این کسب‌وکار دیدید؟
          </strong>
          <span style={{ color: "#776980", fontSize: 12 }}>
            گزارش شما با آدرس همین پروفایل برای پشتیبانی چاکود ثبت و قابل پیگیری می‌شود.
          </span>
        </div>
        <Link
          href={href}
          style={{
            display: "inline-flex",
            minHeight: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: "#f4effb",
            padding: "0 14px",
            color: "#6d28d9",
            fontSize: 12,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          گزارش کسب‌وکار
        </Link>
      </section>
    </>
  );
}
