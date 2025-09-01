import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function assertSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && serviceKey);
}

export async function GET(_req: Request, context: { params: { shareId: string } }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = context.params;

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (sessionErr) return NextResponse.json({ error: "fetch_session_failed" }, { status: 500 });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: participants, error } = await supabase
    .from("participants")
    .select("id, name, show_details, created_at, updated_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  return NextResponse.json({ participants });
}

export async function POST(req: Request, context: { params: { shareId: string } }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = context.params;
  const body = await req.json().catch(() => ({}));
  const { name, showDetails } = body as { name?: string; showDetails?: boolean };
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  // Allow Korean and most letters/numbers/underscore/hyphen, 2-24 length
  if (!/^[\p{L}\p{N}_\-]{2,24}$/u.test(trimmed)) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (sessionErr) return NextResponse.json({ error: "fetch_session_failed" }, { status: 500 });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Enforce per-session unique name
  const { data: dup, error: dupErr } = await supabase
    .from("participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("name", trimmed)
    .maybeSingle();
  if (dupErr) return NextResponse.json({ error: "name_check_failed" }, { status: 500 });
  if (dup) return NextResponse.json({ error: "name_taken" }, { status: 409 });

  const { data, error } = await supabase
    .from("participants")
    .insert({ session_id: session.id, name: trimmed, show_details: showDetails ?? true })
    .select("id, name, show_details")
    .single();

  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ participant: data });
}
