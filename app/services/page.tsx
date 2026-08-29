import type { Metadata } from "next";

import BusinessesPage from "../businesses/page";
import { PRELAUNCH_BUSINESSES } from "../../lib/prelaunch-fixtures";
import { prelaunchServerFixturesEnabled } from "../../lib/prelaunch-server-fixtures";

export const metadata: Metadata = {
  title: "بازار خدمات خودرو چاکود",
  description: "پیدا کردن تعمیرگاه، تعمیرکار، فروشگاه لوازم یدکی و خدمات تخصصی خودرو در بازار خدمات چاکود.",
};

export default function ServicesMarketPage() {
  const initialItems = prelaunchServerFixturesEnabled()
    ? PRELAUNCH_BUSINESSES.map((item) => ({
        ...item,
        category_labels: [...item.category_labels],
        services: [...item.services],
        category_keys: [...item.category_keys],
      }))
    : [];

  return <BusinessesPage
    basePath="/services"
    marketMode
    initialItems={initialItems}
    kicker="بازار خدمات"
    title="بازار خدمات خودرو چاکود"
    description="تعمیرکار، خدمات خودرویی و فروشگاه لوازم یدکی را بر اساس تخصص، موقعیت و خدمات پیدا کن."
  />;
}
