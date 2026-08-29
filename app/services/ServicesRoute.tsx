import BusinessesPage from "../businesses/page";
import { PRELAUNCH_BUSINESSES } from "../../lib/prelaunch-fixtures";
import { prelaunchServerFixturesEnabled } from "../../lib/prelaunch-server-fixtures";
import ServicesFixtureFallback, { type FixtureBusiness } from "./ServicesFixtureFallback";

export type ServiceBusinessType = "car_service" | "parts_store" | "repair_shop";

type Props = {
  initialType?: "" | ServiceBusinessType;
  basePath: string;
  lockType?: boolean;
  kicker: string;
  title: string;
  description: string;
  marketMode?: boolean;
};

export function stagingServiceItems(): FixtureBusiness[] {
  return PRELAUNCH_BUSINESSES.map((item) => ({
    id: Number(item.id),
    slug: String(item.slug),
    business_type: item.business_type as ServiceBusinessType,
    business_type_title: String(item.business_type_title),
    name: String(item.name),
    province: String(item.province),
    city: String(item.city),
    neighborhood: String(item.neighborhood),
    description: String(item.description),
    category_labels: [...item.category_labels],
    services: [...item.services],
    category_keys: [...item.category_keys],
    logo_url: String(item.logo_url),
    cover_url: String(item.cover_url),
    mobile_service: Boolean(item.mobile_service),
    price_range_text: String(item.price_range_text),
    is_verified: Boolean(item.is_verified),
  }));
}

export default function ServicesRoute({
  initialType = "",
  basePath,
  lockType = false,
  kicker,
  title,
  description,
  marketMode = false,
}: Props) {
  if (prelaunchServerFixturesEnabled()) {
    return (
      <ServicesFixtureFallback
        items={stagingServiceItems()}
        initialType={initialType}
        lockType={lockType}
        basePath={basePath}
        kicker={kicker}
        title={title}
        description={description}
      />
    );
  }

  return (
    <BusinessesPage
      initialType={initialType}
      basePath={basePath}
      lockType={lockType}
      kicker={kicker}
      title={title}
      description={description}
      marketMode={marketMode}
    />
  );
}
