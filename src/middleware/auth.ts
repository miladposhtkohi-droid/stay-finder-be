import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createServerClient } from "@supabase/ssr";

import { env } from "../env.js";
import type { BasicSupabaseClient } from "../types/supabase.js";
import type { Database } from "../types/database.types.js";

/**
 * Skapar en Supabase-klient för det aktuella HTTP-anropet.
 * Läser inkommande cookies från webbläsaren och sätter nya HttpOnly-cookies
 * vid inloggning/utloggning (Krav G1 & G2).
 */
function createSupabaseForRequest(c: Context): BasicSupabaseClient {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        const cookies = getCookie(c);

        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value
        }));
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(c, name, value, {
            domain: options.domain,
            expires: options.expires,
            maxAge: options.maxAge,
            httpOnly: true, // Skyddar cookien så att JavaScript i webbläsaren inte kan läsa den (XSS-skydd)
            secure: env.nodeEnv === "production",
            sameSite: "lax",
            path: "/"
          });
        });
      }
    }
  });
}

/**
 * Hämtar eller skapar Supabase-klienten för anropet och kontrollerar
 * om användaren är inloggad (Autentisering).
 */
async function setSupabaseContext(c: Context): Promise<void> {
  const existingClient = c.get("supabase") as (BasicSupabaseClient | undefined)

  if (existingClient) {
    return;
  }

  const supabase = createSupabaseForRequest(c);

  c.set("supabase", supabase as BasicSupabaseClient);

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  c.set("user", error ? null : user);
}

/**
 * Middleware för öppna routes (t.ex. att lista boenden).
 * Sätter Supabase-klienten i context men kräver inte att man är inloggad.
 */
export async function optionalAuth(c: Context, next: Next) {
    await setSupabaseContext(c)
    await next();
}

/**
 * Middleware för skyddade routes (Krav G6, G12 & G14).
 * Stoppar anropet med statuskod 401 Unauthorized om användaren inte är inloggad.
 */
export async function requireAuth(c: Context, next: Next) {
    await setSupabaseContext(c)

    const user = c.get("user")

    if(!user) {
        throw new HTTPException(401, {
            message: "unauthorized"
        })
    }

    await next()
}
