import AdvertisingProductPage from "../../components/advertising/AdvertisingProductPage";

export default function AdvertisingStoriesPage() {
  return (
    <AdvertisingProductPage
      eyebrow="LISTING STORIES"
      title="استوری آگهی خودرو"
      intro="برای یک آگهی قابل مدیریت، محصول استوری فعال را انتخاب کنید تا سفارش با همان شناسه آگهی ساخته شود و پس از پرداخت در محدوده تعریف شده نمایش داده شود."
      ctaLabel="انتخاب آگهی برای استوری"
      ctaHref="/account/listings"
      steps={[
        { title: "انتخاب آگهی", text: "از آگهی های من وارد مدیریت آگهی موردنظر شوید." },
        { title: "انتخاب استوری", text: "در بخش ارتقای آگهی، سرویس استوری فعال Commerce را انتخاب کنید." },
        { title: "پرداخت", text: "سفارش به Checkout واحد می رود و با کیف پول یا درگاه پرداخت می شود." },
        { title: "فعال سازی", text: "پس از Settlement معتبر، سرویس براساس قرارداد Commerce روی همان آگهی اعمال می شود." },
      ]}
      notes={[
        "آگهی هدف در سمت سرور باید متعلق به همان حساب یا نمایشگاه قابل مدیریت باشد.",
        "تعرفه از مرورگر تعیین نمی شود و از Commerce فعال خوانده می شود.",
      ]}
    />
  );
}
