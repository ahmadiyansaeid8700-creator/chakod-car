import { AdminPage, AdminPanel, FeatureGrid, StatusPill } from "../../components/AdminPage";

export default function OrdersManagementPage() {
  return (
    <AdminPage eyebrow="عملیات مالی" title="مدیریت سفارش‌ها" description="چرخه سفارش‌های تجاری و وضعیت ارائه هر خدمت را از یک نمای واحد پیگیری کنید." actions={<StatusPill>بخش عملیاتی</StatusPill>}>
      <AdminPanel title="چرخه سفارش" description="دسته‌بندی‌های اصلی سفارش در چاکود">
        <FeatureGrid items={[
          { title: "ثبت آگهی", description: "سفارش‌های ثبت و تمدید آگهی", icon: "☷" },
          { title: "پکیج نمایشگاه", description: "خرید و تمدید پکیج نمایشگاه‌ها", icon: "□" },
          { title: "خدمات ویژه", description: "جایگاه‌ها و امکانات تبلیغاتی", icon: "★" },
          { title: "وضعیت پرداخت", description: "تطبیق سفارش با تراکنش مالی", icon: "▤" },
          { title: "تاریخچه تغییرات", description: "رویدادهای ثبت‌شده برای هر سفارش", icon: "⌁" },
        ]} />
      </AdminPanel>
    </AdminPage>
  );
}
