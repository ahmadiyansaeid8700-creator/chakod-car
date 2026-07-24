import { NextRequest, NextResponse } from "next/server";

const VERIFY_URL = "https://api.chakod.com/api/verify-login-code.php";
const SESSION_COOKIE = "chakod_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type VerifyPayload = {
  success?: boolean;
  message?: string;
  session_token?: string;
  [key: string]: unknown;
};

function safeJson(text: string): VerifyPayload | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object"
      ? (parsed as VerifyPayload)
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const upstream = await fetch(VERIFY_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body,
    });

    const text = await upstream.text();
    const payload = safeJson(text);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: "پاسخ سرویس ورود معتبر نیست.",
        },
        {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const response = NextResponse.json(payload, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });

    if (
      upstream.ok &&
      payload.success === true &&
      typeof payload.session_token === "string" &&
      /^[a-f0-9]{64}$/i.test(payload.session_token)
    ) {
      response.cookies.set({
        name: SESSION_COOKIE,
        value: payload.session_token,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        domain: ".chakod.com",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "ارتباط با سرویس ورود برقرار نشد.",
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
