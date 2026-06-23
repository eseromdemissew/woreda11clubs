import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { endpoint, p256dh, auth } = req.body;

  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "endpoint, p256dh, and auth required" });
    return;
  }

  await db
    .insert(pushSubscriptionsTable)
    .values({ userId: user.id, endpoint, p256dh, auth })
    .onConflictDoNothing();

  res.json({ success: true });
});

router.delete("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, user.id));
  res.json({ success: true });
});

export default router;
