import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazy Supabase client
 * Prevents Next.js build from crashing during prerender
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build/prerender these may not exist — return a dummy client
  if (!url || !key) {
    console.warn("Supabase env missing during build — returning noop client");

    client = new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "Supabase client accessed during build. This should only run in the browser."
        );
      },
    });

    return client;
  }

  client = createClient(url, key);
  return client;
}
