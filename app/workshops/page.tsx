import BusinessesPage from "../businesses/page";

export default function WorkshopsPage() {
  return (
    <BusinessesPage
      initialType="repair_shop"
      basePath="/workshops"
      lockType
      kicker="تعمیرگاه‌های چاکود"
      title="تعمیرکار و تعمیرگاه مناسب خودرو را پیدا کنید"
      description="مکانیکی، برق خودرو، سرویس دوره‌ای و خدمات تخصصی تعمیر و نگهداری."
    />
  );
}
