import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, clubsTable, attendanceRecordsTable, attendanceSessionsTable } from "@workspace/db";
import { eq, ilike, and, or, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/members", requireAuth, async (req, res): Promise<void> => {
  const { search, clubId, gender, page = "1", limit = "25" } = req.query as Record<string, string>;
  const user = req.user!;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let conditions: ReturnType<typeof eq>[] = [];

  if (user.role === "manager" && user.clubId) {
    conditions.push(eq(membersTable.clubId, user.clubId));
  } else if (clubId) {
    conditions.push(eq(membersTable.clubId, clubId));
  }

  if (gender) {
    conditions.push(eq(membersTable.gender, gender as "Male" | "Female" | "Other"));
  }

  const members = await db
    .select({
      id: membersTable.id,
      clubId: membersTable.clubId,
      fullName: membersTable.fullName,
      phoneNumber: membersTable.phoneNumber,
      age: membersTable.age,
      gender: membersTable.gender,
      addedBy: membersTable.addedBy,
      createdAt: membersTable.createdAt,
      clubName: clubsTable.name,
    })
    .from(membersTable)
    .leftJoin(clubsTable, eq(membersTable.clubId, clubsTable.id))
    .where(
      conditions.length > 0
        ? and(...conditions)
        : undefined
    )
    .orderBy(membersTable.createdAt)
    .limit(parseInt(limit))
    .offset(offset);

  const [total] = await db
    .select({ count: count() })
    .from(membersTable)
    .leftJoin(clubsTable, eq(membersTable.clubId, clubsTable.id))
    .where(
      conditions.length > 0
        ? and(...conditions)
        : undefined
    );

  let filtered = members;
  if (search) {
    const s = search.toLowerCase();
    filtered = members.filter(m =>
      m.fullName.toLowerCase().includes(s) ||
      m.phoneNumber.includes(s)
    );
  }

  res.json({
    members: filtered.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    total: total?.count ?? 0,
  });
});

router.get("/members/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [member] = await db
    .select({
      id: membersTable.id,
      clubId: membersTable.clubId,
      fullName: membersTable.fullName,
      phoneNumber: membersTable.phoneNumber,
      age: membersTable.age,
      gender: membersTable.gender,
      addedBy: membersTable.addedBy,
      createdAt: membersTable.createdAt,
      clubName: clubsTable.name,
    })
    .from(membersTable)
    .leftJoin(clubsTable, eq(membersTable.clubId, clubsTable.id))
    .where(eq(membersTable.id, id))
    .limit(1);

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const history = await db
    .select({
      id: attendanceRecordsTable.id,
      memberId: attendanceRecordsTable.memberId,
      memberName: membersTable.fullName,
      memberAge: membersTable.age,
      memberGender: membersTable.gender,
      attendedAt: attendanceRecordsTable.attendedAt,
      sessionDate: attendanceSessionsTable.date,
    })
    .from(attendanceRecordsTable)
    .innerJoin(attendanceSessionsTable, eq(attendanceRecordsTable.sessionId, attendanceSessionsTable.id))
    .innerJoin(membersTable, eq(attendanceRecordsTable.memberId, membersTable.id))
    .where(eq(attendanceRecordsTable.memberId, id))
    .orderBy(attendanceSessionsTable.date);

  res.json({
    id: member.id,
    clubId: member.clubId,
    fullName: member.fullName,
    phoneNumber: member.phoneNumber,
    age: member.age,
    gender: member.gender,
    createdAt: member.createdAt.toISOString(),
    clubName: member.clubName,
    attendanceHistory: history.map(h => ({
      id: h.id,
      memberId: h.memberId,
      memberName: h.memberName,
      memberAge: h.memberAge,
      memberGender: h.memberGender,
      attendedAt: h.attendedAt.toISOString(),
      sessionDate: h.sessionDate,
      clubName: member.clubName,
    })),
  });
});

router.post("/members", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { clubId, fullName, phoneNumber, age, gender } = req.body;

  if (!fullName || !phoneNumber || !age || !gender) {
    res.status(400).json({ error: "All fields required" });
    return;
  }

  const effectiveClubId = user.role === "manager" ? user.clubId! : clubId;
  if (!effectiveClubId) {
    res.status(400).json({ error: "Club ID required" });
    return;
  }

  const [member] = await db.insert(membersTable).values({
    clubId: effectiveClubId,
    fullName,
    phoneNumber,
    age: parseInt(age),
    gender,
    addedBy: user.id,
  }).returning();

  const [club] = await db.select({ name: clubsTable.name }).from(clubsTable).where(eq(clubsTable.id, effectiveClubId)).limit(1);

  res.status(201).json({
    id: member.id,
    clubId: member.clubId,
    fullName: member.fullName,
    phoneNumber: member.phoneNumber,
    age: member.age,
    gender: member.gender,
    addedBy: member.addedBy,
    createdAt: member.createdAt.toISOString(),
    clubName: club?.name ?? null,
  });
});

router.put("/members/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;
  const { fullName, phoneNumber, age, gender } = req.body;

  const [existing] = await db.select().from(membersTable).where(eq(membersTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  if (user.role === "manager" && existing.clubId !== user.clubId) {
    res.status(403).json({ error: "Cannot edit members from another club" });
    return;
  }

  const [updated] = await db.update(membersTable).set({
    fullName: fullName ?? existing.fullName,
    phoneNumber: phoneNumber ?? existing.phoneNumber,
    age: age ? parseInt(age) : existing.age,
    gender: gender ?? existing.gender,
  }).where(eq(membersTable.id, id)).returning();

  const [club] = await db.select({ name: clubsTable.name }).from(clubsTable).where(eq(clubsTable.id, updated.clubId)).limit(1);

  res.json({
    id: updated.id,
    clubId: updated.clubId,
    fullName: updated.fullName,
    phoneNumber: updated.phoneNumber,
    age: updated.age,
    gender: updated.gender,
    addedBy: updated.addedBy,
    createdAt: updated.createdAt.toISOString(),
    clubName: club?.name ?? null,
  });
});

router.delete("/members/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id)).limit(1);
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await db.delete(membersTable).where(eq(membersTable.id, id));
  res.json({ success: true });
});

export default router;
