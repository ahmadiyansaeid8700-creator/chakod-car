import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const listingAttributions = sqliteTable("listing_attributions", {
  listingId: integer("listing_id").primaryKey(),
  ownerType: text("owner_type").notNull().default("personal"),
  dealerId: integer("dealer_id"),
  submittedByUserId: integer("submitted_by_user_id").notNull(),
  submittedByDisplayName: text("submitted_by_display_name").notNull().default(""),
  submittedByRole: text("submitted_by_role").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
