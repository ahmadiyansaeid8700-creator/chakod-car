import ServicesRoute from "../services/ServicesRoute";

export default function WorkshopsPage() {
  return (
    <ServicesRoute
      initialType="repair_shop"
      basePath="/workshops"
      lockType
      kicker="تعمیرگاه‌های چاکود"
      title="تعمیرکار و تعمیرگاه مناسب خودرو را پیدا کنید"
      description="مکانیکی، برق خودرو، سرویس دوره‌ای و خدمات تخصصی تعمیر و نگهداری."
    />
  );
}
