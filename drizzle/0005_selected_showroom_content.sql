CREATE TABLE IF NOT EXISTS selected_showroom_content (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  order_id integer NOT NULL UNIQUE,
  owner_key text NOT NULL,
  dealer_id integer NOT NULL,
  desktop_banner_url text DEFAULT '' NOT NULL,
  mobile_banner_url text DEFAULT '' NOT NULL,
  listing_ids_json text DEFAULT '[]' NOT NULL,
  creative_status text DEFAULT 'pending' NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS selected_showroom_content_owner_idx
  ON selected_showroom_content (owner_key, dealer_id);
