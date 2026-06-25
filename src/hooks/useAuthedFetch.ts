import { useCallback } from "react";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns a `fetch` wrapper that attaches the current user's Supabase access
 * token as a `Bearer` Authorization header. Throws if there is no active
 * session. Callers handle the `Response` themselves (status checks, JSON
 * parsing) so per-call error handling is preserved.
 */
export function useAuthedFetch() {
  const { getAccessToken } = useAuth();

  return useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      return fetch(input, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    },
    [getAccessToken]
  );
}
