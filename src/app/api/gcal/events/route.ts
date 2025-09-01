import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Implement Google Calendar proxy once credentials are configured
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
