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
    kicker="بازار تخصص و مهارت‌های خودرویی"
    title="بازار خدمات خودرو چاکود"
    description="از تعمیر موتور و برق خودرو تا قطعه، تعویض روغن، کارواش و دیتیلینگ؛ متخصص مناسب را نزدیک خودت پیدا کن و مستقیم وارد پروفایلش شو."
  />;
}
