import { Router, type IRouter } from "express";
import { createUser, getUserByEmail, getVendorByEmail, getVendorInviteByToken, listUsersByVendorId, markVendorInviteUsed, sanitizeUser, updateUser, verifyUserPassword } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  buildAuthorizeUrl,
  createOAuthState,
  defaultFrontendCallbackUrl,
  exchangeCodeForProfile,
  frontendErrorRedirect,
  frontendSuccessRedirect,
  isMicrosoftOAuthConfigured,
  resolveFrontendRedirect,
  takeOAuthState,
} from "../lib/microsoft-oauth";
import {
  buildGoogleAuthorizeUrl,
  exchangeGoogleCodeForProfile,
  isGoogleOAuthConfigured,
  isInternalStaffEmail,
} from "../lib/google-oauth";
import { isSuperAdminEmail } from "../lib/super-admin";

const router: IRouter = Router();

router.get("/auth/providers", (_req, res) => {
  return res.json({
    google: isGoogleOAuthConfigured(),
    microsoft: true,
  });
});

router.get("/auth/oauth/microsoft/start", (req, res) => {
  const redirectTo = resolveFrontendRedirect(req.query.redirectTo);
  if (!isMicrosoftOAuthConfigured()) {
    return res.redirect(
      frontendErrorRedirect(
        redirectTo,
        "Microsoft sign-in is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to the API environment.",
      ),
    );
  }

  const state = createOAuthState(redirectTo);
  return res.redirect(buildAuthorizeUrl(req, state));
});

router.get("/auth/oauth/microsoft/callback", async (req, res) => {
  const stateRecord = takeOAuthState(typeof req.query.state === "string" ? req.query.state : undefined);
  const redirectTo = stateRecord?.redirectTo || defaultFrontendCallbackUrl();

  try {
    if (req.query.error) {
      const description =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : String(req.query.error);
      return res.redirect(frontendErrorRedirect(redirectTo, description));
    }

    if (!stateRecord) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Microsoft sign-in expired. Please try again."),
      );
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Microsoft did not return an authorization code."),
      );
    }

    const profile = await exchangeCodeForProfile(req, code);
    let user = await getUserByEmail(profile.email);
    const role = isSuperAdminEmail(profile.email) ? "admin" : "developer";
    if (!user) {
      user = await createUser({
        name: profile.name,
        email: profile.email,
        role,
        department: isSuperAdminEmail(profile.email) ? "Executive" : "Engineering",
      });
    } else if (isSuperAdminEmail(profile.email) && user.role !== "admin") {
      user =
        (await updateUser(user.id, {
          name: profile.name || user.name,
          role: "admin",
          department: user.department || "Executive",
        })) ?? user;
    }

    return res.redirect(frontendSuccessRedirect(redirectTo, sanitizeUser(user)));
  } catch (e) {
    logger.error({ err: e }, "Microsoft OAuth failed");
    return res.redirect(
      frontendErrorRedirect(redirectTo, "Microsoft sign-in failed. Please try again."),
    );
  }
});

router.get("/auth/oauth/google/start", (req, res) => {
  const redirectTo = resolveFrontendRedirect(req.query.redirectTo);
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(
      frontendErrorRedirect(
        redirectTo,
        "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the API environment.",
      ),
    );
  }

  const inviteToken = typeof req.query.invite === "string" ? req.query.invite : undefined;
  const state = createOAuthState(redirectTo, { inviteToken });
  return res.redirect(buildGoogleAuthorizeUrl(req, state));
});

router.get("/auth/oauth/google/callback", async (req, res) => {
  const stateRecord = takeOAuthState(typeof req.query.state === "string" ? req.query.state : undefined);
  const redirectTo = stateRecord?.redirectTo || defaultFrontendCallbackUrl();

  try {
    if (req.query.error) {
      const description =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : String(req.query.error);
      return res.redirect(frontendErrorRedirect(redirectTo, description));
    }

    if (!stateRecord) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Google sign-in expired. Please try again."),
      );
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Google did not return an authorization code."),
      );
    }

    const profile = await exchangeGoogleCodeForProfile(req, code);
    if (isInternalStaffEmail(profile.email)) {
      return res.redirect(
        frontendErrorRedirect(
          redirectTo,
          "First Registrars staff should sign in with Microsoft.",
        ),
      );
    }

    let user = await getUserByEmail(profile.email);
    const invite = stateRecord.inviteToken
      ? await getVendorInviteByToken(stateRecord.inviteToken)
      : null;
    const vendorByEmail = await getVendorByEmail(profile.email);
    const vendorId = invite?.vendorId || user?.vendorId || vendorByEmail?.id || null;

    if (invite) {
      if (invite.usedAt) {
        return res.redirect(
          frontendErrorRedirect(redirectTo, "This invitation has already been used."),
        );
      }
      if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
        return res.redirect(
          frontendErrorRedirect(redirectTo, "This invitation has expired. Ask PMO to send a new link."),
        );
      }
      if (invite.email !== profile.email) {
        return res.redirect(
          frontendErrorRedirect(
            redirectTo,
            `Sign in with ${invite.email}. This invitation is tied to that Google account.`,
          ),
        );
      }
    } else if (!vendorId) {
      return res.redirect(
        frontendErrorRedirect(
          redirectTo,
          "Use the invitation link sent by First Registrars PMO to sign in with Google.",
        ),
      );
    }

    if (vendorId) {
      const members = await listUsersByVendorId(vendorId);
      const alreadyOnAccount = members.some((member) => member.email.toLowerCase() === profile.email);
      if (!alreadyOnAccount && members.length >= 2) {
        return res.redirect(
          frontendErrorRedirect(
            redirectTo,
            "This vendor account already has two sign-in emails. Ask PMO to replace one of them.",
          ),
        );
      }
    }

    if (invite || (vendorId && (!user || user.role !== "vendor" || user.vendorId !== vendorId))) {
      if (!user) {
        user = await createUser({
          name: profile.name,
          email: profile.email,
          role: "vendor",
          department: "External Vendor",
          avatarUrl: profile.avatarUrl,
          vendorId,
        });
      } else {
        user =
          (await updateUser(user.id, {
            name: profile.name || user.name,
            avatarUrl: profile.avatarUrl || user.avatarUrl,
            role: "vendor",
            vendorId,
          })) ?? user;
      }
      if (invite) {
        await markVendorInviteUsed(invite.id);
      }
    } else if (user && profile.name && profile.name !== user.name) {
      user = (await updateUser(user.id, {
        name: profile.name,
        avatarUrl: profile.avatarUrl || user.avatarUrl,
      })) ?? user;
    }

    if (!user) {
      return res.redirect(
        frontendErrorRedirect(redirectTo, "Use the invitation link sent by First Registrars PMO to sign in with Google."),
      );
    }

    return res.redirect(frontendSuccessRedirect(redirectTo, sanitizeUser(user)));
  } catch (e) {
    logger.error({ err: e }, "Google OAuth failed");
    const message = e instanceof Error ? e.message : "Google sign-in failed. Please try again.";
    return res.redirect(frontendErrorRedirect(redirectTo, message));
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isPasswordValid = await verifyUserPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (e) {
    logger.error({ err: e }, "Login failed");
    const message = e instanceof Error ? e.message : "";
    if (/MONGODB_URI/i.test(message)) {
      return res.status(503).json({
        error: "Database is not configured. Set MONGODB_URI on the backend Vercel project.",
      });
    }
    if (/ENOTFOUND|ECONNREFUSED|querySrv|MongoNetwork|MongoServer|authentication failed/i.test(message)) {
      return res.status(503).json({
        error: "Could not connect to MongoDB. Check MONGODB_URI and Atlas Network Access.",
      });
    }
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const existing = await getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const user = await createUser({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || "developer",
      department: department || "Engineering",
    });
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (e) {
    logger.error({ err: e }, "Signup failed");
    return res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
