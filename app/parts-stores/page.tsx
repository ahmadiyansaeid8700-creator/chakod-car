import BusinessesPage from "../businesses/page";
import { prelaunchServerFixturesEnabled } from "../../lib/prelaunch-server-fixtures";
import ServicesFixtureFallback from "../services/ServicesFixtureFallback";
import { stagingServiceItems } from "../services/ServicesRoute";

export default function PartsStoresPage() {
  if (prelaunchServerFixturesEnabled()) {
    return (
      <ServicesFixtureFallback
        items={stagingServiceItems()}
        initialType="parts_store"
        basePath="/parts-stores"
        lockType
        kicker="فروشگاه‌های قطعات چاکود"
        title="قطعات و لوازم خودرو را از فروشگاه‌های معتبر پیدا کنید"
        description="قطعات یدکی، لاستیک، باتری و لوازم جانبی خودرو در سراسر ایران."
      />
    );
  }

  return (
    <BusinessesPage
      initialType="parts_store"
      basePath="/parts-stores"
      lockType
      kicker="فروشگاه‌های قطعات چاکود"
      title="قطعات و لوازم خودرو را از فروشگاه‌های معتبر پیدا کنید"
      description="قطعات یدکی، لاستیک، باتری و لوازم جانبی خودرو در سراسر ایران."
    />
  );
}
