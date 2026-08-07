import Link from "next/link";

import CommerceAdminClient from "./CommerceAdminClient";

export const dynamic = "force-dynamic";

const quickLinks = [
  { href: "/admin/featured-showrooms", label: "مدیریت نمایشگاه های منتخب" },
  { href: "/admin/refunds", label: "مدیریت بازپرداخت" },
  { href: "/admin/support", label: "مدیریت پشتیبانی" },
];

export default function AdminCommercePage() {
  return (
    <>
      <div
        dir="rtl"
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "14px auto 0",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "flex-end",
        }}
      >
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "inline-flex",
              minHeight: 40,
              alignItems: "center",
              borderRadius: 12,
              padding: "0 14px",
              background: "#6d28d9",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <CommerceAdminClient />
    </>
  );
}
