export type AdminPermissionContext = {
  role?: string;
  permissions?: string[];
};

export function canManageGoldenOpportunity(
  context: AdminPermissionContext
) {
  return (
    context.role === "super_admin" ||
    context.permissions?.includes("manage_prices") === true
  );
}
