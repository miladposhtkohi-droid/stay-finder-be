import type { BasicSupabaseClient } from "../types/supabase.js";
import type { AuthUser } from "../types/auth.js";

/**
 * Krav G1: Skapa ett nytt konto i Supabase Auth.
 * Returnerar användarens id och email (typad som AuthUser, Krav G16).
 */
export async function register(sb: BasicSupabaseClient, email: string, password: string): Promise<AuthUser> {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
  });
  if (!error && data.user) {
    return {
        id: data.user.id,
        email: data.user.email as string,
    };
  }
  throw error;
}

/**
 * Krav G1: Logga in en befintlig användare med e-post och lösenord.
 * När detta lyckas sätter vår middleware automatiskt HttpOnly-cookies i svaret.
 */
export async function login(sb: BasicSupabaseClient, email: string, password: string): Promise<AuthUser> {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (!error && data.user) {
    return {
        id: data.user.id,
        email: data.user.email as string,
    };
  }
  throw error;
}

/**
 * Krav G1: Logga ut användaren.
 * Anropar Supabase signOut() vilket avslutar sessionen och rensar auth-cookies via vår middleware.
 */
export async function logout(sb: BasicSupabaseClient): Promise<void> {
  const { error } = await sb.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Krav G2: Hämta den inloggade användaren (via sessions-cookien).
 * Används när sidan laddas om i frontenden för att visa vem som är inloggad.
 */
export async function getUser(sb: BasicSupabaseClient): Promise<AuthUser> {
  const { data, error } = await sb.auth.getUser();
  if (!error && data.user) {
    return {
        id: data.user.id,
        email: data.user.email as string,
    };
  }
  throw error;
}
