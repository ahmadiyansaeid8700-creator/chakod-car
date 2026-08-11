import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
