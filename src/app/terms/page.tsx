import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 이용약관 · Moyera",
  description: "Moyera(모여라) 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 mt-6 bg-white rounded shadow-sm">
      <h1 className="text-2xl font-semibold">서비스 이용약관</h1>
      <p className="mt-2 text-sm text-slate-600">시행일: 2025-09-02</p>

      <section className="mt-6 space-y-3 text-[15px] leading-7 text-slate-800">
        <h2 className="text-xl font-semibold">1. 목적</h2>
        <p>
          본 약관은 이용자가 Moyera(모여라, 이하 “서비스”)를 이용함에 있어 서비스와 이용자 간 권리·의무 및 책임사항을
          규정함을 목적으로 합니다.
        </p>

        <h2 className="text-xl font-semibold mt-6">2. 서비스 내용</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>일정 조율: 참여자의 불가능 시간 입력 및 분석, 최적 시간 추천</li>
          <li>공유 링크 기반 참여, 실시간 동기화</li>
          <li>Google 캘린더 읽기 연동(선택 사항)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">3. 계정 및 참여자 정보</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>참여자 이름은 서비스 내부 식별 및 결과 표시 목적으로 사용됩니다.</li>
          <li>부적절한 명칭 사용, 타인의 권리 침해 시 서비스 이용이 제한될 수 있습니다.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">4. 데이터 처리</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            서비스는 불가능 시간 슬롯을 저장합니다. Google 캘린더 이벤트 원본은 서버에 저장하지 않으며, 슬롯 계산을 위해서만
            일시적으로 처리합니다.
          </li>
          <li>개인정보 보호와 보안 관련 사항은 개인정보처리방침을 따릅니다.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">5. 이용자의 책임</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>정확한 정보 제공 및 서비스 이용 관련 법령 준수</li>
          <li>타인의 권리(저작권, 개인정보 등) 침해 금지</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">6. 서비스 제공, 변경, 중단</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스는 안정적인 제공을 위해 최선을 다합니다.</li>
          <li>운영상, 기술상 필요 시 서비스의 전부 또는 일부를 변경·중단할 수 있으며, 중요한 변경은 사전 공지합니다.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">7. 책임의 한계</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            서비스는 무료로 제공되며, 고의 또는 중대한 과실이 없는 한 서비스 이용과 관련하여 발생한 간접·우연·특별·결과적 손해에
            대해 책임을 지지 않습니다.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">8. 준거법 및 분쟁 해결</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>본 약관은 대한민국 법령을 준거로 합니다.</li>
          <li>분쟁 발생 시 당사자 간 협의로 해결하며, 협의가 어려운 경우 관할 법원에 제기할 수 있습니다.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">9. 문의</h2>
        <p>
          이메일: <a className="text-blue-600 underline" href="mailto:songsy0612@gmail.com">songsy0612@gmail.com</a>
        </p>
      </section>
    </div>
  );
}
