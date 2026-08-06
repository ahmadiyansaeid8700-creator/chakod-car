import { NextRequest, NextResponse } from "next/server";

import {
  CHAKOD_SESSION_COOKIE,
  jsonResponse,
  rejectCrossSiteMutation,
  secureJsonHeaders,
  sessionCookieOptions,
} from "../../../../lib/chakod-auth-proxy";
import {
  isLocalDevelopmentHost,
  LOCAL_DEVELOPMENT_SESSION_TOKEN,
} from "../../../../lib/local-development-session";

const LOCAL_DEVELOPMENT_MAX_AGE = 8 * 60 * 60;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAvailable(request: NextRequest): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    isLocalDevelopmentHost(request.nextUrl.hostname)
  );
}

function setLocalDevelopmentCookie(request: NextRequest, response: NextResponse) {
  response.cookies.set({
    name: CHAKOD_SESSION_COOKIE,
    value: LOCAL_DEVELOPMENT_SESSION_TOKEN,
    ...sessionCookieOptions(request, LOCAL_DEVELOPMENT_MAX_AGE),
  });
}

export async function POST(request: NextRequest) {
  if (!isAvailable(request)) {
    return jsonResponse({ success: false, message: "مسیر در دسترس نیست." }, 404);
  }

  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const response = jsonResponse({
    success: true,
    local_development: true,
    redirect_to: "/account?complete=1",
  });
  setLocalDevelopmentCookie(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  if (!isAvailable(request)) {
    return jsonResponse({ success: false, message: "مسیر در دسترس نیست." }, 404);
  }

  const response = NextResponse.redirect(
    new URL("/account?complete=1", request.url),
    303,
  );
  const headers = secureJsonHeaders();
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  setLocalDevelopmentCookie(request, response);
  return response;
}
