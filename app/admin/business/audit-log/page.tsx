import { AdminPage, AdminPanel, FeatureGrid, StatusPill } from "../../components/AdminPage";

export default function AuditLogPage() {
  return (
    <AdminPage eyebrow="نظارت سیستم" title="گزارش تغییرات تجاری" description="تغییر قیمت‌ها، تنظیمات حساس، پرداخت‌ها و عملیات مدیران در این بخش قابل پیگیری است." actions={<StatusPill>ثبت رویداد فعال</StatusPill>}>
      <AdminPanel title="دسته‌بندی رویدادها" description="گزارش‌ها بدون تغییر در داده‌های عملیاتی نمایش داده می‌شوند.">
        <FeatureGrid items={[
          { title: "تغییرات قیمت", description: "تعرفه‌ها، تخفیف و پورسانت", icon: "٪" },
          { title: "تنظیمات سیستم", description: "تغییر قوانین و ظرفیت‌ها", icon: "⚙" },
          { title: "پرداخت‌ها", description: "رویدادهای مالی و بازگشت وجه", icon: "▤" },
          { title: "عملیات مدیران", description: "کاربر، زمان و نتیجه عملیات", icon: "⌁" },
        ]} />
      </AdminPanel>
    </AdminPage>
  );
}
