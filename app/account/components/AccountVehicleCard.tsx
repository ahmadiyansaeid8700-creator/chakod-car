import Link from "next/link";

import ListingCard from "../../components/ListingCard";
import styles from "./AccountVehicleCard.module.css";

export type AccountVehicleCardAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary" | "story";
};

export type AccountVehicleCardData = {
  id: number;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: string | number | null;
  priceToman?: string | number | null;
  mileageKm?: string | number | null;
  color?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  coverImageUrl?: string | null;
  statusCode?: string | null;
  statusLabel?: string | null;
  submittedByDisplayName?: string | null;
  submittedByRole?: string | null;
  publisherFallback?: string | null;
  viewsCount?: number | null;
  favoriteCount?: number | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "مالک",
  manager: "مدیر",
  branch_manager: "مدیر شعبه",
  sales: "کارشناس فروش",
  content: "مدیر محتوا",
  finance: "مالی",
  viewer: "ناظر",
};

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function vehicleTitle(data: AccountVehicleCardData) {
  return String(data.title || [data.brand, data.model].filter(Boolean).join(" ") || `آگهی ${data.id}`);
}

export default function AccountVehicleCard({
  data,
  primaryHref,
  actions = [],
}: {
  data: AccountVehicleCardData;
  primaryHref: string;
  actions?: AccountVehicleCardAction[];
}) {
  const title = vehicleTitle(data);
  const publisher = String(data.submittedByDisplayName || data.publisherFallback || "ثبت‌کننده نامشخص").trim();
  const role = ROLE_LABELS[String(data.submittedByRole || "").trim().toLowerCase()] || "";
  const statusLabel = String(data.statusLabel || "وضعیت نامشخص").trim();

  return (
    <ListingCard
      href={primaryHref}
      showSave={false}
      badge={statusLabel}
      identityName={publisher}
      identityDetail={role ? `ثبت‌کننده · ${role}` : "ثبت‌کننده آگهی"}
      listing={{
        id: data.id,
        title,
        brand: data.brand,
        model: data.model,
        production_year: numeric(data.year),
        mileage_km: numeric(data.mileageKm),
        price_toman: numeric(data.priceToman),
        city: data.city,
        neighborhood: data.neighborhood,
        transmission: data.transmission,
        body_status: data.color,
        cover_image: data.coverImageUrl,
        seller_type: "personal",
      }}
      customActions={actions.length ? (
        <div className={styles.actions}>
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              className={action.tone === "secondary" ? styles.secondary : action.tone === "story" ? styles.story : styles.primary}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    />
  );
}
