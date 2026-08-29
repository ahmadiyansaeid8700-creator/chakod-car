import BusinessesPage from "../businesses/page";
import { prelaunchServerFixturesEnabled } from "../../lib/prelaunch-server-fixtures";
import ServicesFixtureFallback from "../services/ServicesFixtureFallback";
import { stagingServiceItems } from "../services/ServicesRoute";

export default function WorkshopsPage() {
  if (prelaunchServerFixturesEnabled()) {
    return (
      <ServicesFixtureFallback
        items={stagingServiceItems()}
        initialType="repair_shop"
        basePath="/workshops"
        lockType
        kicker="تعمیرگاه‌های چاکود"
        title="تعمیرکار و تعمیرگاه مناسب خودرو را پیدا کنید"
        description="مکانیکی، برق خودرو، سرویس دوره‌ای و خدمات تخصصی تعمیر و نگهداری."
      />
    );
  }

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
