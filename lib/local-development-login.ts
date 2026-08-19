export type LocalDevelopmentLoginResult =
  | {
      success: true;
      redirectTo: string;
    }
  | {
      success: false;
      message: string;
    };

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type LocalDevelopmentSessionPayload = {
  success?: unknown;
  redirect_to?: unknown;
  message?: unknown;
};

const DEFAULT_REDIRECT = "/account?complete=1";
const DEFAULT_ERROR =
  "ورود آزمایشی لوکال انجام نشد. سرور توسعه را بررسی و دوباره تلاش کنید.";

function readPayload(text: string): LocalDevelopmentSessionPayload | null {
  if (!text.trim()) return null;

  try {
    const payload: unknown = JSON.parse(text);
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as LocalDevelopmentSessionPayload)
      : null;
  } catch {
    return null;
  }
}

export async function createLocalDevelopmentSession(
  fetchImpl: FetchLike = fetch,
): Promise<LocalDevelopmentLoginResult> {
  try {
    const response = await fetchImpl("/api/auth/dev-session", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = readPayload(await response.text());

    if (!response.ok || payload?.success !== true) {
      return {
        success: false,
        message:
          typeof payload?.message === "string" && payload.message.trim()
            ? payload.message
            : DEFAULT_ERROR,
      };
    }

    return {
      success: true,
      redirectTo:
        typeof payload.redirect_to === "string" && payload.redirect_to.trim()
          ? payload.redirect_to
          : DEFAULT_REDIRECT,
    };
  } catch {
    return {
      success: false,
      message: DEFAULT_ERROR,
    };
  }
}
