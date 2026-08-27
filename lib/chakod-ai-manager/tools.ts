export type ChakodAiToolStage = "available" | "registered" | "planned";

export type ChakodAiToolDescriptor = {
  id: string;
  title: string;
  description: string;
  scope: "read_only";
  stage: ChakodAiToolStage;
  dataSource: string;
};

const TOOL_CATALOG: readonly ChakodAiToolDescriptor[] = [
  {
    id: "manager_status",
    title: "وضعیت مدیر هوش مصنوعی",
    description: "خواندن وضعیت Feature Flag، Provider، Mode و آمادگی Runtime بدون نمایش Secret.",
    scope: "read_only",
    stage: "available",
    dataSource: "Chakod AI Manager runtime",
  },
  {
    id: "listing_moderation_status",
    title: "وضعیت Moderation آگهی",
    description: "بررسی آماده‌بودن سرویس مستقل Moderation بدون دسترسی به کلیدها یا محتوای محرمانه.",
    scope: "read_only",
    stage: "available",
    dataSource: "AI listing moderation",
  },
  {
    id: "listings_review_overview",
    title: "نمای کلی صف آگهی‌ها",
    description: "خلاصه Read-only از وضعیت صف بررسی آگهی‌ها برای تحلیل مدیریتی.",
    scope: "read_only",
    stage: "registered",
    dataSource: "Admin listings API",
  },
  {
    id: "businesses_overview",
    title: "نمای کلی کسب‌وکارها",
    description: "خلاصه Read-only از کسب‌وکارها، نمایشگاه‌ها و وضعیت بررسی آن‌ها.",
    scope: "read_only",
    stage: "registered",
    dataSource: "Admin businesses API",
  },
  {
    id: "commerce_health",
    title: "سلامت بخش مالی و تجاری",
    description: "گزارش Read-only از وضعیت ماژول‌های تجاری بدون اجرای تغییر مالی.",
    scope: "read_only",
    stage: "registered",
    dataSource: "Admin commerce API",
  },
  {
    id: "site_operations_summary",
    title: "خلاصه عملیات سایت",
    description: "تجمیع Read-only سیگنال‌های مدیریتی برای پیشنهاد و اولویت‌بندی اقدام‌ها.",
    scope: "read_only",
    stage: "planned",
    dataSource: "Approved admin APIs",
  },
];

export function getChakodAiToolCatalog() {
  return TOOL_CATALOG.map((tool) => ({ ...tool }));
}

export function getChakodAiToolSummary() {
  return TOOL_CATALOG.reduce(
    (summary, tool) => {
      summary.total += 1;
      summary[tool.stage] += 1;
      return summary;
    },
    { total: 0, available: 0, registered: 0, planned: 0 },
  );
}
