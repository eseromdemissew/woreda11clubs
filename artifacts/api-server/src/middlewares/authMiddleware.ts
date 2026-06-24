import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";

export interface AppUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: "admin" | "manager";
  clubId: string | null;
  fullName: string | null;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: AppUser | undefined;
    }
    interface AuthedRequest extends Request {
      user: AppUser;
    }
  }
}

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;
  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(config, session.refresh_token);
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.userId) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, refreshed.userId))
    .limit(1);

  if (!dbUser || !dbUser.isActive) {
    await clearSession(res, sid);
    next();
    return;
  }

  const [first, ...rest] = dbUser.fullName.split(" ");
  req.user = {
    id: dbUser.id,
    email: dbUser.email,
    firstName: first ?? null,
    lastName: rest.join(" ") || null,
    profileImageUrl: dbUser.profilePhotoUrl,
    role: dbUser.role as "admin" | "manager",
    clubId: dbUser.clubId,
    fullName: dbUser.fullName,
    isActive: dbUser.isActive,
  };

  next();
}
