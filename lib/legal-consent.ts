import { getRuntimeEnv } from "./runtime-env";

export const CURRENT_TERMS_VERSION = "1.1";
export const CURRENT_PRIVACY_VERSION = "1.1";
export const CURRENT_REFUND_VERSION = "1.1";

export type LegalConsentRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: string;
};

function clean(value: string | null | undefined, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

async function getLegalDb() {
  try {
    const env = getRuntimeEnv();
    return env.DB || null;
  } catch {
    return null;
  }
}

async function ensureTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS legal_acceptances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobile TEXT NOT NULL,
        terms_version TEXT NOT NULL,
        privacy_version TEXT NOT NULL,
        refund_version TEXT NOT NULL,
        accepted_at TEXT NOT NULL,
        verified_at TEXT,
        otp_verified INTEGER NOT NULL DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        source TEXT NOT NULL DEFAULT 'login',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_legal_acceptances_mobile
       ON legal_acceptances (mobile, id DESC)`,
    )
    .run();
}

export async function recordLoginLegalAcceptance(
  mobile: string,
  meta: LegalConsentRequestMeta = {},
) {
  const db = await getLegalDb();
  if (!db) return false;

  try {
    await ensureTable(db);
    const acceptedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO legal_acceptances (
          mobile,
          terms_version,
          privacy_version,
          refund_version,
          accepted_at,
          otp_verified,
          ip_address,
          user_agent,
          source
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .bind(
        clean(mobile, 20),
        CURRENT_TERMS_VERSION,
        CURRENT_PRIVACY_VERSION,
        CURRENT_REFUND_VERSION,
        acceptedAt,
        clean(meta.ipAddress, 64),
        clean(meta.userAgent, 500),
        clean(meta.source || "login", 40) || "login",
      )
      .run();
    return true;
  } catch (error) {
    console.error("legal_acceptance_record_failed", error);
    return false;
  }
}

export async function markLatestLoginLegalAcceptanceVerified(mobile: string) {
  const db = await getLegalDb();
  if (!db) return false;

  try {
    await ensureTable(db);
    const verifiedAt = new Date().toISOString();
    const result = await db
      .prepare(
        `UPDATE legal_acceptances
         SET otp_verified = 1, verified_at = ?
         WHERE id = (
           SELECT id
           FROM legal_acceptances
           WHERE mobile = ?
             AND terms_version = ?
             AND otp_verified = 0
           ORDER BY id DESC
           LIMIT 1
         )`,
      )
      .bind(verifiedAt, clean(mobile, 20), CURRENT_TERMS_VERSION)
      .run();

    return Number(result.meta?.changes || 0) > 0;
  } catch (error) {
    console.error("legal_acceptance_verify_failed", error);
    return false;
  }
}
