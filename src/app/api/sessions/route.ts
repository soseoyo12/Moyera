import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tz: string | undefined = body?.tz;
  const start: string | undefined = body?.start;
  const end: string | undefined = body?.end;
  const shareId = nanoid(9);

  if (!tz || !start || !end) {
    return NextResponse.json({ error: "tz, start, end are required" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    // Mock mode: return shareId without persisting
    return NextResponse.json({ shareId, persisted: false });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("sessions")
      .insert({ share_id: shareId, tz, start_date: start, end_date: end })
      .single();

    if (error) throw error;
    return NextResponse.json({ shareId, persisted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ shareId, persisted: false, error: "persist_failed" }, { status: 200 });
  }
}
