import Link from "next/link";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { isAdminEmail } from "../../../lib/admin-access";
import AdminReservationsClient from "./AdminReservationsClient";

export const dynamic = "force-dynamic";

export default async function AdminBannerReservationsPage() {
  const user = await requireChatGPTUser("/admin/banner-reservations");

  if (!(await isAdminEmail(user.email))) {
    return (
      <main className="dashboardShell" dir="rtl">
        <div className="accessDenied">
          <span>دسترسی محدود</span>
          <h1>این صفحه فقط برای مدیریت چاکود است</h1>
          <p>حساب شما در فهرست مدیران سایت قرار ندارد.</p>
          <Link href="/">بازگشت به صفحه اصلی</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboardShell adminDashboard" dir="rtl">
      <header className="dashboardHeader">
        <Link className="dashboardBrand" href="/">
          <img src="/chakod-logo.png" alt="چاکود" />
        </Link>
        <div>
          <span>مدیریت چاکود</span>
          <a href="/account/ads" className="dashboardSignout">
            پنل کسب‌وکار
          </a>
        </div>
      </header>
      <AdminReservationsClient />
    </main>
  );
}
