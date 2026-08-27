import { permanentRedirect } from "next/navigation";
import { carDetailPath } from "../../../lib/car-routes";

export default async function LegacyListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(carDetailPath(id));
}
