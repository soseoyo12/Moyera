import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { username } = (await req.json().catch(() => ({}))) as { username?: string };
  // Allow Korean and most letters/numbers/underscore/hyphen, 2-24 length
  if (!username || !/^[\p{L}\p{N}_\-]{2,24}$/u.test(username)) {
    return NextResponse.json({ error: "invalid_username" }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();

  // ensure unique username
  const { data: existing, error: exErr } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: "lookup_failed" }, { status: 500 });

  let userId = existing?.id as string | undefined;
  if (!userId) {
    const { data: created, error: cErr } = await supabase
      .from("users")
      .insert({ username })
      .select("id")
      .single();
    if (cErr || !created) return NextResponse.json({ error: "create_failed" }, { status: 500 });
    userId = created.id as string;
  }

  const token = nanoid(32);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30d
  const { error: sErr } = await supabase
    .from("user_sessions")
    .insert({ token, user_id: userId, expires_at: expires.toISOString() });
  if (sErr) return NextResponse.json({ error: "session_failed", details: sErr.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("moyera_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === 'production',
    path: "/",
    expires,
  });
  return res;
}
