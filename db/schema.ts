import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
