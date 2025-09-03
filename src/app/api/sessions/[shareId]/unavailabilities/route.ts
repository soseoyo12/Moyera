import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function assertSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && serviceKey);
}

export async function GET(_req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = await params;

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (sessionErr) {
    console.error("unavailabilities: fetch_session_failed", { shareId, error: sessionErr });
    return NextResponse.json({ error: "fetch_session_failed", details: sessionErr.message }, { status: 500 });
  }
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // For now, fetch all unavailabilities grouped by participant
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, created_at, updated_at, unavailabilities(d, h)")
    .eq("session_id", session.id);

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  return NextResponse.json({ participants: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = await params;
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
  if (perr) {
    console.error("unavailabilities: participant_check_failed", { participantId: body.participantId, error: perr });
    return NextResponse.json({ error: "participant_check_failed", details: perr.message }, { status: 500 });
  }
  if (!p) return NextResponse.json({ error: "participant_not_found" }, { status: 404 });

  // Upsert rows first (so there is never a window with 0 rows)

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
    const rows = unavailable.map((u) => ({ participant_id: body.participantId!, d: u.d, h: u.h }));
    const upsertRes = await supabase
      .from("unavailabilities")
      .upsert(rows, { onConflict: "participant_id,d,h" });
    if (upsertRes.error) {
      console.error("unavailabilities: upsert_failed", { participantId: body.participantId, count: rows.length, error: upsertRes.error });
      return NextResponse.json({ error: "upsert_failed", details: upsertRes.error.message }, { status: 500 });
    }

    // Then delete extras per day to match exactly the new set
    const byDay = new Map<string, number[]>();
    for (const r of rows) {
      const arr = byDay.get(r.d) || [];
      if (!arr.includes(r.h)) arr.push(r.h);
      byDay.set(r.d, arr);
    }
    for (const [d, hours] of byDay.entries()) {
      if (hours.length === 0) {
        const delRes = await supabase
          .from("unavailabilities")
          .delete()
          .eq("participant_id", body.participantId!)
          .eq("d", d);
        if (delRes.error) {
          console.error("unavailabilities: cleanup_delete_failed", { participantId: body.participantId, error: delRes.error });
          return NextResponse.json({ error: "cleanup_delete_failed", details: delRes.error.message }, { status: 500 });
        }
      } else {
        const delRes = await supabase
          .from("unavailabilities")
          .delete()
          .eq("participant_id", body.participantId!)
          .eq("d", d)
          .not("h", "in", `(${hours.join(",")})`);
        if (delRes.error) {
          console.error("unavailabilities: cleanup_delete_failed", { participantId: body.participantId, error: delRes.error });
          return NextResponse.json({ error: "cleanup_delete_failed", details: delRes.error.message }, { status: 500 });
        }
      }
    }
  } else {
    // No unavailability means remove all rows for this participant
    const delAll = await supabase.from("unavailabilities").delete().eq("participant_id", body.participantId);
    if (delAll.error) {
      console.error("unavailabilities: delete_all_failed", { participantId: body.participantId, error: delAll.error });
      return NextResponse.json({ error: "delete_all_failed", details: delAll.error.message }, { status: 500 });
    }
  }

  // mark participant as submitted
  await supabase
    .from("participants")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", body.participantId);

  return NextResponse.json({ ok: true });
}
