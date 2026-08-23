export type AdminPermissionContext = {
  role?: string;
  permissions?: string[];
  canManageSettings?: boolean;
};

const PRICE_MANAGEMENT_PERMISSIONS = [
  "manage_prices",
  "pricing.manage",
  "settings.manage",
];

export function canManageGoldenOpportunity(
  context: AdminPermissionContext
) {
  const permissions = context.permissions || [];

  return (
    context.role === "super_admin" ||
    permissions.includes("*") ||
    context.canManageSettings === true ||
    PRICE_MANAGEMENT_PERMISSIONS.some((permission) =>
      permissions.includes(permission)
    )
  );
}
