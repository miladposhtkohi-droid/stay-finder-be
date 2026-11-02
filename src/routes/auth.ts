import { Hono } from "hono";
import { authValidator } from "../validators/authValidator.js";
import { getUser, login, logout, register } from "../database/auth.js";
import { requireAuth } from "../middleware/auth.js";

const auth = new Hono({
  strict: false,
});

/**
 * POST /auth/register
 * Krav G1 & G14: Skapar ett nytt konto.
 * Validerar e-post och lösenord med authValidator (svarar 400 om ogiltig data).
 * Vid lyckat skapande returneras 201 Created.
 */
auth.post("/register", authValidator, async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    const sb = c.get("supabase");
    const user = await register(sb, email, password);
    return c.json({ user }, 201);
  } catch (e: any) {
    console.warn("Error in registering", e);
    return c.json(
      {
        message: e?.message || "Could not register user",
      },
      400,
    );
  }
});

/**
 * POST /auth/login
 * Krav G1 & G14: Loggar in en användare och sätter sessions-cookies.
 * Returnerar 200 OK vid rätt uppgifter, annars 400 Bad Request.
 */
auth.post("/login", authValidator, async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    const sb = c.get("supabase");
    const user = await login(sb, email, password);
    return c.json({ user }, 200);
  } catch (e: any) {
    console.warn("Error in login", e);
    return c.json(
      {
        message: "Invalid credentials",
      },
      400,
    );
  }
});

/**
 * POST /auth/logout
 * Krav G1: Loggar ut användaren och tar bort inloggnings-cookies.
 * Returnerar 200 OK.
 */
auth.post("/logout", async (c) => {
  const sb = c.get("supabase");
  try {
    await logout(sb);
    return c.json({ message: "Logged out successfully" }, 200);
  } catch (e: any) {
    console.warn("Error in logout", e);
    return c.json(
      {
        message: "Error logging out",
      },
      500,
    );
  }
});

/**
 * GET /auth/me
 * Krav G2 & G14: Kontrollerar vem som är inloggad när sidan laddas om.
 * Skyddad med requireAuth (returnerar 401 om ingen är inloggad).
 */
auth.get("/me", requireAuth, async (c) => {
  const sb = c.get("supabase");
  try {
    const user = await getUser(sb);
    return c.json({ user }, 200);
  } catch (e: any) {
    console.warn("Error in getting user", e);
    return c.json(
      {
        message: "Error in getting user",
      },
      500,
    );
  }
});

export default auth;
