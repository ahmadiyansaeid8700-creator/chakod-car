CREATE TABLE `credit_balances` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `asset_code` text NOT NULL,
  `available_quantity` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `credit_balances_owner_asset_unique`
  ON `credit_balances` (`owner_key`, `asset_code`);

CREATE TABLE `credit_ledger` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `asset_code` text NOT NULL,
  `quantity_delta` integer NOT NULL,
  `transaction_type` text NOT NULL,
  `reference_type` text DEFAULT '' NOT NULL,
  `reference_id` text DEFAULT '' NOT NULL,
  `idempotency_key` text NOT NULL UNIQUE,
  `counterparty_owner_key` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (`quantity_delta` <> 0)
);
CREATE INDEX `credit_ledger_owner_asset_idx`
  ON `credit_ledger` (`owner_key`, `asset_code`, `id`);

CREATE TRIGGER `credit_ledger_prevent_negative`
BEFORE INSERT ON `credit_ledger`
WHEN NEW.quantity_delta < 0
BEGIN
  SELECT CASE
    WHEN COALESCE((
      SELECT available_quantity
      FROM credit_balances
      WHERE owner_key = NEW.owner_key AND asset_code = NEW.asset_code
    ), 0) + NEW.quantity_delta < 0
    THEN RAISE(ABORT, 'insufficient_credit')
  END;
END;

CREATE TRIGGER `credit_ledger_apply_balance`
AFTER INSERT ON `credit_ledger`
BEGIN
  INSERT INTO credit_balances (
    owner_key, asset_code, available_quantity, updated_at
  ) VALUES (
    NEW.owner_key, NEW.asset_code, NEW.quantity_delta, CURRENT_TIMESTAMP
  )
  ON CONFLICT(owner_key, asset_code) DO UPDATE SET
    available_quantity = credit_balances.available_quantity + NEW.quantity_delta,
    updated_at = CURRENT_TIMESTAMP;
END;
