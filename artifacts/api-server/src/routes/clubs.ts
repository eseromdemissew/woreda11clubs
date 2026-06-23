import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, clubsTable, membersTable, attendanceSessionsTable } from "@workspace/db";
import { eq, count, max, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

async function getClubStats(clubId: string) {
  const [memberCount] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(eq(membersTable.clubId, clubId));

  const [sessionCount] = await db
    .select({ count: count() })
    .from(attendanceSessionsTable)
    .where(eq(attendanceSessionsTable.clubId, clubId));

  const [lastSession] = await db
    .select({ submittedAt: max(attendanceSessionsTable.submittedAt) })
    .from(attendanceSessionsTable)
    .where(eq(attendanceSessionsTable.clubId, clubId));

  return {
    memberCount: memberCount?.count ?? 0,
    sessionCount: sessionCount?.count ?? 0,
    lastSubmittedAt: lastSession?.submittedAt?.toISOString() ?? null,
  };
}

async function buildClubResponse(club: typeof clubsTable.$inferSelect) {
  const stats = await getClubStats(club.id);
  let managerName = null;
  let managerEmail = null;

  if (club.managerId) {
    const [manager] = await db
      .select({ fullName: usersTable.fullName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, club.managerId))
      .limit(1);
    managerName = manager?.fullName ?? null;
    managerEmail = manager?.email ?? null;
  }

  return {
    id: club.id,
    name: club.name,
    iconUrl: club.iconUrl,
    isActive: club.isActive,
    createdAt: club.createdAt.toISOString(),
    managerId: club.managerId,
    managerName,
    managerEmail,
    ...stats,
  };
}

router.get("/clubs", requireAuth, async (req, res): Promise<void> => {
  const clubs = await db.select().from(clubsTable).orderBy(clubsTable.createdAt);
  const result = await Promise.all(clubs.map(buildClubResponse));
  res.json(result);
});

router.get("/clubs/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, id)).limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  res.json(await buildClubResponse(club));
});

router.post("/clubs", requireAdmin, async (req, res): Promise<void> => {
  const { name, iconUrl, managerFullName, managerEmail, managerUsername, managerPassword } = req.body;

  if (!name || !managerFullName || !managerEmail || !managerUsername || !managerPassword) {
    res.status(400).json({ error: "All fields required" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, managerEmail.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(managerPassword, 12);

  const [manager] = await db.insert(usersTable).values({
    username: managerUsername,
    fullName: managerFullName,
    email: managerEmail.toLowerCase(),
    passwordHash,
    role: "manager",
    isActive: true,
  }).returning();

  const [club] = await db.insert(clubsTable).values({
    name,
    iconUrl: iconUrl ?? null,
    managerId: manager.id,
    isActive: true,
  }).returning();

  await db.update(usersTable)
    .set({ clubId: club.id })
    .where(eq(usersTable.id, manager.id));

  res.status(201).json(await buildClubResponse(club));
});

router.put("/clubs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, iconUrl, managerFullName, managerEmail } = req.body;

  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, id)).limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found" });
    return;
  }

  const updateData: Partial<typeof clubsTable.$inferInsert> = {};
  if (name) updateData.name = name;
  if (iconUrl !== undefined) updateData.iconUrl = iconUrl;

  const [updated] = await db.update(clubsTable).set(updateData).where(eq(clubsTable.id, id)).returning();

  if (club.managerId && (managerFullName || managerEmail)) {
    const managerUpdate: Record<string, string> = {};
    if (managerFullName) managerUpdate.fullName = managerFullName;
    if (managerEmail) managerUpdate.email = managerEmail.toLowerCase();
    await db.update(usersTable).set(managerUpdate).where(eq(usersTable.id, club.managerId));
  }

  res.json(await buildClubResponse(updated));
});

router.delete("/clubs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, id)).limit(1);
  if (!club) {
    res.status(404).json({ error: "Club not found" });
    return;
  }

  await db.delete(clubsTable).where(eq(clubsTable.id, id));
  if (club.managerId) {
    await db.delete(usersTable).where(eq(usersTable.id, club.managerId));
  }

  res.json({ success: true });
});

router.patch("/clubs/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be boolean" });
    return;
  }

  await db.update(clubsTable).set({ isActive }).where(eq(clubsTable.id, id));
  res.json({ success: true });
});

router.get("/clubs/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.clubId, id))
    .orderBy(membersTable.createdAt);

  const [club] = await db.select({ name: clubsTable.name }).from(clubsTable).where(eq(clubsTable.id, id)).limit(1);

  res.json(members.map(m => ({
    id: m.id,
    clubId: m.clubId,
    fullName: m.fullName,
    phoneNumber: m.phoneNumber,
    age: m.age,
    gender: m.gender,
    addedBy: m.addedBy,
    createdAt: m.createdAt.toISOString(),
    clubName: club?.name ?? null,
  })));
});

export default router;
