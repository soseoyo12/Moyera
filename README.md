## 모여라(Moyera) – 캘린더 공유 · 일정 조율 웹앱

링크 공유만으로 여러 사람의 가능/불가능 시간을 모아 최적의 모임 시간을 추천하는 웹 서비스입니다.

- **라이브 서비스**: [moyera.site](https://moyera.site)
- **한 줄 소개**: 시간 선택 그리드, 히트맵, Google 캘린더 읽기 연동으로 모임 시간을 빠르게 확정합니다.

### 주요 기능
- **세션 생성·공유**: 랜덤 `shareId`로 생성된 링크(`/s/{shareId}`)를 공유하면 누구나 참여
- **시간 선택 그리드(9–23시)**: 드래그/탭으로 가능·불가능 표시
- **참여자 관리(무계정)**: 표시 이름만으로 바로 참여, 실시간 동기화
- **결과 히트맵**: 시간대별 가능 인원 시각화(0→진한 초록)
- **추천 시간 자동 도출**: 연속 2시간 이상 구간 중 최대 인원 Top 10
- **Google 캘린더 읽기 연동(선택)**: `calendar.readonly` 스코프로 내 일정 불러와 겹치는 슬롯을 자동으로 ‘불가능’ 처리
- **연속/종일 이벤트 스팬 표시**: 한 블록으로 테두리 표시, 첫 칸 내부에 일정명 1회 표시
- **링크 복사·공유**: 바로 공유 가능한 링크 제공

### 기술 스택
- **프론트엔드**: Next.js(App Router), React, Tailwind CSS, TypeScript
- **백엔드/데이터**: Supabase(PostgreSQL, Realtime, RLS)
- **연동**: Google Calendar API(OAuth 2.0 – Readonly)

### 데이터 모델(요약)
- `sessions`: 세션 기본 정보(공유용 ID, 날짜 범위 등)
- `participants`: 참여자(표시 이름, 공개 여부)
- `unavailabilities`: 참여자별 불가능 슬롯(날짜 `d`, 시간 `h`)

### 정책
- **개인정보처리방침**: [https://moyera.site/privacy](https://moyera.site/privacy)
- **이용약관**: [https://moyera.site/terms](https://moyera.site/terms)

### 스크린샷(예시)
UI 스크린샷은 추후 `public/`에 추가해 README에서 보여줄 수 있습니다.

### 로드맵(발췌)
- 개인별 타임존 변환, iCal 내보내기(.ics), N-1 만족 기반 추천, 캐싱 고도화 등

문의: songsy0612@gmail.com
