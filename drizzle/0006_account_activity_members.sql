CREATE TABLE IF NOT EXISTS account_activity_members (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  activity_id integer NOT NULL,
  member_user_id integer,
  member_mobile text NOT NULL,
  display_name text DEFAULT '' NOT NULL,
  role text DEFAULT 'viewer' NOT NULL,
  status text DEFAULT 'invited' NOT NULL,
  created_by_user_id integer NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS account_activity_members_activity_mobile_unique
  ON account_activity_members (activity_id, member_mobile);

CREATE INDEX IF NOT EXISTS account_activity_members_user_status_idx
  ON account_activity_members (member_user_id, status);

CREATE INDEX IF NOT EXISTS account_activity_members_activity_status_idx
  ON account_activity_members (activity_id, status);
