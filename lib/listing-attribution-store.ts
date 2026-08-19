import { getRuntimeEnv } from "./runtime-env";

let readiness: Promise<unknown> | null = null;

const DDL = `
CREATE TABLE IF NOT EXISTS listing_attributions (
  listing_id INTEGER PRIMARY KEY NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'personal',
  dealer_id INTEGER,
  submitted_by_user_id INTEGER NOT NULL,
  submitted_by_display_name TEXT NOT NULL DEFAULT '',
  submitted_by_role TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS listing_attributions_dealer_idx
  ON listing_attributions (dealer_id);
CREATE INDEX IF NOT EXISTS listing_attributions_submitter_idx
  ON listing_attributions (submitted_by_user_id);
`;

export async function ensureListingAttributionTable() {
  if (!readiness) {
    readiness = getRuntimeEnv().DB.exec(DDL).catch((error) => {
      readiness = null;
      throw error;
    });
  }
  await readiness;
}
