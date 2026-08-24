import { AdminPage, AdminPanel, FeatureGrid } from "../../components/AdminPage";

export default function CommissionManagementPage() {
  return (
    <AdminPage eyebrow="تجارت و درآمد" title="معرف‌ها و پورسانت" description="تخفیف کاربر معرفی‌شده و سهم معرف را مستقل و قابل پیگیری مدیریت کنید.">
      <AdminPanel title="قوانین و گزارش‌ها" description="اجزای اصلی چرخه معرفی">
        <FeatureGrid items={[
          { title: "درصد پورسانت معرف", description: "سهم معرف از خریدهای واجد شرایط", icon: "٪" },
          { title: "تخفیف کاربر جدید", description: "تخفیف مستقل برای معرفی‌شونده", icon: "◉" },
          { title: "خریدهای مشمول", description: "خدماتی که پورسانت ایجاد می‌کنند", icon: "□" },
          { title: "سوابق پرداخت", description: "تاریخچه تسویه پورسانت‌ها", icon: "▤" },
          { title: "عملکرد معرف‌ها", description: "گزارش تبدیل و درآمد هر معرف", icon: "◫" },
        ]} />
      </AdminPanel>
    </AdminPage>
  );
}
