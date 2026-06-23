import { pgTable, text, uuid, integer, timestamp, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceSessionsTable = pgTable("attendance_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull(),
  submittedBy: uuid("submitted_by").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  memberCount: integer("member_count").notNull().default(0),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.clubId, t.date)]);

export const insertAttendanceSessionSchema = createInsertSchema(attendanceSessionsTable).omit({ id: true, submittedAt: true });
export type InsertAttendanceSession = z.infer<typeof insertAttendanceSessionSchema>;
export type AttendanceSession = typeof attendanceSessionsTable.$inferSelect;

export const attendanceRecordsTable = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  memberId: uuid("member_id").notNull(),
  attendedAt: timestamp("attended_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.sessionId, t.memberId)]);

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecordsTable).omit({ id: true, attendedAt: true });
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
