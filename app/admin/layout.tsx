import { redirect } from "next/navigation";

import { resolveAdminRouteAccess } from "../../lib/route-access";
import { readServerIdentity } from "../../lib/server-route-access";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminIdentity = await readServerIdentity("/api/admin-me.php");

  if (adminIdentity?.success === true && adminIdentity.is_admin === true) {
    return <AdminShell>{children}</AdminShell>;
  }

  const userIdentity = await readServerIdentity("/api/me.php");
  const resolution = resolveAdminRouteAccess(adminIdentity, userIdentity);

  if (resolution === "login") redirect("/login?returnTo=%2Fadmin");
  if (resolution === "home") redirect("/");

  return <AdminShell>{children}</AdminShell>;
}
