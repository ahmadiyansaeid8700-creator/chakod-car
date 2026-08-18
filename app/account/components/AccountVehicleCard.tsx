import Link from "next/link";

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
  content: "محتوا",
  finance: "مالی",
  viewer: "ناظر",
};

function numberFa(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? new Intl.NumberFormat("fa-IR").format(number) : "۰";
}

function priceFa(value: number | string | null | undefined) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "قیمت توافقی";
  if (number >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} میلیارد تومان`;
  }
  if (number >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(number / 1_000_000)} میلیون تومان`;
  }
  return `${numberFa(number)} تومان`;
}

function normalizedStatus(code?: string | null) {
  return String(code || "").trim().toLowerCase() || "unknown";
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
  const status = normalizedStatus(data.statusCode);
  const compactSpecs = [
    data.year ? `مدل ${data.year}` : "",
    Number(data.mileageKm || 0) > 0 ? `${numberFa(data.mileageKm)} km` : "",
    data.color || "",
  ].filter(Boolean);
  const detailSpecs = [data.transmission, data.fuelType].filter(Boolean);
  const location = [data.city, data.neighborhood].filter(Boolean).join("، ");
  const publisher = String(data.submittedByDisplayName || data.publisherFallback || "ثبت‌کننده نامشخص").trim();
  const role = ROLE_LABELS[String(data.submittedByRole || "").trim().toLowerCase()] || "";
  const hasMetrics = Number(data.viewsCount || 0) > 0 || Number(data.favoriteCount || 0) > 0;

  return (
    <article className={styles.card} data-status={status}>
      <Link href={primaryHref} className={styles.mediaLink} aria-label={title}>
        {data.coverImageUrl ? (
          <img src={data.coverImageUrl} alt={title} loading="lazy" />
        ) : (
          <span className={styles.noImage}>خودرو</span>
        )}
        <span className={styles.status}>{data.statusLabel || "وضعیت نامشخص"}</span>
      </Link>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <strong title={title}>{title}</strong>
          <small>#{data.id}</small>
        </div>
        <div className={styles.price}>{priceFa(data.priceToman)}</div>
        <div className={styles.specs}>{compactSpecs.length ? compactSpecs.join(" · ") : "مشخصات خودرو ثبت نشده"}</div>
        <div className={styles.detailSpecs}>
          {detailSpecs.length ? detailSpecs.join(" · ") : ""}
          {detailSpecs.length && location ? " · " : ""}
          {location}
        </div>
        <div className={styles.publisher} title={`ثبت‌کننده: ${publisher}`}>
          <span aria-hidden="true">●</span>
          <b>ثبت‌کننده:</b>
          <strong>{publisher}</strong>
          {role ? <em>{role}</em> : null}
        </div>
        {hasMetrics ? (
          <div className={styles.metrics}>
            <span>{numberFa(data.viewsCount)} بازدید</span>
            <span>{numberFa(data.favoriteCount)} نشان</span>
          </div>
        ) : null}
      </div>

      {actions.length ? (
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
    </article>
  );
}
