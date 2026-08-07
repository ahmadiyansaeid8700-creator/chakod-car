import { redirect } from "next/navigation";

import BusinessPlacementOrderClient from "./BusinessPlacementOrderClient";
import CheckoutClient from "./CheckoutClient";

export default async function AccountPaymentCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    order_no?: string;
    service_key?: string;
    dealer_id?: string;
  }>;
}) {
  const query = await searchParams;
  const orderNo = String(query.order_no || "").trim();

  if (/^[a-z0-9_-]{6,100}$/i.test(orderNo)) {
    redirect(`/account/payments/checkout/order/${encodeURIComponent(orderNo)}`);
  }

  const serviceKey = String(query.service_key || "").trim();
  const dealerId = Math.round(Number(query.dealer_id || 0));

  if (serviceKey === "business_placement" && Number.isSafeInteger(dealerId) && dealerId > 0) {
    return <BusinessPlacementOrderClient dealerId={dealerId} />;
  }

  return <CheckoutClient />;
}
