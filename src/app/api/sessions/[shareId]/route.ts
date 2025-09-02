import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, share_id, tz, start_date, end_date, created_at")
      .eq("share_id", shareId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ session: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
