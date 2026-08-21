import BusinessesPage from "../businesses/page";

export default function PartsStoresPage() {
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
