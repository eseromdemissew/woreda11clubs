import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  replitSub: text("replit_sub").unique(),
  username: text("username").unique().notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["admin", "manager"] }).notNull().default("manager"),
  clubId: uuid("club_id"),
  profilePhotoUrl: text("profile_photo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
