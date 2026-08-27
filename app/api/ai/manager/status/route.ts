import { NextResponse } from "next/server";

import { getChakodAiManagerStatus } from "@/lib/chakod-ai-manager/config";
import { hasAdminRouteAccess } from "@/lib/route-access";
import { readServerIdentity } from "@/lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await readServerIdentity("/api/admin-me.php");

  if (!hasAdminRouteAccess(identity)) {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404, headers: responseHeaders() },
    );
  }

  return NextResponse.json(
    {
      success: true,
      manager: getChakodAiManagerStatus(),
    },
    { status: 200, headers: responseHeaders() },
  );
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  };
}
