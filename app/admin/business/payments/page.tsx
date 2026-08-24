import { AdminPage, AdminPanel, FeatureGrid, StatusPill } from "../../components/AdminPage";

export default function PaymentsManagementPage() {
  return (
    <AdminPage eyebrow="عملیات مالی" title="مدیریت پرداخت‌ها" description="تراکنش‌ها و اتصال پرداخت‌ها به سفارش‌های تجاری را شفاف و منظم بررسی کنید." actions={<StatusPill>درگاه مرکزی</StatusPill>}>
      <AdminPanel title="مرکز تراکنش‌ها" description="نمای کاری موردنیاز برای کنترل جریان پرداخت">
        <FeatureGrid items={[
          { title: "همه تراکنش‌ها", description: "جستجو و بررسی پرداخت‌های ثبت‌شده", icon: "▤" },
          { title: "پرداخت‌های موفق", description: "تراکنش‌های نهایی و تطبیق‌شده", icon: "✓" },
          { title: "پرداخت‌های ناموفق", description: "خطاها و پرداخت‌های ناقص", icon: "!" },
          { title: "بازگشت وجه", description: "ارجاع به چرخه استرداد وجه", href: "/admin/business/refunds", icon: "↶" },
          { title: "گزارش مالی", description: "خلاصه عملکرد درآمدی چاکود", icon: "◫" },
        ]} />
      </AdminPanel>
    </AdminPage>
  );
}
