import BusinessesPage from "../businesses/page";

export default function DealershipsPage() {
  return (
    <BusinessesPage
      initialType="dealer"
      basePath="/dealerships"
      lockType
      kicker="دایرکتوری نمایشگاه‌های چاکود"
      title="نمایشگاه‌های خودرو را یک‌جا مقایسه کنید"
      description="نمایشگاه‌های تأییدشده را براساس نام و شهر پیدا کنید و اطلاعات کامل هر مجموعه را ببینید."
    />
  );
}
