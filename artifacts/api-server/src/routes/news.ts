import { Router } from "express";
import { db } from "@workspace/db";
import { newsTable, newsReadsTable, usersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/news", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  const items = await db
    .select({
      id: newsTable.id,
      title: newsTable.title,
      description: newsTable.description,
      imageUrl: newsTable.imageUrl,
      publishedBy: newsTable.publishedBy,
      publishedByName: usersTable.fullName,
      isPublished: newsTable.isPublished,
      publishedAt: newsTable.publishedAt,
      updatedAt: newsTable.updatedAt,
    })
    .from(newsTable)
    .leftJoin(usersTable, eq(newsTable.publishedBy, usersTable.id))
    .where(eq(newsTable.isPublished, true))
    .orderBy(sql`${newsTable.publishedAt} DESC`);

  const reads = await db
    .select({ newsId: newsReadsTable.newsId })
    .from(newsReadsTable)
    .where(eq(newsReadsTable.userId, user.id));

  const readSet = new Set(reads.map(r => r.newsId));

  const readCounts = await db
    .select({ newsId: newsReadsTable.newsId, cnt: count() })
    .from(newsReadsTable)
    .groupBy(newsReadsTable.newsId);

  const countMap = new Map(readCounts.map(r => [r.newsId, r.cnt]));

  res.json(items.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    publishedBy: item.publishedBy,
    publishedByName: item.publishedByName,
    isPublished: item.isPublished,
    publishedAt: item.publishedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    isRead: readSet.has(item.id),
    readCount: countMap.get(item.id) ?? 0,
  })));
});

router.get("/news/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  const [item] = await db
    .select({
      id: newsTable.id,
      title: newsTable.title,
      description: newsTable.description,
      imageUrl: newsTable.imageUrl,
      publishedBy: newsTable.publishedBy,
      publishedByName: usersTable.fullName,
      isPublished: newsTable.isPublished,
      publishedAt: newsTable.publishedAt,
      updatedAt: newsTable.updatedAt,
    })
    .from(newsTable)
    .leftJoin(usersTable, eq(newsTable.publishedBy, usersTable.id))
    .where(eq(newsTable.id, id))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  const [readRow] = await db
    .select({ newsId: newsReadsTable.newsId })
    .from(newsReadsTable)
    .where(eq(newsReadsTable.userId, user.id))
    .limit(1);

  const [countRow] = await db
    .select({ cnt: count() })
    .from(newsReadsTable)
    .where(eq(newsReadsTable.newsId, id));

  res.json({
    id: item.id,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    publishedBy: item.publishedBy,
    publishedByName: item.publishedByName,
    isPublished: item.isPublished,
    publishedAt: item.publishedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    isRead: !!readRow,
    readCount: countRow?.cnt ?? 0,
  });
});

router.post("/news", requireAdmin, async (req, res): Promise<void> => {
  const user = req.user!;
  const { title, description, imageUrl } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: "Title and description required" });
    return;
  }

  const [item] = await db.insert(newsTable).values({
    title,
    description,
    imageUrl: imageUrl ?? null,
    publishedBy: user.id,
    isPublished: true,
  }).returning();

  res.status(201).json({
    id: item.id,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    publishedBy: item.publishedBy,
    publishedByName: user.fullName,
    isPublished: item.isPublished,
    publishedAt: item.publishedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    isRead: false,
    readCount: 0,
  });
});

router.put("/news/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;
  const { title, description, imageUrl } = req.body;

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  const [updated] = await db.update(newsTable).set({
    title: title ?? existing.title,
    description: description ?? existing.description,
    imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
  }).where(eq(newsTable.id, id)).returning();

  res.json({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    imageUrl: updated.imageUrl,
    publishedBy: updated.publishedBy,
    publishedByName: user.fullName,
    isPublished: updated.isPublished,
    publishedAt: updated.publishedAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    isRead: false,
    readCount: 0,
  });
});

router.delete("/news/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "News not found" });
    return;
  }

  await db.delete(newsReadsTable).where(eq(newsReadsTable.newsId, id));
  await db.delete(newsTable).where(eq(newsTable.id, id));
  res.json({ success: true });
});

router.post("/news/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = req.user!;

  await db
    .insert(newsReadsTable)
    .values({ newsId: id, userId: user.id })
    .onConflictDoNothing();

  res.json({ success: true });
});

export default router;
