import { getRuntimeEnv } from "./runtime-env";

export async function isAdminEmail(email: string) {
  const configured = getRuntimeEnv().CHAKOD_ADMIN_EMAILS ?? "";

  return configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}
