import { Router } from "express";
import { db } from "@workspace/db";
import {
  attendanceSessionsTable,
  attendanceRecordsTable,
  membersTable,
  clubsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, count, max, sql, gte, lte, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const { today, stats, clubId } = req.query as Record<string, string>;

  if (today === "true") {
    const todayDate = getTodayDate();
    const sessions = await db
      .select({
        id: attendanceSessionsTable.id,
        clubId: attendanceSessionsTable.clubId,
        submittedBy: attendanceSessionsTable.submittedBy,
        date: attendanceSessionsTable.date,
        memberCount: attendanceSessionsTable.memberCount,
        submittedAt: attendanceSessionsTable.submittedAt,
        clubName: clubsTable.name,
        clubIconUrl: clubsTable.iconUrl,
        managerName: usersTable.fullName,
      })
      .from(attendanceSessionsTable)
      .leftJoin(clubsTable, eq(attendanceSessionsTable.clubId, clubsTable.id))
      .leftJoin(usersTable, eq(attendanceSessionsTable.submittedBy, usersTable.id))
      .where(eq(attendanceSessionsTable.date, todayDate))
      .orderBy(attendanceSessionsTable.submittedAt);

    res.json({
      data: sessions.map(s => ({
        ...s,
        submittedAt: s.submittedAt.toISOString(),
      })),
    });
    return;
  }

  if (stats === "true") {
    const [totalClubsRow] = await db.select({ count: count() }).from(clubsTable).where(eq(clubsTable.isActive, true));
    const [totalMembersRow] = await db.select({ count: count() }).from(membersTable);
    const [activeManagersRow] = await db.select({ count: count() }).from(usersTable).where(and(eq(usersTable.role, "manager"), eq(usersTable.isActive, true)));
    const todayDate = getTodayDate();
    const [submittedTodayRow] = await db
      .select({ count: count() })
      .from(attendanceSessionsTable)
      .where(eq(attendanceSessionsTable.date, todayDate));

    const totalClubs = totalClubsRow?.count ?? 0;
    const clubsSubmittedToday = submittedTodayRow?.count ?? 0;

    res.json({
      stats: {
        totalClubs,
        totalMembers: totalMembersRow?.count ?? 0,
        clubsSubmittedToday,
        totalClubsToday: totalClubs,
        activeManagers: activeManagersRow?.count ?? 0,
        pendingClubs: totalClubs - clubsSubmittedToday,
      },
    });
    return;
  }

  res.json({ data: [] });
});

router.get("/attendance/today/:clubId", requireAuth, async (req, res): Promise<void> => {
  const clubId = Array.isArray(req.params.clubId) ? req.params.clubId[0] : req.params.clubId;
  const todayDate = getTodayDate();

  const [session] = await db
    .select({
      id: attendanceSessionsTable.id,
      clubId: attendanceSessionsTable.clubId,
      submittedBy: attendanceSessionsTable.submittedBy,
      date: attendanceSessionsTable.date,
      memberCount: attendanceSessionsTable.memberCount,
      submittedAt: attendanceSessionsTable.submittedAt,
      clubName: clubsTable.name,
      clubIconUrl: clubsTable.iconUrl,
      managerName: usersTable.fullName,
    })
    .from(attendanceSessionsTable)
    .leftJoin(clubsTable, eq(attendanceSessionsTable.clubId, clubsTable.id))
    .leftJoin(usersTable, eq(attendanceSessionsTable.submittedBy, usersTable.id))
    .where(and(
      eq(attendanceSessionsTable.clubId, clubId),
      eq(attendanceSessionsTable.date, todayDate)
    ))
    .limit(1);

  if (!session) {
    res.json({ submitted: false });
    return;
  }

  const records = await db
    .select({
      id: attendanceRecordsTable.id,
      memberId: attendanceRecordsTable.memberId,
      attendedAt: attendanceRecordsTable.attendedAt,
      fullName: membersTable.fullName,
      age: membersTable.age,
      gender: membersTable.gender,
      phoneNumber: membersTable.phoneNumber,
    })
    .from(attendanceRecordsTable)
    .innerJoin(membersTable, eq(attendanceRecordsTable.memberId, membersTable.id))
    .where(eq(attendanceRecordsTable.sessionId, session.id));

  res.json({
    submitted: true,
    session: {
      ...session,
      submittedAt: session.submittedAt.toISOString(),
    },
    attendedMembers: records.map(r => ({
      id: r.memberId,
      clubId,
      fullName: r.fullName,
      phoneNumber: r.phoneNumber,
      age: r.age,
      gender: r.gender,
      addedBy: null,
      createdAt: r.attendedAt.toISOString(),
      clubName: session.clubName,
    })),
  });
});

router.post("/attendance", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { clubId, memberIds } = req.body as { clubId: string; memberIds: string[] };

  if (!clubId || !memberIds || !Array.isArray(memberIds)) {
    res.status(400).json({ error: "clubId and memberIds required" });
    return;
  }

  if (user.role === "manager" && user.clubId !== clubId) {
    res.status(403).json({ error: "Cannot submit attendance for another club" });
    return;
  }

  const todayDate = getTodayDate();

  const existing = await db
    .select({ id: attendanceSessionsTable.id })
    .from(attendanceSessionsTable)
    .where(and(
      eq(attendanceSessionsTable.clubId, clubId),
      eq(attendanceSessionsTable.date, todayDate)
    ))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Attendance already submitted for today" });
    return;
  }

  const [session] = await db.insert(attendanceSessionsTable).values({
    clubId,
    submittedBy: user.id,
    date: todayDate,
    memberCount: memberIds.length,
  }).returning();

  if (memberIds.length > 0) {
    await db.insert(attendanceRecordsTable).values(
      memberIds.map(memberId => ({
        sessionId: session.id,
        memberId,
      }))
    );
  }

  const [club] = await db.select({ name: clubsTable.name, iconUrl: clubsTable.iconUrl }).from(clubsTable).where(eq(clubsTable.id, clubId)).limit(1);

  res.status(201).json({
    id: session.id,
    clubId: session.clubId,
    submittedBy: session.submittedBy,
    date: session.date,
    memberCount: session.memberCount,
    submittedAt: session.submittedAt.toISOString(),
    clubName: club?.name ?? null,
    clubIconUrl: club?.iconUrl ?? null,
    managerName: user.fullName,
  });
});

router.get("/attendance/chart", requireAuth, async (_req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const toDate = getTodayDate();

  const sessions = await db
    .select({
      date: attendanceSessionsTable.date,
      clubId: attendanceSessionsTable.clubId,
      memberCount: attendanceSessionsTable.memberCount,
      clubName: clubsTable.name,
    })
    .from(attendanceSessionsTable)
    .leftJoin(clubsTable, eq(attendanceSessionsTable.clubId, clubsTable.id))
    .where(and(
      gte(attendanceSessionsTable.date, fromDate),
      lte(attendanceSessionsTable.date, toDate)
    ))
    .orderBy(attendanceSessionsTable.date);

  const byDate = new Map<string, { total: number; byClub: Map<string, { clubId: string; clubName: string; count: number }> }>();

  for (const s of sessions) {
    if (!byDate.has(s.date)) {
      byDate.set(s.date, { total: 0, byClub: new Map() });
    }
    const day = byDate.get(s.date)!;
    day.total += s.memberCount;
    if (!day.byClub.has(s.clubId)) {
      day.byClub.set(s.clubId, { clubId: s.clubId, clubName: s.clubName ?? s.clubId, count: 0 });
    }
    day.byClub.get(s.clubId)!.count += s.memberCount;
  }

  const result = Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    total: data.total,
    byClub: Array.from(data.byClub.values()),
  }));

  res.json(result);
});

export default router;
