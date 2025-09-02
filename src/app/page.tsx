"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/new");
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">캘린더 공유 – 일정 조율</h1>
      <p className="mt-2 text-sm text-gray-600">페이지를 이동하는 중입니다...</p>
    </div>
  );
}
