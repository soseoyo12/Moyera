import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("moyera_session")?.value;
  if (!token) return NextResponse.json({ user: null });
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("token, expires_at, users:users!inner(id, username)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data || !data.users) return NextResponse.json({ user: null });
  const u = Array.isArray((data as unknown as { users: unknown }).users)
    ? ((data as unknown as { users: { id: string; username: string }[] }).users[0])
    : ((data as unknown as { users: { id: string; username: string } }).users);
  return NextResponse.json({ user: { id: u.id, username: u.username } });
}
