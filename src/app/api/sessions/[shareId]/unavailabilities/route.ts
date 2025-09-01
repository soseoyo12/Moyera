import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function assertSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && serviceKey);
}

export async function GET(_req: NextRequest, { params }: { params: { shareId: string } }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = params;

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (sessionErr) return NextResponse.json({ error: "fetch_session_failed" }, { status: 500 });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // For now, fetch all unavailabilities grouped by participant
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, created_at, updated_at, unavailabilities(d, h)")
    .eq("session_id", session.id);

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  return NextResponse.json({ participants: data });
}

export async function POST(req: NextRequest, { params }: { params: { shareId: string } }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = params;
  const body = (await req.json().catch(() => null)) as {
    participantId?: string;
    unavailable?: { d: string; h: number }[];
    available?: { d: string; h: number }[];
  } | null;
  if (!body || !body.participantId || (!Array.isArray(body.unavailable) && !Array.isArray(body.available))) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (sessionErr) return NextResponse.json({ error: "fetch_session_failed" }, { status: 500 });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Verify participant belongs to session
  const { data: p, error: perr } = await supabase
    .from("participants")
    .select("id")
    .eq("id", body.participantId)
    .eq("session_id", session.id)
    .maybeSingle();
  if (perr) return NextResponse.json({ error: "participant_check_failed" }, { status: 500 });
  if (!p) return NextResponse.json({ error: "participant_not_found" }, { status: 404 });

  // Upsert: delete old rows then insert new ones
  const del = await supabase
    .from("unavailabilities")
    .delete()
    .eq("participant_id", body.participantId);
  if (del.error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  const unavailable = Array.isArray(body.unavailable)
    ? body.unavailable
    : Array.isArray(body.available)
      ? []
      : [];

  if (Array.isArray(body.available)) {
    // If available provided, convert to unavailability as complement on server side is ambiguous without session range
    // We assume client sends 'unavailable' for now unless provided explicitly
  }

  if (unavailable.length > 0) {
    const insert = await supabase
      .from("unavailabilities")
      .insert(unavailable.map((u) => ({ participant_id: body.participantId!, d: u.d, h: u.h })));
    if (insert.error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // mark participant as submitted
  await supabase
    .from("participants")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", body.participantId);

  return NextResponse.json({ ok: true });
}
