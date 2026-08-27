const DEFAULT_API_ORIGIN = "https://api.chakod.com";

export type JsonRecord = Record<string, unknown>;

export function authApiUrl(pathname: string): string {
  const origin = (process.env.CHAKOD_API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/+$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

export async function parseJsonResponse(response: Response): Promise<JsonRecord | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : null;
  } catch {
    return null;
  }
}
