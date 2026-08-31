export const STORY_CREDIT_ASSET = "story_credit";

export type CreditTransactionType =
  | "purchase"
  | "consume"
  | "transfer_out"
  | "transfer_in"
  | "refund"
  | "admin_adjustment";

export type CreditMutationInput = {
  ownerKey: string;
  assetCode: string;
  quantity: number;
  transactionType: CreditTransactionType;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  counterpartyOwnerKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreditTransferInput = {
  sourceOwnerKey: string;
  destinationOwnerKey: string;
  assetCode: string;
  quantity: number;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
};

export type CreditLedgerInsert = {
  ownerKey: string;
  assetCode: string;
  quantityDelta: number;
  transactionType: CreditTransactionType;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  counterpartyOwnerKey: string | null;
  metadataJson: string;
};

const ASSET_CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;
const NEGATIVE_TYPES = new Set<CreditTransactionType>(["consume", "transfer_out"]);
const TRANSACTION_TYPES = new Set<CreditTransactionType>([
  "purchase",
  "consume",
  "transfer_out",
  "transfer_in",
  "refund",
  "admin_adjustment",
]);

function requireNonEmpty(value: string, field: string) {
  if (!value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function requireQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive safe integer");
  }
  return quantity;
}

function requireAssetCode(assetCode: string) {
  if (!ASSET_CODE_PATTERN.test(assetCode)) {
    throw new Error("assetCode must use a conservative lowercase asset code");
  }
  return assetCode;
}

export function creditMutationValues(input: CreditMutationInput): CreditLedgerInsert {
  const quantity = requireQuantity(input.quantity);
  const assetCode = requireAssetCode(input.assetCode);
  if (!TRANSACTION_TYPES.has(input.transactionType)) {
    throw new Error("transactionType is not supported");
  }

  return {
    ownerKey: requireNonEmpty(input.ownerKey, "ownerKey"),
    assetCode,
    quantityDelta: NEGATIVE_TYPES.has(input.transactionType) ? -quantity : quantity,
    transactionType: input.transactionType,
    referenceType: requireNonEmpty(input.referenceType, "referenceType"),
    referenceId: requireNonEmpty(input.referenceId, "referenceId"),
    idempotencyKey: requireNonEmpty(input.idempotencyKey, "idempotencyKey"),
    counterpartyOwnerKey: input.counterpartyOwnerKey?.trim() || null,
    metadataJson: JSON.stringify(input.metadata ?? {}),
  };
}

export function creditTransferValues(input: CreditTransferInput): [CreditLedgerInsert, CreditLedgerInsert] {
  const sourceOwnerKey = requireNonEmpty(input.sourceOwnerKey, "sourceOwnerKey");
  const destinationOwnerKey = requireNonEmpty(input.destinationOwnerKey, "destinationOwnerKey");
  if (sourceOwnerKey === destinationOwnerKey) {
    throw new Error("credit transfer source and destination must differ");
  }

  const idempotencyKey = requireNonEmpty(input.idempotencyKey, "idempotencyKey");
  const common = {
    assetCode: input.assetCode,
    quantity: input.quantity,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    metadata: input.metadata,
  };

  return [
    creditMutationValues({
      ...common,
      ownerKey: sourceOwnerKey,
      transactionType: "transfer_out",
      idempotencyKey: `${idempotencyKey}:out`,
      counterpartyOwnerKey: destinationOwnerKey,
    }),
    creditMutationValues({
      ...common,
      ownerKey: destinationOwnerKey,
      transactionType: "transfer_in",
      idempotencyKey: `${idempotencyKey}:in`,
      counterpartyOwnerKey: sourceOwnerKey,
    }),
  ];
}

export function isInsufficientCreditError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  if (message.includes("insufficient_credit")) return true;
  return "cause" in error ? isInsufficientCreditError(error.cause) : false;
}
