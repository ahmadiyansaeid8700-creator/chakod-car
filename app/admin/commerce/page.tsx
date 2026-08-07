import Link from "next/link";

import CommerceAdminClient from "./CommerceAdminClient";

export const dynamic = "force-dynamic";

export default function AdminCommercePage() {
  return (
    <>
      <div dir="rtl" style={{ width: "min(1180px, calc(100% - 32px))", margin: "14px auto 0", display: "flex", justifyContent: "flex-end" }}>
        <Link
          href="/admin/featured-showrooms"
          style={{ display: "inline-flex", minHeight: 40, alignItems: "center", borderRadius: 12, padding: "0 14px", background: "#6d28d9", color: "#fff", fontSize: 12, fontWeight: 900, textDecoration: "none" }}
        >
          مدیریت نمایشگاه های منتخب
        </Link>
      </div>
      <CommerceAdminClient />
    </>
  );
}
