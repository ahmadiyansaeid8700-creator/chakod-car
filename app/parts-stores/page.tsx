import ServicesRoute from "../services/ServicesRoute";

export default function PartsStoresPage() {
  return (
    <ServicesRoute
      initialType="parts_store"
      basePath="/parts-stores"
      lockType
      kicker="فروشگاه‌های قطعات چاکود"
      title="قطعات و لوازم خودرو را از فروشگاه‌های معتبر پیدا کنید"
      description="قطعات یدکی، لاستیک، باتری و لوازم جانبی خودرو در سراسر ایران."
    />
  );
}
