"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Simple 9-23 grid builder
const HOURS = Array.from({ length: 15 }, (_, i) => i + 9);

export default function SessionPage({ params }: { params: { shareId: string } }) {
  const { shareId } = params;
  const search = useSearchParams();
  const tz = "UTC";
  const start = search.get("start");
  const end = search.get("end");

  const [availability, setAvailability] = useState<Record<string, Set<number>>>({});
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; unavailabilities?: { d: string; h: number }[] }>>([]);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [heatmap, setHeatmap] = useState<Record<string, Record<number, number>>>({}); // day -> hour -> availableCount
  const [bestBlocks, setBestBlocks] = useState<Array<{ day: string; start: number; end: number; length: number }>>([]);
  const [toast, setToast] = useState<string>("");
  const dragActiveRef = useRef<boolean>(false);
  const dragSetToAvailableRef = useRef<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState<number>(32);

  // Local storage removed per request

  // Load session and optionally existing participants (for future use)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${shareId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.session?.id) setSessionId(data.session.id);
      } catch {}
    })();
  }, [shareId]);

  // Fetch participants + unavailability and compute heatmap
  useEffect(() => {
    refreshAggregates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, start, end]);

  async function refreshAggregates() {
    try {
      const res = await fetch(`/api/sessions/${shareId}/unavailabilities`);
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.participants || []) as Array<{ id: string; name: string; unavailabilities?: { d: string; h: number }[] }>;
      setParticipants(list);
      setParticipantsCount(list.length);
      computeHeatmapAndBest(list);
    } catch (e) {
      console.error(e);
    }
  }

  function computeHeatmapAndBest(list: Array<{ id: string; name: string; unavailabilities?: { d: string; h: number }[] }>) {
    const unavailableByKey = new Map<string, Set<string>>(); // key = `${d}-${h}`, value = set of participantId
    const submitted = list.filter((p) => (p.unavailabilities?.length || 0) > 0);
    for (const p of submitted) {
      const arr = p.unavailabilities || [];
      for (const u of arr) {
        const key = `${u.d}-${u.h}`;
        let s = unavailableByKey.get(key);
        if (!s) {
          s = new Set<string>();
          unavailableByKey.set(key, s);
        }
        s.add(p.id);
      }
    }
    const heat: Record<string, Record<number, number>> = {};
    for (const d of days) {
      heat[d] = {} as Record<number, number>;
      for (const h of HOURS) {
        const key = `${d}-${h}`;
        const unavailableCount = unavailableByKey.get(key)?.size || 0;
        const availableCount = Math.max(0, submitted.length - unavailableCount);
        heat[d][h] = availableCount;
      }
    }
    setHeatmap(heat);

    // Find best contiguous blocks where all are available (availableCount == list.length)
    const fullBlocks: Array<{ day: string; start: number; end: number; length: number }> = [];
    for (const d of days) {
      let runStart: number | null = null;
      for (const h of HOURS) {
        const isFull = heat[d]?.[h] === submitted.length && submitted.length > 0;
        if (isFull) {
          if (runStart === null) runStart = h;
        } else {
          if (runStart !== null) {
            const runEnd = h - 1;
            const length = runEnd - runStart + 1;
            if (length >= 2) fullBlocks.push({ day: d, start: runStart, end: runEnd, length });
            runStart = null;
          }
        }
      }
      if (runStart !== null) {
        const runEnd = HOURS[HOURS.length - 1];
        const length = runEnd - runStart + 1;
        if (length >= 2) fullBlocks.push({ day: d, start: runStart, end: runEnd, length });
      }
    }
    fullBlocks.sort((a, b) => b.length - a.length);
    setBestBlocks(fullBlocks.slice(0, 10));
    setParticipantsCount(submitted.length);
  }

  // Realtime subscribe
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // If env is missing, client will be misconfigured; skip realtime
    try {
      const channel = supabase.channel(`session:${shareId}`);
      channel.on(
        'postgres_changes',
        sessionId
          ? { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }
          : { event: '*', schema: 'public', table: 'participants' },
        (_payload) => {
          refreshAggregates();
        }
      );
      channel.on(
        'postgres_changes',
        sessionId
          ? { event: '*', schema: 'public', table: 'unavailabilities' }
          : { event: '*', schema: 'public', table: 'unavailabilities' },
        (_payload) => {
          refreshAggregates();
        }
      );
      // also poll every 4s as a fallback in case realtime is delayed
      const interval = setInterval(() => {
        refreshAggregates();
      }, 4000);
      channel.subscribe();
      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, sessionId]);

  const days = useMemo(() => {
    if (!start || !end) return [] as string[];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const list: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, [start, end]);

  async function toggle(d: string, h: number) {
    if (!participantId) {
      showToast("먼저 아이디로 참가하세요");
      return;
    }
    setAvailability((prev) => {
      const copy: Record<string, Set<number>> = { ...prev };
      const set = new Set(copy[d] || []);
      if (set.has(h)) set.delete(h); else set.add(h);
      copy[d] = set;
      return copy;
    });
    // Auto save after each toggle if joined
    await saveToServer();
  }

  function beginDrag(d: string, h: number) {
    if (!participantId) {
      showToast("먼저 아이디로 참가하세요");
      return;
    }
    const currentlySelected = availability[d]?.has(h) ?? false;
    const willBeSelected = !currentlySelected;
    dragActiveRef.current = true;
    dragSetToAvailableRef.current = willBeSelected;
    applyDragToCell(d, h);
  }

  async function applyDragToCell(d: string, h: number) {
    setAvailability((prev) => {
      const copy: Record<string, Set<number>> = { ...prev };
      const set = new Set(copy[d] || []);
      if (dragSetToAvailableRef.current) set.add(h); else set.delete(h);
      copy[d] = set;
      return copy;
    });
    if (participantId) {
      await saveToServer();
    }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLTableCellElement>, d: string, h: number) {
    e.preventDefault();
    beginDrag(d, h);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!participantId || !dragActiveRef.current) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
    const td = el?.closest('td[data-d][data-h]') as HTMLElement | null;
    if (!td) return;
    const d = td.getAttribute('data-d');
    const hAttr = td.getAttribute('data-h');
    if (!d || !hAttr) return;
    const hour = parseInt(hAttr, 10);
    applyDragToCell(d, hour);
  }

  function endDrag() {
    dragActiveRef.current = false;
  }

  function onCellMouseEnter(d: string, h: number) {
    if (!dragActiveRef.current) return;
    applyDragToCell(d, h);
  }

  // local save removed

  async function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      showToast("링크가 복사되었습니다");
    } catch {
      // Fallback
      prompt("아래 링크를 복사하세요", url);
    }
  }

  async function joinAsParticipant() {
    // Require login with username first
    if (!username.trim()) {
      showToast("아이디(표시 이름)를 입력하세요");
      return;
    }
    const valid = /^[\p{L}\p{N}_\-]{2,24}$/u.test(username.trim());
    if (!valid) {
      showToast("아이디 형식이 올바르지 않습니다");
      return;
    }
    // create/login user session
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim() }) });
      if (!res.ok) {
        showToast("아이디 등록 실패");
        return;
      }
    } catch (e) {
      console.error(e);
      showToast("네트워크 오류");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${shareId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username.trim(), showDetails: true }),
      });
      const data = await res.json();
      if (res.ok && data.participant?.id) {
        setParticipantId(data.participant.id);
        setName(username.trim());
        showToast("참가 완료");
      } else {
        showToast("참가자 생성 실패");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveToServer() {
    if (!participantId) {
      showToast("먼저 참가자로 참여해 주세요");
      return;
    }
    const payload: { d: string; h: number }[] = [];
    for (const d of days) {
      const set = availability[d] || new Set<number>();
      for (const h of HOURS) {
        if (!set.has(h)) payload.push({ d, h });
      }
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${shareId}/unavailabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, unavailable: payload }),
      });
      if (res.ok) showToast("서버에 저장되었습니다"); else showToast("서버 저장 실패");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // removed day/global reset helpers per request

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 1600);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">세션: {shareId}</h1>
        <div className="text-sm text-gray-600"></div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-600">{participantId ? "회색=기본, 초록=가능" : "회색=기본, 초록=가능. 먼저 아이디(표시 이름)로 참가하세요."}</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>셀 크기</span>
                <input
                  type="range"
                  min={24}
                  max={44}
                  step={2}
                  value={cellSize}
                  onChange={(e) => setCellSize(parseInt(e.target.value))}
                />
              </div>
              {/* 초기화 버튼 제거 per request */}
            </div>
          </div>
          <div
            className="overflow-x-auto select-none rounded border bg-white"
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchMove={handleTouchMove}
            onTouchEnd={endDrag}
            onTouchCancel={endDrag}
          >
            <table className="w-full table-fixed border-collapse rounded overflow-hidden">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="sticky left-0 bg-white/90 backdrop-blur text-left p-2 text-xs font-medium text-slate-500 z-10">시간</th>
                  {days.map((d) => (
                    <th key={`day-hdr-${d}`} className="text-xs text-slate-700 p-2 font-medium text-center">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h) => (
                  <tr key={`row-${h}`}>
                    <td className="sticky left-0 bg-white/90 backdrop-blur p-2 text-xs whitespace-nowrap text-slate-600 z-10">{h}:00</td>
                    {days.map((d) => {
                      const selected = availability[d]?.has(h);
                      return (
                        <td
                          key={`${d}-${h}`}
                          className={`text-center align-middle cursor-pointer border border-slate-200 ${selected ? "bg-[#34C759]" : "bg-slate-100 hover:bg-slate-200"}`}
                          style={{ width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize }}
                          onMouseDown={() => beginDrag(d, h)}
                          onMouseEnter={() => onCellMouseEnter(d, h)}
                          onClick={() => toggle(d, h)}
                          onTouchStart={(e) => handleTouchStart(e, d, h)}
                          title={`${d} ${h}:00 ${selected ? "가능" : "기본(미선택)"}`}
                          data-d={d}
                          data-h={h}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="lg:border rounded-xl p-4 lg:sticky lg:top-4 h-fit bg-white/70 backdrop-blur">
          <h3 className="font-medium text-slate-700">공유 & 참가</h3>
          {participantId ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm">{name || username}</div>
              <div className="px-2 py-1 rounded-lg bg-[#34C759]/20 text-[#1E7F39] text-xs">참여완료</div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <input
                placeholder="아이디(표시 이름, 2-24자, 한글 가능)"
                className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button className="border px-3 py-2 rounded-lg text-sm hover:bg-slate-50 hover:border-slate-300" onClick={joinAsParticipant} disabled={loading}>
                참가하기
              </button>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="border px-3 py-2 rounded-lg text-sm col-span-2 hover:bg-slate-50 hover:border-slate-300" onClick={copyLink}>링크 복사</button>
          </div>
          <div className="mt-5">
            <h4 className="text-sm font-medium">참여자 ({participantsCount})</h4>
            <ul className="mt-2 space-y-1 max-h-48 overflow-auto pr-1">
              {participants.map((p) => (
                <li key={p.id} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  {p.name}
                </li>
              ))}
              {participants.length === 0 && (
                <li className="text-sm text-gray-500">아직 없습니다.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {/* 버튼 줄 제거 per request */}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">결과 히트맵</h2>
        {participantsCount === 0 ? (
          <p className="text-sm text-gray-600 mt-2">참여자가 아직 없습니다.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full table-fixed border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="sticky left-0 bg-white/90 backdrop-blur text-left p-2 text-xs font-medium text-slate-500 z-10" style={{width: "56px"}}>시간</th>
                  {days.map((d) => (
                    <th key={`hm-day-${d}`} className="text-xs text-slate-700 p-2 font-medium text-center">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h) => (
                  <tr key={`hm-row-${h}`}>
                    <td className="sticky left-0 bg-white/90 backdrop-blur p-2 text-xs whitespace-nowrap text-slate-600 z-10" style={{width: "56px"}}>{h}:00</td>
                    {days.map((d) => {
                      const available = heatmap[d]?.[h] ?? 0;
                      const ratio = participantsCount > 0 ? available / participantsCount : 0;
                      let cls = "bg-green-100";
                      if (ratio === 1) cls = "bg-green-600";
                      else if (ratio >= 0.75) cls = "bg-green-400";
                      else if (ratio >= 0.5) cls = "bg-green-300";
                      else if (ratio > 0) cls = "bg-green-200";
                      else cls = "bg-slate-200";
                      return (
                        <td key={`hm-${d}-${h}`} className={`h-6 border ${cls}`} title={`${available}/${participantsCount}`} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-gray-600">색상: 회색(0) → 초록(진해질수록 더 많은 가능 인원)</div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">모두 가능한 추천 시간 (연속 2시간+)</h2>
        {bestBlocks.length === 0 ? (
          <p className="text-sm text-gray-600 mt-2">추천 구간이 없습니다.</p>
        ) : (
          <ol className="mt-2 list-decimal list-inside text-sm">
            {bestBlocks.map((b, idx) => (
              <li key={`${b.day}-${b.start}-${b.end}-${idx}`}>
                {b.day} · {b.start}:00–{b.end + 1}:00 ({b.length}시간)
              </li>
            ))}
          </ol>
        )}
      </section>

      {toast && (
        <div className="fixed right-4 bottom-4 bg-black text-white text-sm px-3 py-2 rounded shadow">
          {toast}
        </div>
      )}
    </div>
  );
}
