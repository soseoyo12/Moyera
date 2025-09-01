import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("moyera_session")?.value;
  if (!token) return NextResponse.json({ user: null });
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("users:id,users!inner(username)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: data.users.id, username: data.users.username } });
}
