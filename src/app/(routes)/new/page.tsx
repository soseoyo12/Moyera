"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { useTransition } from "react";

export default function NewSessionPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState<string>(format(today, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(addDays(today, 6), "yyyy-MM-dd"));

  const [isPending, startTransition] = useTransition();

  async function handleCreate() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start: startDate, end: endDate }),
        });
        const data = await res.json();
        const shareId = data.shareId as string;
        window.location.href = `/s/${shareId}?start=${startDate}&end=${endDate}`;
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4 bg-white rounded shadow-sm mt-6">
      <h1 className="text-xl font-semibold">세션 생성</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">시작일</label>
          <input type="date" className="border rounded px-3 py-2 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">종료일</label>
          <input type="date" className="border rounded px-3 py-2 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="pt-2 flex gap-2">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50" onClick={handleCreate} disabled={isPending}>
          {isPending ? "생성 중..." : "세션 만들기"}
        </button>
        <button className="border px-4 py-2 rounded" onClick={() => window.history.back()}>취소</button>
      </div>
    </div>
  );
}
