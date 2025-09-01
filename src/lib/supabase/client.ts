import { createClient } from "@supabase/supabase-js";

// Create a typed supabase client for the browser (anon key only)
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return a client that will certainly fail on network calls, but keeps types intact
    // The UI should guard and offer offline mode when these are not set
    console.warn("Supabase browser env not configured. Falling back to placeholder client.");
  }

  return createClient(url || "", anonKey || "");
}
