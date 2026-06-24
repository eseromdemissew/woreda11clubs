import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const replitSub = claims.sub as string;
  const email = (claims.email as string | undefined) ?? null;
  const firstName = (claims.first_name as string | undefined) ?? "";
  const lastName = (claims.last_name as string | undefined) ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || (claims.username as string) || email?.split("@")[0] || "User";
  const username = (claims.username as string) || email?.split("@")[0] || replitSub.slice(0, 12);
  const profilePhotoUrl = ((claims.profile_image_url || claims.picture) as string | undefined) ?? null;

  // 1. Look up by replitSub
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.replitSub, replitSub))
    .limit(1);

  if (!user && email) {
    // 2. Match existing user by email (links Replit identity to manually-created accounts)
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (user) {
      await db
        .update(usersTable)
        .set({ replitSub, profilePhotoUrl, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }
  }

  if (!user) {
    // 3. Create new user (admin will assign role if needed)
    const safeEmail = email ?? `replit_${replitSub}@woreda11.local`;
    let safeUsername = username;

    // Ensure username uniqueness
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, safeUsername))
      .limit(1);

    if (existing) {
      safeUsername = `${safeUsername}_${replitSub.slice(0, 6)}`;
    }

    [user] = await db
      .insert(usersTable)
      .values({
        replitSub,
        username: safeUsername,
        fullName,
        email: safeEmail,
        passwordHash: null,
        role: "manager",
        profilePhotoUrl,
        isActive: true,
      })
      .returning();
  } else {
    // Update profile info
    await db
      .update(usersTable)
      .set({ profilePhotoUrl, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }

  return user;
}

// GET /auth/user — returns current session user for the frontend auth hook
router.get("/auth/user", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }
  res.json({ user: req.user });
});

// GET /auth/me — existing endpoint used by frontend, kept for compatibility
router.get("/auth/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({
    id: req.user.id,
    username: req.user.firstName && req.user.lastName
      ? `${req.user.firstName} ${req.user.lastName}`.toLowerCase().replace(/\s+/g, "_")
      : req.user.email?.split("@")[0] ?? req.user.id,
    fullName: req.user.fullName,
    email: req.user.email,
    role: req.user.role,
    clubId: req.user.clubId,
    profilePhotoUrl: req.user.profileImageUrl,
    isActive: req.user.isActive,
    createdAt: new Date().toISOString(),
  });
});

// GET /login — start OIDC login flow
router.get("/login", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;
    const returnTo = getSafeReturnTo(req.query.returnTo);

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    setOidcCookie(res, "code_verifier", codeVerifier);
    setOidcCookie(res, "nonce", nonce);
    setOidcCookie(res, "state", state);
    setOidcCookie(res, "return_to", returnTo);

    res.redirect(redirectTo.href);
  } catch (err) {
    req.log.error({ err }, "Failed to start OIDC login");
    res.status(500).json({ error: "Login unavailable" });
  }
});

// GET /callback — OIDC callback
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;

    const codeVerifier = req.cookies?.code_verifier;
    const nonce = req.cookies?.nonce;
    const expectedState = req.cookies?.state;

    if (!codeVerifier || !expectedState) {
      res.redirect("/api/login");
      return;
    }

    const currentUrl = new URL(
      `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
    );

    let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
    try {
      tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: codeVerifier,
        expectedNonce: nonce,
        expectedState,
        idTokenExpected: true,
      });
    } catch {
      res.redirect("/api/login");
      return;
    }

    const returnTo = getSafeReturnTo(req.cookies?.return_to);

    res.clearCookie("code_verifier", { path: "/" });
    res.clearCookie("nonce", { path: "/" });
    res.clearCookie("state", { path: "/" });
    res.clearCookie("return_to", { path: "/" });

    const claims = tokens.claims();
    if (!claims) {
      res.redirect("/api/login");
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      userId: dbUser.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : (claims.exp as number | undefined),
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.redirect(returnTo);
  } catch (err) {
    req.log.error({ err }, "OIDC callback error");
    res.redirect("/api/login");
  }
});

// GET /logout — clear session and redirect to OIDC end-session
router.get("/logout", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const origin = getOrigin(req);
    const sid = getSessionId(req);
    await clearSession(res, sid);

    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: origin,
    });
    res.redirect(endSessionUrl.href);
  } catch (err) {
    req.log.error({ err }, "Logout error");
    res.redirect("/");
  }
});

// POST /mobile-auth/token-exchange
router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const { code, code_verifier, redirect_uri, state, nonce } = req.body ?? {};

  if (!code || !code_verifier || !redirect_uri || !state) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce ?? undefined,
      expectedState: state,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.status(401).json({ error: "No claims in ID token" });
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      userId: dbUser.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : (claims.exp as number | undefined),
    };

    const sid = await createSession(sessionData);
    res.json({ token: sid });
  } catch (err) {
    req.log.error({ err }, "Mobile token exchange error");
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// POST /mobile-auth/logout
router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json({ success: true });
});

export default router;
