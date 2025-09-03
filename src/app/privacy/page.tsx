import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 · Moyera",
  description: "Moyera(모여라) 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 mt-6 bg-white rounded shadow-sm">
      <h1 className="text-2xl font-semibold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-slate-600">시행일: 2025-09-02</p>

      <section className="mt-6 space-y-3 text-[15px] leading-7 text-slate-800">
        <p>
          Moyera(모여라, 이하 “서비스”)는 이용자의 개인정보를 소중히 여기며, 관련 법령과 규정을 준수합니다. 본 방침은
          어떤 정보를 수집·이용·보관하는지와 이용자의 권리 및 보호 조치를 설명합니다.
        </p>

        <h2 className="mt-6 text-xl font-semibold">1. 수집 및 처리 항목</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>세션 정보: 공유용 ID(랜덤), 일정 범위(시작/종료일)</li>
          <li>참여자 정보: 표시 이름(아이디), 불가능 시간대(9–23시 단위)</li>
          <li>
            Google 캘린더 연동 시: 이벤트 제목, 시작/종료 시각(읽기 전용). 이벤트 데이터 자체는 서버에 저장하지 않고,
            겹치는 시간대를 불가능 슬롯으로 변환하여 저장합니다.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">2. 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>일정 조율 및 “모두 가능” 시간 추천 제공</li>
          <li>세션 공유 및 참여자 간 상태 동기화</li>
          <li>서비스 개선을 위한 최소한의 기술적 로그 수집(오류 분석 등)</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">3. 보관 및 파기</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>세션/참여자/불가능 슬롯 데이터는 서비스 제공을 위해 보관됩니다.</li>
          <li>
            Google 캘린더 이벤트 원본은 서버에 저장하지 않습니다. 연동 시 계산된 불가능 슬롯만 데이터베이스(Supabase)에
            저장됩니다.
          </li>
          <li>이용자 또는 관리자의 삭제 요청 시 지체 없이 파기합니다. (문의: 아래 연락처)</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. 제3자 제공 및 처리 위탁</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            인프라/데이터베이스: Supabase(PostgreSQL, Realtime, Auth). 데이터는 공급자 인프라에 안전하게 저장·전송됩니다.
          </li>
          <li>
            연동 제공자: Google(캘린더 API). OAuth 2.0을 통해 이용자 동의 하에 읽기 전용 범위를 사용합니다.
          </li>
          <li>법령에 특별한 규정이 있거나 수사기관의 적법한 요청이 있는 경우를 제외하고 제3자에 제공하지 않습니다.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">5. 쿠키와 로컬 저장소</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스 동작에 필수적인 쿠키/스토리지만 사용하며, 광고·추적 목적의 쿠키는 사용하지 않습니다.</li>
          <li>Google 로그인 팝업 완료 시 토큰은 일시적으로 브라우저 저장소에 보관될 수 있으나, 즉시 처리 후 제거합니다.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">6. 보안 조치</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>전송 구간 암호화(HTTPS/TLS)</li>
          <li>데이터 접근 제한 및 Supabase RLS(Row Level Security) 적용</li>
          <li>최소 권한 원칙과 접근 통제</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">7. 이용자 권리</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>개인정보 열람·정정·삭제 요청</li>
          <li>캘린더 연동 철회 및 데이터 삭제 요청</li>
          <li>요청은 아래 연락처로 접수되며, 법정 기한 내 처리합니다.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">8. 연락처</h2>
        <p>
          이메일: <a className="text-blue-600 underline" href="mailto:songsy0612@gmail.com">songsy0612@gmail.com</a>
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. 방침 변경</h2>
        <p>
          본 방침은 서비스/법령 변경에 따라 개정될 수 있으며, 중요한 변경 시 공지합니다. 개정판은 본 페이지에 게시되는
          시점부터 효력이 발생합니다.
        </p>
      </section>
    </div>
  );
}
