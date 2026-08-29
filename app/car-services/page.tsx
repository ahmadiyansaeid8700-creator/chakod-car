import ServicesRoute from "../services/ServicesRoute";

export default function CarServicesPage() {
  return (
    <ServicesRoute
      initialType="car_service"
      basePath="/car-services"
      lockType
      kicker="راهنمای خدمات خودرویی چاکود"
      title="خدمات حرفه‌ای خودرو را نزدیک خودتان پیدا کنید"
      description="کارواش، دیتیلینگ، سرامیک، شیشه دودی و خدمات تخصصی خودرو."
    />
  );
}
