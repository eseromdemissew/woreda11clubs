import { Router } from "express";
import { db } from "@workspace/db";
import {
  attendanceSessionsTable,
  attendanceRecordsTable,
  membersTable,
  clubsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, lte, count, max, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/reports", requireAdmin, async (req, res): Promise<void> => {
  const { from, to, clubId, gender, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions: ReturnType<typeof eq>[] = [];
  if (from) conditions.push(gte(attendanceSessionsTable.date, from));
  if (to) conditions.push(lte(attendanceSessionsTable.date, to));
  if (clubId) conditions.push(eq(membersTable.clubId, clubId));
  if (gender) conditions.push(eq(membersTable.gender, gender as "Male" | "Female" | "Other"));

  const rows = await db
    .select({
      memberId: membersTable.id,
      memberName: membersTable.fullName,
      age: membersTable.age,
      gender: membersTable.gender,
      phone: membersTable.phoneNumber,
      clubName: clubsTable.name,
      sessionDate: attendanceSessionsTable.date,
      attendedAt: attendanceRecordsTable.attendedAt,
    })
    .from(attendanceRecordsTable)
    .innerJoin(attendanceSessionsTable, eq(attendanceRecordsTable.sessionId, attendanceSessionsTable.id))
    .innerJoin(membersTable, eq(attendanceRecordsTable.memberId, membersTable.id))
    .leftJoin(clubsTable, eq(membersTable.clubId, clubsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${attendanceSessionsTable.date} DESC`)
    .limit(parseInt(limit))
    .offset(offset);

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(attendanceRecordsTable)
    .innerJoin(attendanceSessionsTable, eq(attendanceRecordsTable.sessionId, attendanceSessionsTable.id))
    .innerJoin(membersTable, eq(attendanceRecordsTable.memberId, membersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  let filtered = rows;
  if (search) {
    const s = search.toLowerCase();
    filtered = rows.filter(r =>
      r.memberName.toLowerCase().includes(s) ||
      r.phone.includes(s)
    );
  }

  res.json({
    rows: filtered.map(r => ({
      memberId: r.memberId,
      memberName: r.memberName,
      age: r.age,
      gender: r.gender,
      phone: r.phone,
      clubName: r.clubName ?? "Unknown",
      sessionDate: r.sessionDate,
      attendedAt: r.attendedAt.toISOString(),
    })),
    total: totalRow?.cnt ?? 0,
  });
});

router.get("/reports/absent", requireAdmin, async (_req, res): Promise<void> => {
  const clubs = await db
    .select({
      id: clubsTable.id,
      name: clubsTable.name,
      managerId: clubsTable.managerId,
      managerName: usersTable.fullName,
    })
    .from(clubsTable)
    .leftJoin(usersTable, eq(clubsTable.managerId, usersTable.id))
    .where(eq(clubsTable.isActive, true));

  const today = new Date();

  const result = await Promise.all(clubs.map(async (club) => {
    const [lastSessionRow] = await db
      .select({ submittedAt: max(attendanceSessionsTable.submittedAt) })
      .from(attendanceSessionsTable)
      .where(eq(attendanceSessionsTable.clubId, club.id));

    const lastSubmittedAt = lastSessionRow?.submittedAt ?? null;
    let daysSince = 999;

    if (lastSubmittedAt) {
      const diff = today.getTime() - new Date(lastSubmittedAt).getTime();
      daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    let status: "warning" | "high" | "critical" | "never";
    if (!lastSubmittedAt) status = "never";
    else if (daysSince >= 10) status = "critical";
    else if (daysSince >= 7) status = "high";
    else status = "warning";

    return {
      clubId: club.id,
      clubName: club.name,
      managerId: club.managerId,
      managerName: club.managerName,
      lastSubmittedAt: lastSubmittedAt ? new Date(lastSubmittedAt).toISOString() : null,
      daysSince,
      status,
    };
  }));

  const absent = result.filter(r => r.lastSubmittedAt === null || r.daysSince >= 3);
  absent.sort((a, b) => b.daysSince - a.daysSince);

  res.json(absent);
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [totalClubsRow] = await db.select({ count: count() }).from(clubsTable).where(eq(clubsTable.isActive, true));
  const [totalMembersRow] = await db.select({ count: count() }).from(membersTable);
  const [activeManagersRow] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(and(eq(usersTable.role, "manager"), eq(usersTable.isActive, true)));

  const today = new Date().toISOString().slice(0, 10);
  const [submittedTodayRow] = await db
    .select({ count: count() })
    .from(attendanceSessionsTable)
    .where(eq(attendanceSessionsTable.date, today));

  const totalClubs = totalClubsRow?.count ?? 0;
  const clubsSubmittedToday = submittedTodayRow?.count ?? 0;

  res.json({
    totalClubs,
    totalMembers: totalMembersRow?.count ?? 0,
    clubsSubmittedToday,
    totalClubsToday: totalClubs,
    activeManagers: activeManagersRow?.count ?? 0,
    pendingClubs: totalClubs - clubsSubmittedToday,
  });
});

export default router;
