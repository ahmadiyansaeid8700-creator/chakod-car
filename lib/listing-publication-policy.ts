export type PublicListingSeller = {
  seller_type?: string | null;
  listing_owner_type?: string | null;
  dealer_id?: number | string | null;
  dealer_name?: string | null;
};

export function normalizeListingPhone(value?: string | null) {
  if (!value) return "";

  return String(value)
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\d+]/g, "");
}

export function isUsableListingPhone(value?: string | null) {
  const normalized = normalizeListingPhone(value);
  const digits = normalized.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("0")) return true;
  if (digits.length === 12 && digits.startsWith("98")) return true;
  if (digits.length === 13 && digits.startsWith("0098")) return true;

  return false;
}

export function isDealerListing(listing: PublicListingSeller) {
  const sellerType = String(
    listing.seller_type || listing.listing_owner_type || "",
  ).trim();

  return (
    ["dealer", "showroom", "freezone_operator"].includes(sellerType) ||
    Boolean(listing.dealer_id)
  );
}

export function publicSellerName(listing: PublicListingSeller) {
  if (!isDealerListing(listing)) return "شخصی";

  const dealerName = String(listing.dealer_name || "").trim();
  return dealerName || "نمایشگاه عضو چاکود";
}
