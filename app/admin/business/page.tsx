import {
  AdminPage,
  AdminPanel,
  FeatureGrid,
  StatusPill,
} from "../components/AdminPage";

const commercialItems = [
  { title: "قیمت‌گذاری مرکزی", description: "تعرفه آگهی، خدمات ویژه، تخفیف و پورسانت", href: "/admin/business/pricing", icon: "٪" },
  { title: "پکیج‌ها و خدمات", description: "پکیج‌های شخصی، نمایشگاهی و جایگاه‌های ویژه", href: "/admin/business/packages", icon: "□" },
  { title: "معرف‌ها و پورسانت", description: "قوانین معرفی، سهم معرف و گزارش عملکرد", href: "/admin/business/commissions", icon: "◉" },
];

const financeItems = [
  { title: "سفارش‌ها", description: "چرخه سفارش و وضعیت ارائه خدمات", href: "/admin/business/orders", icon: "≡" },
  { title: "پرداخت‌ها", description: "تراکنش‌ها، پرداخت‌های موفق و ناموفق", href: "/admin/business/payments", icon: "▤" },
  { title: "بازگشت وجه", description: "درخواست‌ها و تاریخچه استرداد وجه", href: "/admin/business/refunds", icon: "↶" },
];

export default function BusinessAdminPage() {
  return (
    <AdminPage
      eyebrow="تجارت و درآمد"
      title="مرکز مدیریت تجارت چاکود"
      description="قیمت‌گذاری، درآمد، پرداخت‌ها و بازاریابی را از یک فضای کاری منظم کنترل کنید."
      actions={<StatusPill>قوانین مرکزی فعال</StatusPill>}
    >
      <AdminPanel title="محصولات و درآمد" description="تنظیمات تجاری که مستقیماً بر خرید و فروش خدمات اثر می‌گذارند.">
        <FeatureGrid items={commercialItems} />
      </AdminPanel>
      <AdminPanel title="عملیات مالی" description="پیگیری سفارش، پرداخت و بازگشت وجه در مسیرهای مشخص و مستقل.">
        <FeatureGrid items={financeItems} />
      </AdminPanel>
    </AdminPage>
  );
}
