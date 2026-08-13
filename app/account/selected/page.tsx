import CommerceProductsPage from "../finance/CommerceProductsPage";

export default function AccountSelectedPage() {
  return (
    <CommerceProductsPage
      mode="promotions"
      serviceKeys={["business_placement", "dealership_placement"]}
      eyebrowOverride="CHAKOD SELECTED"
      titleOverride="رزرو منتخب چاکود"
      descriptionOverride="جایگاه منتخب نمایشگاه یا کسب‌وکار را از داخل حساب انتخاب کنید و رزرو را بدون خروج از پنل ادامه دهید."
    />
  );
}
