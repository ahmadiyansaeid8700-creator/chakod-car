import { redirect } from "next/navigation";

import CheckoutClient from "./CheckoutClient";

export default async function AccountPaymentCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order_no?: string }>;
}) {
  const query = await searchParams;
  const orderNo = String(query.order_no || "").trim();

  if (/^[a-z0-9_-]{6,100}$/i.test(orderNo)) {
    redirect(`/account/payments/checkout/order/${encodeURIComponent(orderNo)}`);
  }

  return <CheckoutClient />;
}
