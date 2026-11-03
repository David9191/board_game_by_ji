import type { AvatarOption, EndingConfig, QuestionItem, TileDefinition } from './types';

/**
 * ============================================================================
 * 🌟 게임 통합 설정 파일 (발표 전 수정은 이 파일 하나만 고치시면 됩니다!)
 * ============================================================================
 */

export const GAME_SETTINGS = {
  /** 게임 메인 타이틀 */
  gameTitle: '차원 뒤섞인 핫플 탈출기!',
  /** 서브 타이틀 */
  gameSubtitle: '한강·PC방부터 홍해·베들레헴까지! 우리 모둠 실시간 협동 보드게임',
  /** 관리자 페이지(/admin) 기본 비밀번호 (환경변수 ADMIN_PASSWORD가 있으면 환경변수 우선) */
  defaultAdminPassword: '1004',
  /** 시작 시 팀에 기본 제공되는 '주사위 ±1 조절권' 개수 */
  initialAdjustTokens: 2,
};

/** 인원수(2–6인)에 따른 팀 전체 정규 턴 수 및 목표 탈출 열쇠 밸런스 */
export function getBalanceByPlayerCount(playerCount: number): {
  maxTurns: number;
  targetKeys: number;
} {
  switch (playerCount) {
    case 2:
      return { maxTurns: 12, targetKeys: 8 };
    case 3:
      return { maxTurns: 12, targetKeys: 8 };
    case 4:
      return { maxTurns: 14, targetKeys: 9 };
    case 5:
      return { maxTurns: 15, targetKeys: 10 };
    case 6:
    default:
      return { maxTurns: 18, targetKeys: 11 };
  }
}

/** 플레이어가 선택할 수 있는 귀여운 아바타 목록 */
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'fox', emoji: '🦊', label: '사막여우', color: '#ff7a45' },
  { id: 'bear', emoji: '🐻', label: '쿼카곰', color: '#8c6239' },
  { id: 'rabbit', emoji: '🐰', label: '찹쌀토끼', color: '#ff66a3' },
  { id: 'panda', emoji: '🐼', label: '대나무판다', color: '#3b82f6' },
  { id: 'chick', emoji: '🐥', label: '삐약이', color: '#eab308' },
  { id: 'cat', emoji: '🐱', label: '치즈냥', color: '#f97316' },
  { id: 'dog', emoji: '🐶', label: '인절미멍', color: '#10b981' },
  { id: 'frog', emoji: '🐸', label: '청개구리', color: '#22c55e' },
];

/**
 * 20칸 보드판 정의 (인덱스 00 ~ 19, 8:2 비율)
 * - 일반/파티 16칸 (포탈 1 + 특수 2 + 한국 핫플 13)
 * - 성경 황금 명소 4칸 (03 에덴동산, 08 홍해, 13 여리고, 18 베들레헴 — 열쇠 2개!)
 */
export const BOARD_TILES: TileDefinition[] = [
  {
    index: 0,
    name: '차원 포탈 (출발)',
    shortName: '차원포탈',
    emoji: '🌀',
    category: 'portal',
    eventType: 'portal',
    rewardKeys: 1,
    themeColor: '#6366f1',
    subtitle: '한 바퀴 돌 때마다 열쇠 +1!',
  },
  {
    index: 1,
    name: 'PC방',
    shortName: 'PC방',
    emoji: '🖱️',
    category: 'hotplace',
    eventType: 'tap_rush',
    rewardKeys: 1,
    themeColor: '#3b82f6',
    subtitle: '3초 광클 합동 미션!',
    introStory: '한타 시작 3초 전! 모둠원 전원이 화면(또는 스페이스바)을 미친 듯이 연타해 승리를 쟁취하세요!',
  },
  {
    index: 2,
    name: '한강 공원',
    shortName: '한강공원',
    emoji: '🍜',
    category: 'hotplace',
    eventType: 'guess_protagonist',
    rewardKeys: 1,
    themeColor: '#0ea5e9',
    subtitle: '친구 취향 맞히기',
  },
  {
    index: 3,
    name: '에덴동산',
    shortName: '★에덴동산',
    emoji: '🍎',
    category: 'biblical',
    eventType: 'empathy_talk',
    rewardKeys: 2,
    themeColor: '#f59e0b',
    subtitle: '🌟 황금 명소 (열쇠 +2)',
    introStory:
      '인류 최초의 평화로운 정원 에덴동산! 그런데 원래 "절대 하지 마!"라고 하면 더 눈길이 가고 손이 근질거리는 법이죠?',
  },
  {
    index: 4,
    name: '코인노래방',
    shortName: '코노방',
    emoji: '🎤',
    category: 'hotplace',
    eventType: 'timing_sync',
    rewardKeys: 1,
    themeColor: '#ec4899',
    subtitle: '하이라이트 박자 터치!',
    introStory: '코노 100점 도전! 움직이는 박자 바가 황금 구역에 들어올 때 전원이 타이밍 맞춰 터치하세요!',
  },
  {
    index: 5,
    name: '편의점',
    shortName: '편의점',
    emoji: '🍙',
    category: 'hotplace',
    eventType: 'telepathy',
    rewardKeys: 1,
    themeColor: '#14b8a6',
    subtitle: '이심전심 텔레파시',
  },
  {
    index: 6,
    name: '지하철 급행역',
    shortName: '지하철역',
    emoji: '🚇',
    category: 'special',
    eventType: 'subway_jump',
    rewardKeys: 0,
    themeColor: '#8b5cf6',
    subtitle: '원하는 칸 즉시 이동!',
    introStory: '급행열차 도착! 모둠원들과 상의해 가고 싶은 명소(🌟 열쇠 2개 성경 명소 추천!)로 바로 점프하세요!',
  },
  {
    index: 7,
    name: '학교 매점',
    shortName: '학교매점',
    emoji: '🥐',
    category: 'hotplace',
    eventType: 'target_catch',
    rewardKeys: 1,
    themeColor: '#f97316',
    subtitle: '4초 간식 싹쓸이!',
    introStory: '쉬는 시간 종이 쳤다! 4초 안에 화면에 뜨는 매점 간식들을 모둠원이 힘을 합쳐 터치해 담으세요!',
  },
  {
    index: 8,
    name: '홍해',
    shortName: '★홍해',
    emoji: '🌊',
    category: 'biblical',
    eventType: 'red_sea_combo',
    rewardKeys: 2,
    themeColor: '#f59e0b',
    subtitle: '🌟 황금 명소 (열쇠 +2)',
    introStory:
      '앞에는 거대한 바다, 뒤에는 막막한 추격대! 성경 속 기적처럼 우리가 힘을 합쳐 홍해 바닷길을 양쪽으로 갈라볼까요?',
  },
  {
    index: 9,
    name: '인생네컷',
    shortName: '인생네컷',
    emoji: '📸',
    category: 'hotplace',
    eventType: 'guess_protagonist',
    rewardKeys: 1,
    themeColor: '#f43f5e',
    subtitle: '친구 취향 맞히기',
  },
  {
    index: 10,
    name: '마라탕·떡볶이집',
    shortName: '마라·떡볶이',
    emoji: '🌶️',
    category: 'hotplace',
    eventType: 'guess_protagonist',
    rewardKeys: 1,
    themeColor: '#ef4444',
    subtitle: '친구 취향 맞히기',
  },
  {
    index: 11,
    name: '럭키 찬스 상자',
    shortName: '럭키찬스',
    emoji: '🎁',
    category: 'special',
    eventType: 'lucky_chest',
    rewardKeys: 1,
    themeColor: '#a855f7',
    subtitle: '보너스 열쇠 & ±1권!',
    introStory: '행운의 보급 상자 발견! 우리 모둠에게 필요한 특별 보너스가 쏟아집니다!',
  },
  {
    index: 12,
    name: '오락실',
    shortName: '오락실',
    emoji: '🕹️',
    category: 'hotplace',
    eventType: 'target_catch',
    rewardKeys: 1,
    themeColor: '#06b6d4',
    subtitle: '4초 타겟 팡팡!',
    introStory: '오락실 두더지 & 타겟 팡팡! 4초 동안 반짝이는 타겟 아이콘들을 재빠르게 눌러 점수를 채우세요!',
  },
  {
    index: 13,
    name: '여리고',
    shortName: '★여리고',
    emoji: '🧱',
    category: 'biblical',
    eventType: 'jericho_combo',
    rewardKeys: 2,
    themeColor: '#f59e0b',
    subtitle: '🌟 황금 명소 (열쇠 +2)',
    introStory:
      '절대 무너지지 않을 것 같던 거대한 여리고 성벽! 사람들이 한마음으로 함께 외쳤을 때 성벽이 와르르 무너졌대요!',
  },
  {
    index: 14,
    name: '성수동 팝업',
    shortName: '성수동',
    emoji: '✨',
    category: 'hotplace',
    eventType: 'telepathy',
    rewardKeys: 1,
    themeColor: '#10b981',
    subtitle: '이심전심 텔레파시',
  },
  {
    index: 15,
    name: '야구장',
    shortName: '야구장',
    emoji: '⚾',
    category: 'hotplace',
    eventType: 'timing_sync',
    rewardKeys: 1,
    themeColor: '#2563eb',
    subtitle: '9회말 홈런 스윙!',
    introStory: '9회말 2아웃 만루! 날아오는 공이 배트 스윗스팟에 들어오는 순간 다 같이 홈런 스윙을 날리세요!',
  },
  {
    index: 16,
    name: '영화관',
    shortName: '영화관',
    emoji: '🍿',
    category: 'hotplace',
    eventType: 'guess_protagonist',
    rewardKeys: 1,
    themeColor: '#7c3aed',
    subtitle: '친구 취향 맞히기',
  },
  {
    index: 17,
    name: '노들섬',
    shortName: '노들섬',
    emoji: '🌅',
    category: 'hotplace',
    eventType: 'guess_protagonist',
    rewardKeys: 1,
    themeColor: '#fb7185',
    subtitle: '친구 취향 맞히기',
  },
  {
    index: 18,
    name: '베들레헴',
    shortName: '★베들레헴',
    emoji: '⭐',
    category: 'biblical',
    eventType: 'empathy_talk',
    rewardKeys: 2,
    themeColor: '#f59e0b',
    subtitle: '🌟 황금 명소 (열쇠 +2)',
    introStory:
      '화려한 왕궁이 아니라 작고 소박한 마구간에 가장 따뜻한 선물(예수님)이 찾아온 별빛 마을, 베들레헴에 도착했어요!',
  },
  {
    index: 19,
    name: '롯데월드',
    shortName: '롯데월드',
    emoji: '🎢',
    category: 'hotplace',
    eventType: 'telepathy',
    rewardKeys: 1,
    themeColor: '#e11d48',
    subtitle: '이심전심 텔레파시',
  },
];

/**
 * ============================================================================
 * 1) 한국 핫플: 주인공 취향 맞히기 질문 풀 (타일 인덱스별 & 공용)
 * ============================================================================
 */
export const GUESS_PROTAGONIST_QUESTIONS: Record<number, QuestionItem[]> = {
  // 02 한강 공원
  2: [
    {
      id: 'hg-1',
      prompt: '선선한 저녁 한강 공원! 딱 하나만 먹을 수 있다면 주인공의 선택은?',
      options: ['🍜 즉석 기계로 끓인 뜨끈한 한강 라면', '🍗 돗자리 위 바삭한 순살 치킨', '🍕 치즈 쭉 늘어나는 피자', '🍡 떡볶이 + 어묵 세트'],
    },
    {
      id: 'hg-2',
      prompt: '한강에 놀러 갔을 때 주인공이 가장 선호하는 힐링 스타일은?',
      options: ['🚲 따릉이 타고 시원하게 강변 질주!', '🎧 돗자리 누워서 노을 보며 음악 듣기', '🗣️ 친구들이랑 밤늦게까지 수다 떨기', '📷 인생샷 100장 건지기'],
    },
  ],
  // 09 인생네컷
  9: [
    {
      id: 'photo-1',
      prompt: '친구들과 인생네컷 부스에 들어갔다! 주인공이 제일 자주 하는 스타일은?',
      options: ['✌️ 실패 없는 국룰 브이·볼하트 정석 포즈', '🤪 선글라스·인형 탈 쓰고 엽기 컨셉샷', '😎 시크하게 무표정 거울샷 감성', '🫣 부끄러워서 친구 포즈 따라 하기'],
    },
    {
      id: 'photo-2',
      prompt: '소품샵·인생네컷 머리띠 고를 때 주인공의 선택은?',
      options: ['🐰 귀여운 동물 귀 머리띠', '🕶️ 힙한 긱시크 안경·선글라스', '👑 주인공은 나야 나 공주/왕관 세트', '🙅 아무 소품 안 쓰고 맨얼굴 승부!'],
    },
  ],
  // 10 마라탕·떡볶이집
  10: [
    {
      id: 'food-1',
      prompt: '시험 끝난 날 점심! 주인공이 지금 당장 더 끌리는 소울푸드는?',
      options: ['🌶️ 내가 원하는 재료 듬뿍 마라탕 (+꿔바로우)', '🥘 치즈 폭포 즉석 떡볶이 (+볶음밥)', '🍔 육즙 가득 수제버거 + 감자튀김', '🍣 깔끔하고 든든한 초밥·연어덮밥'],
    },
    {
      id: 'food-2',
      prompt: '매운 음식을 먹을 때 주인공의 실제 맵찔이·맵부심 레벨은?',
      options: ['🍼 0~1단계 순한맛이 최고야 (평화주의자)', '😋 신라면 정도! 딱 맛있게 매운 1.5~2단계', '🔥 불닭볶음면은 가볍게 먹는 매운맛 고수', '🥵 매워서 눈물 흘리면서도 계속 먹는 스타일'],
    },
  ],
  // 16 영화관
  16: [
    {
      id: 'movie-1',
      prompt: '영화관 매점 앞! 주인공이 절대 포기 못 하는 팝콘·간식 취향은?',
      options: ['🍿 달콤 고소 반반 팝콘 (카라멜+어니언/치즈)', '🧂 오리지널 짭짤한 기본 팝콘', '🧀 짭조름한 칠리치즈 나초 또는 버터오징어', '🥤 간식 안 먹고 음료수만 마시며 집중!'],
    },
    {
      id: 'movie-2',
      prompt: '친구들과 영화 보러 갔을 때 주인공이 제일 좋아하는 영화 장르는?',
      options: ['💥 심장 쫄깃한 마블·액션·재난 블록버스터', '😂 아무 생각 없이 배 잡고 웃는 코미디', '💕 설레거나 눈물 쏙 빼는 로맨스·드라마', '👻 손 가리고 보는 공포·미스터리 스릴러'],
    },
  ],
  // 17 노들섬
  17: [
    {
      id: 'nodeul-1',
      prompt: '일주일 동안 학원·학교로 방전된 금요일 밤! 주인공의 에너지 충전법은?',
      options: ['🛌 집 침대와 한 몸이 되어 릴스·유튜브 정주행', '🎮 친구들이랑 디스코드 켜고 게임 달리기', '🏃 밖에 나가서 산책하거나 코노·카페 가기', '😴 일단 10시간 기절 꿀잠부터 자기'],
    },
    {
      id: 'nodeul-2',
      prompt: '마음이 좀 복잡하거나 지칠 때 주인공에게 더 힘이 되는 건?',
      options: ['🤗 "무슨 일 있어?" 하고 먼저 물어봐 주는 수다', '🍫 말없이 맛있는 간식 쓱 건네주는 센스', '🎧 혼자 조용히 생각 정리할 시간을 주는 배려', '🤣 정신없게 웃겨서 고민을 잊게 해주는 텐션'],
    },
  ],
};

/**
 * ============================================================================
 * 2) 한국 핫플: 이심전심 텔레파시 질문 풀 (과반수 일치 시 성공!)
 * ============================================================================
 */
export const TELEPATHY_QUESTIONS: Record<number, QuestionItem[]> = {
  // 05 편의점
  5: [
    {
      id: 'cvs-1',
      prompt: '학교 끝나고 배고파서 다 같이 편의점 돌진! 하나 둘 셋 하면 같은 간식 고르기!',
      options: ['🍙 참치마요·전주비빔 삼각김밥', '🍜 컵라면 (육개장·불닭·튀김우동)', '🍫 초코우유·바나나우유 + 달달한 빵', '🌭 전자레인지 갓 돌린 핫바·소시지'],
    },
    {
      id: 'cvs-2',
      prompt: '더운 날 편의점 1+1 행사장! 우리 모둠의 마음이 가장 많이 모일 음료는?',
      options: ['🥤 톡 쏘는 제로콜라·사이다', '🍑 달달 상큼 아이스티·이온음료', '🥛 든든한 초코에몽·바나나맛우유', '🧋 당 충전 밀크티·커피 음료'],
    },
  ],
  // 14 성수동 팝업
  14: [
    {
      id: 'seongsu-1',
      prompt: '이번 주말 우리 모둠이 성수동에 놀러 간다면, 제일 먼저 들를 곳 통일하기!',
      options: ['🎁 사은품 잔뜩 주는 캐릭터·브랜드 팝업스토어', '🍰 인스타 감성 디저트·소금빵 맛집 카페', '👕 구경만 해도 재밌는 편집샵·빈티지 옷가게', '📸 소품 가득한 하이앵글 포토부스'],
    },
  ],
  // 19 롯데월드
  19: [
    {
      id: 'lotte-1',
      prompt: '롯데월드 정문 통과 직후! 하나 둘 셋 하면 1순위로 달려갈 곳 맞추기!',
      options: ['🌊 야외 매직아일랜드 급발진! 아틀란티스', '🛸 하늘 끝까지 올라가는 자이로스윙·자이로드롭', '🎠 머리띠부터 사서 회전목마 앞 단체 인증샷!', '🥨 금강산도 식후경! 추로스·회오리감자 먹방'],
    },
  ],
};

/**
 * ============================================================================
 * 3) 🌟 성경 4대 명소 전용 콘텐츠 (거부감 Zero · 친근감 & 편견 해소)
 * ============================================================================
 */

/** 에덴동산(03) · 베들레헴(18): 정답 없는 가치관·공감 토크 질문 풀 */
export const BIBLICAL_EMPATHY_QUESTIONS: Record<number, QuestionItem[]> = {
  // 03 에덴동산
  3: [
    {
      id: 'eden-1',
      prompt: '솔직히 "지금 이거 하면 안 되는데!" 알면서도 매일 밤 지고 마는 고1 최대의 유혹은?',
      options: [
        '📱 "딱 5분만!" 했다가 새벽 2시 되는 릴스·쇼츠',
        '🧹 시험기간에만 갑자기 미친 듯이 재밌는 방 청소',
        '🍜 밤 11시에 코끝을 스치는 라면·야식 유혹',
        '⏰ 아침 알람 "5분만 더..." 3번 연속 미루기',
      ],
      explanation:
        '누구나 유혹 앞에선 약해지기 마련이죠! 성경의 에덴동산 이야기도 완벽한 사람들의 자랑이 아니라, 우리처럼 흔들리고 실수하는 평범한 사람들의 이야기로 시작된답니다 😊',
    },
    {
      id: 'eden-2',
      prompt: '성적·숙제 걱정 하나도 없이 나에게 완벽한 평화("나만의 에덴동산")가 주어진다면?',
      options: [
        '🏝️ 아무도 안 깨우는 포근한 이불 속 무제한 늦잠',
        '✈️ 친한 친구들이랑 떠나는 맛있는 여행',
        '🎮 눈치 안 보고 하루 종일 좋아하는 취미·게임 몰입',
        '🌿 잔잔한 음악 틀어놓고 맛있는 디저트 먹으며 멍때리기',
      ],
      explanation:
        '듣기만 해도 숨통이 트이죠? 사실 교회가 말하는 진짜 "안식(쉼)"도 억지로 무언가를 해야 하는 곳이 아니라, 지친 마음을 잠시 내려놓고 편히 쉬어가는 정원 같은 시간이랍니다 🌿',
    },
  ],
  // 18 베들레헴
  18: [
    {
      id: 'beth-1',
      prompt: '비싸고 거창한 건 아니지만, 내 마음을 제일 따뜻하게 만들었던 "작지만 최고의 선물"은?',
      options: [
        '💬 힘들 때 "네 편이야, 괜찮아" 해준 친구의 카톡 한 줄',
        '🍫 배고프거나 지쳤을 때 쓱 건네준 매점 간식 하나',
        '✉️ 생각지도 못했던 짧은 손편지나 생일 축하 연락',
        '🤝 말하지 않아도 옆자리에서 조용히 함께 있어 준 시간',
      ],
      explanation:
        '진짜 감동은 화려함보다 진심에서 오죠! 베들레헴의 예수님도 높은 왕궁이 아니라, 누구나 부담 없이 다가갈 수 있는 가장 낮고 소박한 자리로 우리에게 선물처럼 찾아오셨대요 ⭐',
    },
    {
      id: 'beth-2',
      prompt: '누군가 나를 스펙이나 성적표 없이 "있는 모습 그대로" 반겨준다면 언제 제일 위로가 될까요?',
      options: [
        '📉 열심히 했는데 생각만큼 결과가 안 나와 속상할 때',
        '😶 사람들 사이에서 괜히 나만 겉도는 기분이 들 때',
        '😮‍💨 아무 이유 없이 그냥 다 지치고 만사가 귀찮을 때',
        '🙌 새로운 환경(새 학기·낯선 모임)에서 긴장될 때',
      ],
      explanation:
        '맞아요, 우리 모두 조건 없이 환영받을 때 마음이 놓이잖아요. 교회와 예수님의 마음도 "완벽해져서 와!"가 아니라 "지친 그대로 편하게 놀러 와!"에 가장 가깝답니다 💛',
    },
  ],
};

/** 홍해(08) · 여리고(13): 1단계 협동 미니게임 직후 나오는 2단계 초간단 상식·오해풀기 퀴즈 */
export const BIBLICAL_STAGE2_QUIZZES: Record<number, QuestionItem[]> = {
  // 08 홍해
  8: [
    {
      id: 'redsea-q1',
      prompt: '[교회 오해 풀기 O/X] 교회에 처음 놀러 가려면 미리 성경책을 사거나 예쁜 정장을 입고 가야 한다?',
      options: ['⭕ 그렇다! 준비물이 필요하다', '❌ 아니다! 후드티에 빈손으로 그냥 가도 된다'],
      correctIndex: 1,
      explanation:
        '정답은 ❌! 편의점이나 친구 집에 놀러 가듯 후드티·교복 차림에 빈손으로 가도 백 퍼센트 환영받는 편한 곳이에요! 성경 가사·말씀도 화면에 다 띄워준답니다 😄',
    },
    {
      id: 'redsea-q2',
      prompt: '[호기심 상식] 방금 우리가 가른 "홍해"! 성경 이야기에서 바다가 갈라졌을 때 사람들은 어떻게 건넜을까요?',
      options: ['🏊 구명조끼 입고 헤엄쳐서', '🥾 밤새 바람이 불어 바싹 마른 땅을 걸어서', '🚣 급하게 뗏목을 만들어서'],
      correctIndex: 1,
      explanation:
        '정답은 ② 마른 땅을 걸어서! 막막한 바다 한가운데에도 보송보송한 길을 내어주신다는 희망찬 이야기예요 🌊✨',
    },
  ],
  // 13 여리고
  13: [
    {
      id: 'jericho-q1',
      prompt: '[마음의 벽 허물기 O/X] 교회는 원래 믿는 사람들만 가는 곳이라, 비신자 친구가 호기심이나 간식 때문에 놀러 가면 이상하게 본다?',
      options: ['⭕ 눈치 보일 수 있다', '❌ 전혀! 친구 따라 구경 오고 밥 먹으러 오는 것도 대환영이다'],
      correctIndex: 1,
      explanation:
        '정답은 ❌! 실제로 처음 교회 온 친구들 중 절반 이상이 "친구가 맛있는 거 준대서 / 궁금해서" 편하게 놀러 왔다가 친구 사귀고 간답니다 😆',
    },
    {
      id: 'jericho-q2',
      prompt: '[마음의 벽 허물기 O/X] 교회에 가면 궁금한 걸 물어보거나 "잘 안 믿겨요"라고 솔직하게 말하면 혼난다?',
      options: ['⭕ 조용히 고개만 끄덕여야 한다', '❌ 솔직하게 질문하고 고민을 털어놓아도 완전 괜찮다!'],
      correctIndex: 1,
      explanation:
        '정답은 ❌! 원래 친해질수록 솔직한 질문이 오가는 법이죠. 성경 속 인물들도 궁금한 건 솔직하게 다 물어보며 가까워졌어요!',
    },
  ],
};

/**
 * ============================================================================
 * 4) 🎬 엔딩 영상 ("재밌게 잘 하셨나요?") & 다음 교회 행사 홍보 설정
 * ============================================================================
 */
export const ENDING_CONFIG: EndingConfig = {
  /**
   * 직접 준비하신 동영상 파일이 있다면 public 폴더에 넣고 '/ending.mp4' 로 적거나,
   * 유튜브 링크(예: 'https://www.youtube.com/embed/영상ID')를 넣어주세요!
   * 빈 문자열('')로 두시면 내장된 시네마틱 모션 엔딩 영상이 멋지게 자동 재생됩니다.
   */
  customVideoUrl: '',
  videoAutoPlay: true,

  /** 내장 시네마틱 엔딩 영상 슬라이드 ("재밌게 잘 하셨나요?" → 따뜻한 메시지 → 다음 행사 예고) */
  outroSlides: [
    {
      emoji: '🎉',
      headline: '재밌게 잘 하셨나요?',
      subtext: '한강·PC방부터 홍해·베들레헴까지, 우리 모둠 호흡 진짜 최고였어요!',
      durationMs: 3800,
    },
    {
      emoji: '🤝',
      headline: '조금 더 가까워진 우리 사이!',
      subtext: '서로의 소울푸드와 속마음을 맞히며 웃었던 오늘 이 시간을 기억해 주세요.',
      durationMs: 4200,
    },
    {
      emoji: '✨',
      headline: '성경과 교회도 사실 이런 곳이에요',
      subtext: '딱딱하고 어려운 곳이 아니라, 지친 일상 속 편히 웃고 쉬어가는 따뜻한 아지트랍니다.',
      durationMs: 4500,
    },
    {
      emoji: '💌',
      headline: '우리 다음에 한 번 더 만날까요?',
      subtext: '오늘 게임보다 더 재밌고 맛있는 시간이 여러분을 기다리고 있어요! 👇',
      durationMs: 4500,
    },
  ],

  warmGreetingTitle: '우리 모둠 전원 탈출 대성공! 🏆',
  warmGreetingBody:
    '처음엔 조금 어색했을지 몰라도, 함께 주사위를 굴리고 바닷길과 성벽을 넘으며 어느새 든든한 원팀이 되었네요! 오늘 나눈 웃음만큼 앞으로 교실에서도 더 반갑게 인사하기로 해요.',

  gospelCardTitle: '💌 여러분에게 전하는 작은 진심 한 줄',
  gospelCardBody:
    '오늘 보드판에서 만났던 에덴, 홍해, 여리고, 베들레헴 이야기처럼 — 하나님과 교회는 멀고 무거운 곳이 아니에요. 막막할 땐 홍해처럼 새 길을 열어주시고, 베들레헴의 가장 낮은 자리로 찾아오신 예수님은 지금 여러분의 모습 그대로를 소중히 여기며 언제든 편히 놀러 오길 기다리고 계신답니다.',

  /** 마지막에 노출되는 다음 교회 행사 홍보 초대장 (발표 일정에 맞춰 문구만 바꿔주세요!) */
  nextEventPromo: {
    badge: '🎈 SPECIAL INVITATION · 다음 행사 초대장',
    title: '고1 친구 초청 페스티벌 〈우리들의 아지트 데이〉',
    subtitle: '성경책 없어도 OK! 교회가 처음이어도 100% 편하게 즐기는 레크리에이션 & 맛집 파티',
    dateText: '이번 달 돌아오는 일요일 오전 11:00 (부담 없이 몸만 오세요!)',
    locationText: '우리 교회 청소년부 아지트홀 (발표자에게 편하게 물어봐 주세요 🙌)',
    perks: [
      '🍕 피자·치킨 & 간식 풀코스 준비 완료',
      '🎁 처음 온 친구 & 함께 온 단짝 웰컴 기프트 증정',
      '🎮 오늘 보드게임보다 더 꿀잼인 팀 게임 & 경품 추첨',
    ],
    posterImageUrl: '',
    ctaLabel: '',
    ctaUrl: '',
  },
};

