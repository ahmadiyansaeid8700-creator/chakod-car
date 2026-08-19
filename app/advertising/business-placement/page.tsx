import AdvertisingProductPage from "../../components/advertising/AdvertisingProductPage";

export default function AdvertisingBusinessPlacementPage() {
  return (
    <AdvertisingProductPage
      eyebrow="BUSINESS PLACEMENT"
      title="جایگاه ویژه کسب و کار"
      intro="کسب و کار خودرویی تایید شده می تواند از محصولات دیده شدن فعال چاکود برای نمایش بالاتر در محدوده و دسته مرتبط استفاده کند."
      ctaLabel="مدیریت تبلیغات کسب و کار"
      ctaHref="/account/business/promotions"
      steps={[
        { title: "انتخاب مجموعه", text: "کسب و کار قابل مدیریت خود را از مرکز فرمان حساب انتخاب کنید." },
        { title: "انتخاب محصول", text: "جایگاه فعال کسب و کار از فهرست Commerce نمایش داده می شود." },
        { title: "ثبت سفارش", text: "مبلغ فعال سمت سرور در سفارش قفل می شود و هدف سفارش همان مجموعه است." },
        { title: "پرداخت و نمایش", text: "پس از پرداخت معتبر، جایگاه مطابق قواعد و مدت محصول فعال می شود." },
      ]}
      notes={[
        "جایگاه پولی با پروفایل عادی کسب و کار یکی نیست.",
        "فقط مجموعه ای که کاربر مجوز مدیریت آن را دارد قابل انتخاب است.",
      ]}
    />
  );
}
