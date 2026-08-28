import { NextRequest } from "next/server";

import {
  jsonResponse,
  readSessionToken,
} from "@/lib/chakod-auth-proxy";
import {
  ChakodAiToolError,
  runChakodAiReadOnlyTool,
} from "@/lib/chakod-ai-manager/tool-executor";
import { hasAdminRouteAccess } from "@/lib/route-access";
import { readServerIdentity } from "@/lib/server-route-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> },
) {
  const identity = await readServerIdentity("/api/admin-me.php");

  if (!hasAdminRouteAccess(identity)) {
    return jsonResponse({ success: false, message: "Not found" }, 404);
  }

  const token = readSessionToken(request);
  const { toolId } = await context.params;

  try {
    const snapshot = await runChakodAiReadOnlyTool(toolId, token);
    return jsonResponse({ success: true, snapshot }, 200);
  } catch (error) {
    if (error instanceof ChakodAiToolError) {
      return jsonResponse(
        { success: false, message: error.message, code: error.code },
        error.status,
      );
    }

    return jsonResponse(
      { success: false, message: "AI read-only tool failed." },
      500,
    );
  }
}
