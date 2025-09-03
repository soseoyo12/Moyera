import { NextResponse } from "next/server";

interface GoogleCalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
}

interface GoogleEventsListResponse {
  items?: GoogleCalendarEvent[];
}

interface GoogleApiErrorPayload {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ message?: string; domain?: string; reason?: string }>;
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accessToken, startDate, endDate } = body;

    if (!accessToken || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Build time window
    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate + 'T23:59:59').toISOString();

    // Validate token scopes (debug-friendly)
    try {
      const ti = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, { cache: 'no-store' });
      if (ti.ok) {
        const tiData = (await ti.json()) as { scope?: string };
        const scopeStr = tiData.scope || '';
        const needed = 'https://www.googleapis.com/auth/calendar.readonly';
        if (!scopeStr.split(/\s+/).includes(needed)) {
          return NextResponse.json({ error: 'Insufficient scope', details: `Token scopes: ${scopeStr}` }, { status: 403 });
        }
      } else {
        const ttext = await ti.text();
        return NextResponse.json({ error: 'Invalid access token', details: ttext }, { status: 401 });
      }
    } catch {
      // Non-fatal; continue to Calendar API call
    }

    // Call Google Calendar API directly with bearer token
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults: '100',
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}` , {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      const text = await resp.text();
      let errJson: GoogleApiErrorPayload | null = null;
      try {
        errJson = JSON.parse(text) as GoogleApiErrorPayload;
      } catch {}
      const message = errJson?.error?.message || `Google API error ${resp.status}`;
      return NextResponse.json({ error: "Failed to fetch calendar events", details: message }, { status: 502 });
    }

    const data = (await resp.json()) as GoogleEventsListResponse;
    const events = data.items || [];
    
    // Filter and format events
    const relevantEvents = events
      .map(event => {
        const startDateTime = event.start?.dateTime || (event.start?.date ? `${event.start.date}T00:00:00` : undefined);
        const endDateTime = event.end?.dateTime || (event.end?.date ? `${event.end.date}T00:00:00` : undefined);
        return {
          id: event.id,
          summary: event.summary || 'Untitled Event',
          start: startDateTime,
          end: endDateTime,
          description: event.description,
        };
      })
      .filter(e => !!e.start && !!e.end);

    return NextResponse.json({ events: relevantEvents });
  } catch (error) {
    console.error('Google Calendar API error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch calendar events",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
