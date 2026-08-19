const DEFAULT_RETURN_PATH = "/";
const LOGIN_PATH = "/login";

export function safeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_PATH,
) {
  const fallbackPath = safeInternalPath(fallback);
  const safeFallback =
    fallbackPath && !isLoginPath(fallbackPath)
      ? fallbackPath
      : DEFAULT_RETURN_PATH;
  const safeValue = safeInternalPath(value);

  return safeValue && !isLoginPath(safeValue) ? safeValue : safeFallback;
}

function safeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";

  try {
    const url = new URL(value, "https://chakod.local");
    if (url.origin !== "https://chakod.local") return "";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function isLoginPath(value: string) {
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname === LOGIN_PATH || pathname === `${LOGIN_PATH}/`;
}
