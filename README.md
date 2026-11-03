# 🎲 차원 뒤섞인 핫플 탈출기! — 실시간 협동 보드게임

비신자 한국 고1 기독교 수업 발표용 **실시간 멀티룸 모둠 협동 보드게임**입니다.
스마트폰(세로·가로 화면 자동 전환), 태블릿, 노트북 모두 완벽 지원합니다.

---

## 🚀 로컬 실행 방법

```bash
npm install
npm run dev
```
- **학생 접속 화면**: http://localhost:5173
- **관리자 대시보드 & 실시간 관전**: http://localhost:5173/admin (기본 비밀번호: `1004`)

---

## ✏️ 발표 전 질문·엔딩 영상·다음 교회 행사 수정 방법

모든 텍스트·질문·엔딩 설정은 **[`src/shared/gameConfig.ts`](./src/shared/gameConfig.ts)** 파일 한 곳에 모여 있습니다.

1. **게임 제목 및 관리자 비밀번호**: `GAME_SETTINGS` 객체 수정
2. **한국 핫플 취향 투표 & 텔레파시 질문**: `GUESS_PROTAGONIST_QUESTIONS`, `TELEPATHY_QUESTIONS` 배열 수정
3. **성경 4대 명소(에덴·홍해·여리고·베들레헴) 질문 및 해설**: `BIBLICAL_EMPATHY_QUESTIONS`, `BIBLICAL_STAGE2_QUIZZES` 수정
4. **엔딩 영상 & 다음 교회 행사 홍보 초대장**: `ENDING_CONFIG` 수정
   - 직접 제작한 영상(`.mp4`)을 쓰시려면 `public/ending.mp4`에 파일을 넣고 `customVideoUrl: '/ending.mp4'`로 지정하거나 유튜브 링크를 넣으세요.
   - 비워두면(`''`) 기본 내장된 시네마틱 엔딩 영상(`"재밌게 잘 하셨나요?"` → 따뜻한 메시지 → 행사 예고)이 자동 재생됩니다.
   - `nextEventPromo`에서 다음 교회 행사 제목, 일시, 장소, 혜택 문구를 자유롭게 변경할 수 있습니다.

---

## ☁️ 클라우드 무료/간편 배포 (Render / Railway 등)

단일 Node.js + Socket.IO 서버가 빌드된 프론트엔드와 실시간 웹소켓을 함께 서빙하므로 별도의 DB 없이 바로 배포됩니다.

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **(선택) 환경 변수**: `ADMIN_PASSWORD` (지정 시 관리자 비밀번호 덮어쓰기)

