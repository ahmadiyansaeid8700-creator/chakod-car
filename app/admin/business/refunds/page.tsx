import { AdminPage, AdminPanel, FeatureGrid } from "../../components/AdminPage";

export default function RefundsPage() {
  return (
    <AdminPage eyebrow="عملیات مالی" title="مدیریت بازگشت وجه" description="درخواست‌های استرداد را بر اساس وضعیت بررسی و سابقه هر سفارش مدیریت کنید.">
      <AdminPanel title="وضعیت درخواست‌ها" description="صف‌های کاری بازگشت وجه">
        <FeatureGrid items={[
          { title: "درخواست‌های جدید", description: "در انتظار بررسی اولیه", icon: "●" },
          { title: "تأییدشده", description: "آماده یا انجام‌شده برای بازپرداخت", icon: "✓" },
          { title: "ردشده", description: "درخواست‌های بسته‌شده با دلیل", icon: "×" },
        ]} />
      </AdminPanel>
    </AdminPage>
  );
}
