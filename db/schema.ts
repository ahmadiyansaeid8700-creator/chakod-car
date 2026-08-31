import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const bannerReservations = sqliteTable("banner_reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  campaignTitle: text("campaign_title").notNull(),
  destinationUrl: text("destination_url").notNull().default(""),
  citiesJson: text("cities_json").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reservedDays: integer("reserved_days").notNull(),
  cityCount: integer("city_count").notNull(),
  cityDayRate: integer("city_day_rate").notNull(),
  totalPrice: integer("total_price").notNull(),
  paymentStatus: text("payment_status").notNull().default("demo_paid"),
  reviewStatus: text("review_status").notNull().default("pending"),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wallets = sqliteTable("wallets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerKey: text("owner_key").notNull().unique(),
  availableBalanceToman: integer("available_balance_toman").notNull().default(0),
  blockedBalanceToman: integer("blocked_balance_toman").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const walletTransactions = sqliteTable("wallet_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  walletId: integer("wallet_id").notNull(),
  direction: text("direction").notNull(),
  transactionType: text("transaction_type").notNull(),
  amountToman: integer("amount_toman").notNull(),
  balanceAfterToman: integer("balance_after_toman").notNull(),
  status: text("status").notNull().default("completed"),
  referenceType: text("reference_type").notNull().default(""),
  referenceId: text("reference_id").notNull().default(""),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const creditBalances = sqliteTable(
  "credit_balances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    assetCode: text("asset_code").notNull(),
    availableQuantity: integer("available_quantity").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerAssetUnique: uniqueIndex("credit_balances_owner_asset_unique").on(
      table.ownerKey,
      table.assetCode,
    ),
  }),
);

export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    assetCode: text("asset_code").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    transactionType: text("transaction_type").notNull(),
    referenceType: text("reference_type").notNull().default(""),
    referenceId: text("reference_id").notNull().default(""),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    counterpartyOwnerKey: text("counterparty_owner_key"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerAssetIdx: index("credit_ledger_owner_asset_idx").on(
      table.ownerKey,
      table.assetCode,
      table.id,
    ),
  }),
);

export const commerceOrders = sqliteTable("commerce_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNo: text("order_no").notNull().unique(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  ownerKey: text("owner_key").notNull(),
  orderType: text("order_type").notNull(),
  productCode: text("product_code").notNull(),
  amountToman: integer("amount_toman").notNull(),
  discountToman: integer("discount_toman").notNull().default(0),
  finalAmountToman: integer("final_amount_toman").notNull(),
  currency: text("currency").notNull().default("IRR"),
  status: text("status").notNull().default("pending_payment"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const marketFloorWallets = sqliteTable("market_floor_wallets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerKey: text("owner_key").notNull().unique(),
  availableCards: integer("available_cards").notNull().default(3),
  consumedCards: integer("consumed_cards").notNull().default(0),
  refundedCards: integer("refunded_cards").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const marketFloorEntries = sqliteTable(
  "market_floor_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerKey: text("owner_key").notNull(),
    listingId: integer("listing_id").notNull(),
    province: text("province").notNull(),
    requestedScope: text("requested_scope").notNull().default("province"),
    cycleKey: text("cycle_key").notNull(),
    cycleStartsAt: text("cycle_starts_at").notNull(),
    cycleEndsAt: text("cycle_ends_at").notNull(),
    status: text("status").notNull().default("pending_ai"),
    score: integer("score").notNull().default(0),
    grade: text("grade").notNull().default("rejected"),
    decision: text("decision").notNull().default("human_review"),
    reason: text("reason").notNull().default(""),
    scoreJson: text("score_json").notNull().default("{}"),
    listingSnapshotJson: text("listing_snapshot_json").notNull().default("{}"),
    cardState: text("card_state").notNull().default("reserved"),
    reservationForNextCycle: integer("reservation_for_next_cycle", { mode: "boolean" }).notNull().default(false),
    reviewedBy: text("reviewed_by").notNull().default("ai"),
    reviewedAt: text("reviewed_at"),
    activatedAt: text("activated_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerListingCycleUnique: uniqueIndex("market_floor_owner_listing_cycle_unique").on(
      table.ownerKey,
      table.listingId,
      table.cycleKey,
    ),
  }),
);

export const paymentAttempts = sqliteTable("payment_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  gateway: text("gateway").notNull(),
  authority: text("authority").notNull().default(""),
  gatewayTransactionId: text("gateway_transaction_id").notNull().default(""),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  amountToman: integer("amount_toman").notNull(),
  status: text("status").notNull().default("created"),
  requestJson: text("request_json").notNull().default("{}"),
  responseJson: text("response_json").notNull().default("{}"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNo: text("invoice_no").notNull().unique(),
  orderId: integer("order_id").notNull().unique(),
  ownerKey: text("owner_key").notNull(),
  amountToman: integer("amount_toman").notNull(),
  status: text("status").notNull().default("issued"),
  issuedAt: text("issued_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentRefunds = sqliteTable("payment_refunds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  paymentAttemptId: integer("payment_attempt_id").notNull(),
  amountToman: integer("amount_toman").notNull(),
  destination: text("destination").notNull().default("gateway"),
  status: text("status").notNull().default("requested"),
  reason: text("reason").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const featuredShowroomPlacements = sqliteTable("featured_showroom_placements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().unique(),
  ownerKey: text("owner_key").notNull(),
  dealerId: integer("dealer_id").notNull(),
  dealerName: text("dealer_name").notNull(),
  province: text("province").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reservedDays: integer("reserved_days").notNull(),
  dailyRateToman: integer("daily_rate_toman").notNull(),
  totalPriceToman: integer("total_price_toman").notNull(),
  status: text("status").notNull().default("pending_payment"),
  adminNote: text("admin_note").notNull().default(""),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportTickets = sqliteTable("support_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketNo: text("ticket_no").notNull().unique(),
  ownerKey: text("owner_key").notNull().default(""),
  guestAccessHash: text("guest_access_hash").notNull().default(""),
  fullName: text("full_name").notNull().default(""),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  topic: text("topic").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  orderNo: text("order_no").notNull().default(""),
  listingId: integer("listing_id"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  adminNote: text("admin_note").notNull().default(""),
  lastReplyAt: text("last_reply_at"),
  closedAt: text("closed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportReplies = sqliteTable("support_replies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull(),
  authorType: text("author_type").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contentArticles = sqliteTable("content_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  category: text("category").notNull().default("راهنمای خودرو"),
  bodyJson: text("body_json").notNull().default("[]"),
  readingMinutes: integer("reading_minutes").notNull().default(5),
  status: text("status").notNull().default("draft"),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const businessVerificationRequests = sqliteTable("business_verification_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  activityKey: text("activity_key").notNull().unique(),
  activityType: text("activity_type").notNull(),
  activityExternalId: integer("activity_external_id").notNull(),
  activityName: text("activity_name").notNull(),
  applicantUserId: integer("applicant_user_id").notNull(),
  applicantMobile: text("applicant_mobile").notNull().default(""),
  applicantRelation: text("applicant_relation").notNull(),
  documentType: text("document_type").notNull(),
  documentReference: text("document_reference").notNull().default(""),
  licenseHolderName: text("license_holder_name").notNull(),
  documentName: text("document_name").notNull(),
  documentMime: text("document_mime").notNull(),
  documentBase64: text("document_base64").notNull(),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason").notNull().default(""),
  reviewedBy: text("reviewed_by").notNull().default(""),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accountActivities = sqliteTable(
  "account_activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerUserId: integer("owner_user_id").notNull(),
    activityType: text("activity_type").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    province: text("province").notNull().default(""),
    city: text("city").notNull().default(""),
    neighborhood: text("neighborhood").notNull().default(""),
    address: text("address").notNull().default(""),
    externalDealerId: integer("external_dealer_id"),
    source: text("source").notNull().default("native"),
    status: text("status").notNull().default("draft"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerTypeUnique: uniqueIndex("account_activities_owner_type_unique").on(
      table.ownerUserId,
      table.activityType,
    ),
    externalDealerUnique: uniqueIndex("account_activities_external_dealer_unique").on(
      table.externalDealerId,
    ),
  }),
);

export const instagramStoryQueue = sqliteTable(
  "instagram_story_queue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    storyOrderId: integer("story_order_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    listingId: integer("listing_id").notNull(),
    priceToman: integer("price_toman").notNull(),
    minPriceToman: integer("min_price_toman").notNull().default(3_000_000_000),
    title: text("title").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    publicUrl: text("public_url").notNull().default(""),
    sourceExpiresAt: text("source_expires_at").notNull(),
    slotDate: text("slot_date").notNull().default(""),
    slotNumber: integer("slot_number").notNull().default(0),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(100),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error").notNull().default(""),
    metaContainerId: text("meta_container_id").notNull().default(""),
    metaMediaId: text("meta_media_id").notNull().default(""),
    publishedDate: text("published_date").notNull().default(""),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    storyOrderUnique: uniqueIndex("instagram_story_queue_story_order_unique").on(table.storyOrderId),
  }),
);
