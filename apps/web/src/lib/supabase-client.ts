import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

const browserLock = async <T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>,
): Promise<T> => {
  // Some browsers/webviews implement Navigator LockManager incorrectly.
  // Use an in-process lock to avoid noisy warnings and auth race conditions.
  return fn();
};

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      lock: browserLock,
    },
  });
  return browserClient;
}
