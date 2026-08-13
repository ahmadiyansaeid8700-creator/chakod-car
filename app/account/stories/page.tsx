import CommerceProductsPage from "../finance/CommerceProductsPage";

export default function AccountStoriesPage() {
  return (
    <CommerceProductsPage
      mode="promotions"
      serviceKeys={["listing_story"]}
      eyebrowOverride="CHAKOD STORIES"
      titleOverride="استوری چاکود"
      descriptionOverride="استوری را از داخل حساب مدیریت کنید؛ آگهی واقعی را انتخاب کنید و سفارش استوری را از همان مسیر حساب ادامه دهید."
    />
  );
}
