"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { use } from "react";

// Simple 9-23 grid builder
const HOURS = Array.from({ length: 15 }, (_, i) => i + 9);

export default function SessionPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const search = useSearchParams();
  // const tz = "UTC"; // reserved for future timezone features
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
  const [bestBlocks, setBestBlocks] = useState<Array<{ day: string; start: number; end: number; length: number; availableCount: number; names: string[] }>>([]);
  const [toast, setToast] = useState<string>("");
  const dragActiveRef = useRef<boolean>(false);
  const dragSetToAvailableRef = useRef<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{ start_date: string; end_date: string } | null>(null);
  const [cellSize, setCellSize] = useState<number>(32);
  const unavailableByKeyRef = useRef<Map<string, Set<string>>>(new Map());
  const [hoverHeat, setHoverHeat] = useState<{ d: string; h: number; names: string[] } | null>(null);

  // Local storage removed per request

  // Load session and optionally existing participants (for future use)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${shareId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.session?.id) {
          setSessionId(data.session.id);
          setSessionData({
            start_date: data.session.start_date,
            end_date: data.session.end_date
          });
        }
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
    const submittedIds = new Set(submitted.map((p) => p.id));
    const idToName = new Map<string, string>(list.map((p) => [p.id, p.name]));
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
    // Save for hover lookups
    unavailableByKeyRef.current = unavailableByKey;
    const heat: Record<string, Record<number, number>> = {};
    const availableSets: Record<string, Record<number, Set<string>>> = {};
    for (const d of days) {
      heat[d] = {} as Record<number, number>;
      availableSets[d] = {} as Record<number, Set<string>>;
      for (const h of HOURS) {
        const key = `${d}-${h}`;
        const unavailableCount = unavailableByKey.get(key)?.size || 0;
        const availableCount = Math.max(0, submitted.length - unavailableCount);
        heat[d][h] = availableCount;
        const unavailable = unavailableByKey.get(key) || new Set<string>();
        const available = new Set<string>();
        for (const pid of submittedIds) {
          if (!unavailable.has(pid)) available.add(pid);
        }
        availableSets[d][h] = available;
      }
    }
    setHeatmap(heat);

    // Find top blocks by maximizing attendees across contiguous ranges (>= 2h)
    const candidates: Array<{ day: string; start: number; end: number; length: number; availableCount: number; names: string[] }>
      = [];
    for (const d of days) {
      for (let i = 0; i < HOURS.length; i++) {
        for (let j = i + 1; j < HOURS.length; j++) { // at least 2 hours: i..j inclusive means length = (j - i + 1)
          const startH = HOURS[i];
          const endH = HOURS[j];
          const length = endH - startH + 1;
          if (length < 2) continue;
          // Intersection of available sets across all hours in [startH, endH]
          let intersection: Set<string> | null = null;
          for (let k = i; k <= j; k++) {
            const hour = HOURS[k];
            const setAtHour = availableSets[d]?.[hour] || new Set<string>();
            if (intersection === null) {
              intersection = new Set(setAtHour);
            } else {
              // intersect
              const next = new Set<string>();
              for (const pid of intersection) {
                if (setAtHour.has(pid)) next.add(pid);
              }
              intersection = next;
            }
            if ((intersection?.size || 0) === 0) break; // prune if nobody remains
          }
          const availableIds = Array.from(intersection || []);
          const availableCount = availableIds.length;
          if (availableCount > 0) {
            const names = availableIds.map((pid) => idToName.get(pid) || pid);
            candidates.push({ day: d, start: startH, end: endH, length, availableCount, names });
          }
        }
      }
    }
    candidates.sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
      if (b.length !== a.length) return b.length - a.length;
      if (a.day !== b.day) return a.day.localeCompare(b.day);
      return a.start - b.start;
    });
    setBestBlocks(candidates.slice(0, 10));
    setParticipantsCount(submitted.length);
  }

  function onHeatCellEnter(d: string, h: number) {
    const key = `${d}-${h}`;
    const unavailable = unavailableByKeyRef.current.get(key);
    const submitted = participants.filter((p) => (p.unavailabilities?.length || 0) > 0);
    const names = submitted
      .filter((p) => !(unavailable?.has(p.id) ?? false))
      .map((p) => p.name);
    setHoverHeat({ d, h, names });
  }

  function onHeatCellLeave() {
    setHoverHeat(null);
  }

  function getWeekdayKoreanShort(dateIso: string): string {
    const day = new Date(dateIso).getDay();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"] as const;
    return weekdays[day] ?? "";
  }

  function formatTimeRange(startHour: number, endHour: number): string {
    return `${startHour}:00–${endHour + 1}:00`;
  }

  async function copyRecommendedSlot(slot: { day: string; start: number; end: number; length: number }) {
    const weekday = getWeekdayKoreanShort(slot.day);
    const text = `${slot.day} (${weekday}) · ${formatTimeRange(slot.start, slot.end)} (${slot.length}시간)`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("추천 시간이 복사되었습니다");
    } catch {
      prompt("아래 내용을 복사하세요", text);
    }
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
        () => {
          refreshAggregates();
        }
      );
      channel.on(
        'postgres_changes',
        sessionId
          ? { event: '*', schema: 'public', table: 'unavailabilities' }
          : { event: '*', schema: 'public', table: 'unavailabilities' },
        () => {
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
    // Use URL params first, fallback to session data
    const startDateStr = start || sessionData?.start_date;
    const endDateStr = end || sessionData?.end_date;
    
    if (!startDateStr || !endDateStr) return [] as string[];
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const list: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, [start, end, sessionData]);



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
    // Calculate new availability state
    const currentState = { ...availability };
    const currentSet = new Set(currentState[d] || []);
    if (dragSetToAvailableRef.current) {
      currentSet.add(h);
    } else {
      currentSet.delete(h);
    }
    currentState[d] = currentSet;
    
    // Update state
    setAvailability(currentState);
    
    if (participantId) {
      await saveToServerWithState(currentState);
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
    // No login. The entered ID is the participant name.
    if (!username.trim()) {
      showToast("아이디(표시 이름)를 입력하세요");
      return;
    }
    const valid = /^[\p{L}\p{N}_\-]{2,24}$/u.test(username.trim());
    if (!valid) {
      showToast("아이디 형식이 올바르지 않습니다");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${shareId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username.trim(), showDetails: true }),
      });
      let data: { participant?: { id?: string }; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok && data.participant?.id) {
        setParticipantId(data.participant.id);
        setName(username.trim());
        showToast("참가 완료");
      } else if (res.status === 409 || data?.error === 'name_taken') {
        showToast("이미 사용 중인 아이디입니다");
      } else {
        showToast("참가자 생성 실패");
      }
    } catch (e) {
      console.error(e);
      showToast("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  async function saveToServerWithState(currentAvailability: Record<string, Set<number>>) {
    if (!participantId) {
      showToast("먼저 참가자로 참여해 주세요");
      return;
    }
    
    // Check if days array is ready
    if (!days || days.length === 0) {
      console.warn("Days array not ready, skipping save");
      showToast("날짜 정보 로딩 중...");
      return;
    }
    
    console.log("Debug - saveToServerWithState:", {
      days,
      currentAvailability,
      availabilityKeys: Object.keys(currentAvailability),
      participantId
    });
    
    const payload: { d: string; h: number }[] = [];
    for (const d of days) {
      // Safe access with explicit check
      if (d && currentAvailability && typeof currentAvailability === 'object') {
        const set = currentAvailability[d] || new Set<number>();
        for (const h of HOURS) {
          if (!set.has(h)) payload.push({ d, h });
        }
      } else {
        console.warn(`Skipping day ${d}, currentAvailability invalid:`, currentAvailability);
      }
    }
    
    console.log("Saving to server:", { participantId, days, payload });
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${shareId}/unavailabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, unavailable: payload }),
      });
      
      if (res.ok) {
        showToast("서버에 저장되었습니다");
      } else {
        const errorData = await res.json().catch(() => ({ error: "unknown" }));
        console.error("Save failed:", res.status, errorData);
        showToast(`서버 저장 실패 (${res.status}): ${errorData.error || "unknown"}`);
      }
    } catch (e) {
      console.error("Save error:", e);
      showToast("네트워크 오류로 저장 실패");
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="lg:border rounded-xl p-4 lg:sticky lg:top-4 h-fit bg-white/70 backdrop-blur order-first">
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
        <div className="order-last">
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
      </div>

      {/* 버튼 줄 제거 per request */}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">결과 히트맵</h2>
        {participantsCount === 0 ? (
          <p className="text-sm text-gray-600 mt-2">참여자가 아직 없습니다.</p>
        ) : (
          <div className="mt-4 flex items-start gap-4">
            <div className="overflow-x-auto">
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
                        <td
                          key={`hm-${d}-${h}`}
                          className={`h-5 w-5 border ${cls}`}
                          title={`${available}/${participantsCount}`}
                          onMouseEnter={() => onHeatCellEnter(d, h)}
                          onMouseLeave={onHeatCellLeave}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="hidden sm:block min-w-[220px] max-w-[260px]">
              <div className="border rounded-md p-3 bg-white shadow-sm">
                <div className="text-xs text-slate-500">가능 인원</div>
                {hoverHeat ? (
                  <div>
                    <div className="mt-1 text-sm font-medium text-slate-700">{hoverHeat.d} · {hoverHeat.h}:00 ({hoverHeat.names.length})</div>
                    <ul className="mt-2 space-y-1 max-h-48 overflow-auto pr-1">
                      {hoverHeat.names.length > 0 ? (
                        hoverHeat.names.map((n, idx) => (
                          <li key={`${n}-${idx}`} className="text-sm text-slate-700 flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                            {n}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-slate-500">없음</li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-slate-600">칸에 마우스를 올리면 이름이 표시됩니다.</div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-600">색상: 회색(0) → 초록(진해질수록 더 많은 가능 인원)</div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">최대 인원 추천 시간 (연속 2시간+)</h2>
        {bestBlocks.length === 0 ? (
          <p className="text-sm text-gray-600 mt-2">추천 구간이 없습니다.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bestBlocks.map((b, idx) => {
              const isTop = idx === 0;
              const weekday = getWeekdayKoreanShort(b.day);
              return (
                <div
                  key={`${b.day}-${b.start}-${b.end}-${idx}`}
                  className={`rounded-xl border bg-white p-3 flex flex-col gap-2 hover:shadow-sm transition ${isTop ? "ring-2 ring-[#34C759]/50 border-[#34C759]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-800">
                      {b.day} <span className="text-slate-500">({weekday})</span>
                    </div>
                    <div className={`text-[10px] px-2 py-0.5 rounded-full ${isTop ? "bg-[#34C759]/20 text-[#1E7F39]" : "bg-slate-100 text-slate-600"}`}>
                      {isTop ? "최다 인원" : `가능 ${b.availableCount}명`}
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight">
                    {formatTimeRange(b.start, b.end)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      연속 <span className="font-medium">{b.length}시간</span> · 가능 <span className="font-medium">{b.availableCount}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyRecommendedSlot(b)}
                        className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                      >
                        복사
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700">
                    {b.names.length > 0 ? (
                      <span className="line-clamp-2 break-words">{b.names.join(', ')}</span>
                    ) : (
                      <span className="text-slate-400">가능한 사람이 없습니다</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
