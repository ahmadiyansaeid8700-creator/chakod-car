import ExistingOrderCheckoutClient from "./ExistingOrderCheckoutClient";

export const dynamic = "force-dynamic";

export default async function ExistingOrderCheckoutPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  return <ExistingOrderCheckoutClient orderNo={orderNo} />;
}
