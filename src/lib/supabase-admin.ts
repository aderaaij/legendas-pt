import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY Supabase helpers. These use `SUPABASE_SECRET_KEY` (service role,
 * bypasses RLS) — never import this module from a client component.
 *
 * Purpose: long-running server operations (e.g. an RTP series import that loops
 * over many episodes) must not depend on a caller's short-lived user JWT. The
 * pattern is: authorize the user once at the request boundary, then do all
 * subsequent server work with the service-role client, which never expires and
 * makes no per-operation auth-server calls.
 */

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Service-role client: bypasses RLS, no session, never expires. */
export function createServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Supabase service credentials not configured (SUPABASE_SECRET_KEY)"
    );
  }
  return createClient(url(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AuthError = { message: string; status: number };

/**
 * Validate a user JWT and require the `admin` role. Used by admin-only routes
 * (e.g. the RTP import endpoints) before switching to the service-role client.
 * Returns the user id, or a typed error to map to an HTTP response.
 */
export async function requireAdmin(
  authHeader: string | null
): Promise<{ user: { id: string } } | { error: AuthError }> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: { message: "Authentication required", status: 401 } };
  }

  const token = authHeader.slice(7);
  const userClient = createClient(
    url(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);
  if (error || !user) {
    return { error: { message: "Invalid authentication", status: 401 } };
  }

  const { data: profile, error: profileError } = await userClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError) {
    return {
      error: { message: `Profile fetch error: ${profileError.message}`, status: 500 },
    };
  }
  if (!profile || profile.role !== "admin") {
    return { error: { message: "Admin access required", status: 403 } };
  }

  return { user: { id: user.id } };
}
