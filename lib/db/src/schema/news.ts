import { pgTable, text, uuid, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const newsTable = pgTable("news", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  publishedBy: uuid("published_by"),
  isPublished: boolean("is_published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNewsSchema = createInsertSchema(newsTable).omit({ id: true, publishedAt: true, updatedAt: true });
export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof newsTable.$inferSelect;

export const newsReadsTable = pgTable("news_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  newsId: uuid("news_id").notNull(),
  userId: uuid("user_id").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.newsId, t.userId)]);

export const insertNewsReadSchema = createInsertSchema(newsReadsTable).omit({ id: true, readAt: true });
export type InsertNewsRead = z.infer<typeof insertNewsReadSchema>;
export type NewsRead = typeof newsReadsTable.$inferSelect;
