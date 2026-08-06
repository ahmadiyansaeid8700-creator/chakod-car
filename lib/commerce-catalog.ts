export type CommerceProductType = "promotion" | "subscription";

export type CommerceCatalogItem = {
  type: CommerceProductType;
  code: string;
  title: string;
  description: string;
  amountToman: number;
};

const catalog: CommerceCatalogItem[] = [
  {
    type: "promotion",
    code: "boost",
    title: "بالابر آگهی",
    description: "انتقال آگهی به ابتدای نتایج مرتبط",
    amountToman: 149_000,
  },
  {
    type: "promotion",
    code: "featured",
    title: "آگهی ویژه",
    description: "نمایش برجسته‌تر همراه نشان ویژه",
    amountToman: 349_000,
  },
  {
    type: "promotion",
    code: "story",
    title: "استوری منطقه‌ای",
    description: "نمایش استوری برای کاربران محدوده انتخابی",
    amountToman: 690_000,
  },
  {
    type: "subscription",
    code: "professional",
    title: "اشتراک حرفه‌ای",
    description: "فعال‌سازی امکانات حرفه‌ای کسب‌وکار برای یک ماه",
    amountToman: 1_490_000,
  },
  {
    type: "subscription",
    code: "dealership",
    title: "اشتراک نمایشگاه حرفه‌ای",
    description: "مدیریت تیم، موجودی خودرو و گزارش حرفه‌ای برای یک ماه",
    amountToman: 2_490_000,
  },
];

export function getCommerceCatalogItem(type: string, code: string) {
  return catalog.find((item) => item.type === type && item.code === code) || null;
}

export function getCommerceCatalog() {
  return catalog.map((item) => ({ ...item }));
}
