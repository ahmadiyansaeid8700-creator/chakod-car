import BusinessesPage from "../businesses/page";
import { prelaunchServerFixturesEnabled } from "../../lib/prelaunch-server-fixtures";
import ServicesFixtureFallback from "../services/ServicesFixtureFallback";
import { stagingServiceItems } from "../services/ServicesRoute";

export default function CarServicesPage() {
  if (prelaunchServerFixturesEnabled()) {
    return (
      <ServicesFixtureFallback
        items={stagingServiceItems()}
        initialType="car_service"
        basePath="/car-services"
        lockType
        kicker="راهنمای خدمات خودرویی چاکود"
        title="خدمات حرفه‌ای خودرو را نزدیک خودتان پیدا کنید"
        description="کارواش، دیتیلینگ، سرامیک، شیشه دودی و خدمات تخصصی خودرو."
      />
    );
  }

  return (
    <BusinessesPage
      initialType="car_service"
      basePath="/car-services"
      lockType
      kicker="راهنمای خدمات خودرویی چاکود"
      title="خدمات حرفه‌ای خودرو را نزدیک خودتان پیدا کنید"
      description="کارواش، دیتیلینگ، سرامیک، شیشه دودی و خدمات تخصصی خودرو."
    />
  );
}
