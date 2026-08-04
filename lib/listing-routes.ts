export const ACCOUNT_LISTINGS_PATH = "/account/listings";
export const NEW_ACCOUNT_LISTING_PATH = `${ACCOUNT_LISTINGS_PATH}/new`;

export function accountListingPath(listingId: string | number) {
  return `${ACCOUNT_LISTINGS_PATH}/${encodeURIComponent(String(listingId))}`;
}

export function legacyListingRedirect(pathname: string) {
  if (pathname === "/submit") return NEW_ACCOUNT_LISTING_PATH;
  if (pathname === "/dashboard/listings") return ACCOUNT_LISTINGS_PATH;

  const match = pathname.match(/^\/dashboard\/listings\/([^/?#]+)$/);
  return match ? accountListingPath(decodeURIComponent(match[1])) : null;
}
