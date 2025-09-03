export default function Home() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">모여라(Moyera) – 캘린더 공유 · 일정 조율</h1>
        <p className="mt-3 text-slate-600 text-[15px]">
          링크 공유만으로 가능한 시간을 모으고, 히트맵과 추천으로 최적의 모임 시간을 빠르게 확정하세요.
          Google 캘린더 읽기 연동도 지원합니다.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a href="/new" className="inline-flex items-center px-4 py-2 rounded-lg bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0A84FF]/90">새 세션 만들기</a>
        </div>
      </section>

      <section id="features" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold">시간 선택 그리드</h3>
          <p className="mt-1 text-sm text-slate-600">9–23시 범위에서 드래그/탭으로 가능·불가능을 간편하게 표시합니다.</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold">결과 히트맵</h3>
          <p className="mt-1 text-sm text-slate-600">시간대별 가능 인원을 색으로 보여주고, 최대 인원 추천 구간을 제공합니다.</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold">Google 캘린더 연동</h3>
          <p className="mt-1 text-sm text-slate-600">읽기 권한만으로 일정과 겹치는 슬롯을 자동으로 ‘불가능’ 처리합니다.</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">왜 모여라일까요?</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
          <li>링크 공유만으로 누구나 참여</li>
          <li>실시간 동기화, 모바일 터치 최적화</li>
          <li>개인정보 최소 수집·저장, 투명한 방침</li>
        </ul>
      </section>
    </div>
  );
}
