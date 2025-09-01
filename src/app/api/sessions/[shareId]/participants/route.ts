import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function assertSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && serviceKey);
}

export async function GET(_req: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = await context.params;

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

export async function POST(req: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  if (!assertSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  const { shareId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const { name, showDetails } = body as { name?: string; showDetails?: boolean };
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("share_id", shareId)
    .maybeSingle();
  if (sessionErr) return NextResponse.json({ error: "fetch_session_failed" }, { status: 500 });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("participants")
    .insert({ session_id: session.id, name, show_details: showDetails ?? true })
    .select("id, name, show_details")
    .single();

  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ participant: data });
}
