type IdentityPayload = Record<string, unknown> | null | undefined;

type AdminIdentity = {
  role?: string | null;
  permissions?: string[] | null;
};

export type AdminRouteResolution = "allow" | "login" | "home";

const COMMERCE_PERMISSIONS = [
  "pricing.view",
  "orders.view",
  "payments.view",
  "discounts.view",
  "banners.view",
  "subscriptions.view",
  "admins.view",
  "audit.view",
];

export function hasAuthenticatedRouteAccess(payload: IdentityPayload) {
  return payload?.success === true && payload.logged_in === true;
}

export function hasAdminRouteAccess(payload: IdentityPayload) {
  return payload?.success === true && payload.is_admin === true;
}

export function resolveAdminRouteAccess(
  adminPayload: IdentityPayload,
  userPayload: IdentityPayload,
): AdminRouteResolution {
  if (hasAdminRouteAccess(adminPayload)) return "allow";
  if (hasAuthenticatedRouteAccess(userPayload)) return "home";
  return "login";
}

export function canOpenAdminCommerce(admin: AdminIdentity | null | undefined) {
  if (!admin) return false;
  if (admin.role === "super_admin" || admin.role === "finance") return true;

  const permissions = Array.isArray(admin.permissions) ? admin.permissions : [];
  return permissions.includes("*") || COMMERCE_PERMISSIONS.some((permission) =>
    permissions.includes(permission),
  );
}
