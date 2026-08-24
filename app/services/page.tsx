import type { Metadata } from "next";

import BusinessesPage from "../businesses/page";

export const metadata: Metadata = {
  title: "بازار خدمات خودرو چاکود",
  description: "پیدا کردن تعمیرگاه، تعمیرکار، فروشگاه لوازم یدکی و خدمات تخصصی خودرو در بازار خدمات چاکود.",
};

export default function ServicesMarketPage() {
  return <BusinessesPage
    basePath="/services"
    marketMode
    kicker="بازار خدمات"
    title="بازار خدمات خودرو چاکود"
    description="تعمیرکار، خدمات خودرویی و فروشگاه لوازم یدکی را بر اساس تخصص، موقعیت و خدمات پیدا کن."
  />;
}
