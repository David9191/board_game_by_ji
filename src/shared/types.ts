export type TileCategory = 'portal' | 'hotplace' | 'biblical' | 'special';

export type TileEventType =
  | 'portal'
  | 'tap_rush'
  | 'guess_protagonist'
  | 'telepathy'
  | 'timing_sync'
  | 'target_catch'
  | 'empathy_talk'
  | 'red_sea_combo'
  | 'jericho_combo'
  | 'subway_jump'
  | 'lucky_chest';

export interface QuestionItem {
  id: string;
  prompt: string;
  options: string[];
  /** 정답이 있는 상식/오해풀기 퀴즈일 때 정답 인덱스 (0-based) */
  correctIndex?: number;
  /** 결과 화면에 보여줄 따뜻하고 재치 있는 한 줄 해설 */
  explanation?: string;
}

export interface TileDefinition {
  index: number;
  name: string;
  shortName: string;
  emoji: string;
  category: TileCategory;
  eventType: TileEventType;
  rewardKeys: number;
  themeColor: string;
  subtitle: string;
  introStory?: string;
}

export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export interface PlayerState {
  id: string; // persistent session token id
  socketId: string;
  nickname: string;
  avatarId: string;
  position: number; // 0..19
  isHost: boolean;
  connected: boolean;
}

export type RoomStatus = 'waiting' | 'playing' | 'cleared';

export type TurnPhase =
  | 'ready_to_roll'
  | 'adjust_choice'
  | 'moving'
  | 'mission';

export type MissionKind =
  | 'guess_protagonist'
  | 'telepathy'
  | 'tap_rush'
  | 'timing_sync'
  | 'target_catch'
  | 'empathy_talk'
  | 'red_sea_combo'
  | 'jericho_combo'
  | 'subway_jump'
  | 'lucky_chest'
  | 'finale_rush';

export type MissionStage =
  | 'countdown'
  | 'action'
  | 'quiz'
  | 'talk_share'
  | 'result';

export interface SpawnedTarget {
  id: string;
  emoji: string;
  x: number; // percentage 12..88
  y: number; // percentage 15..82
  caughtBy?: string;
}

export interface ActiveMissionState {
  id: string;
  kind: MissionKind;
  tileIndex: number;
  tileName: string;
  tileEmoji: string;
  isBiblical: boolean;
  protagonistId: string;
  protagonistName: string;
  stage: MissionStage;
  /** 액션 미니게임 제한시간 종료 시각 (epoch ms) */
  endsAt?: number;
  durationMs?: number;
  /** 연타 / 스와이프 / 타이밍 / 타겟 점수 진행도 */
  progress: number;
  targetProgress: number;
  /** 플레이어별 기여도 (탭 횟수, 스와이프 횟수, 타이밍 점수 등) */
  contributions: Record<string, number>;
  /** 투표/선택 미션에서 플레이어별 선택한 옵션 인덱스 */
  votes: Record<string, number>;
  /** 타이밍 미니게임에서 이미 스윙/터치 완료한 플레이어 기록 */
  timingGrades?: Record<string, 'PERFECT' | 'GOOD' | 'MISS'>;
  /** 타겟 캐치 미니게임 아이콘 목록 */
  targets?: SpawnedTarget[];
  /** 현재 질문/퀴즈 데이터 */
  question?: QuestionItem;
  /** 스토리 한 줄 인트로 */
  introStory?: string;
  /** 1단계 미니게임 성공 여부 (홍해/여리고 2단 구성용) */
  stage1Success?: boolean;
  /** 최종 결과 데이터 */
  result?: {
    success: boolean;
    keysEarned: number;
    headline: string;
    detail: string;
    winningOptionIndex?: number;
  };
}

export interface PendingRollState {
  playerId: string;
  baseDice: number; // 1..6
  fromPos: number;
  exactTargetPos: number;
  minusOnePos: number;
  plusOnePos: number;
}

export interface ToastLogItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface RoomState {
  roomCode: string; // 6자리 영문+숫자
  password: string; // 숫자 4자리
  status: RoomStatus;
  players: PlayerState[];
  currentTurnIndex: number; // index in players[]
  turnCount: number; // 1-based current turn
  maxTurns: number;
  keys: number;
  targetKeys: number;
  adjustTokens: number; // 팀 공용 주사위 ±1 조절권
  turnPhase: TurnPhase;
  lastDiceValue: number | null;
  pendingRoll: PendingRollState | null;
  activeMission: ActiveMissionState | null;
  visitedBiblicalTiles: number[];
  logs: ToastLogItem[];
  createdAt: number;
  clearedAt?: number;
}

export interface AdminRoomSummary {
  roomCode: string;
  password: string;
  status: RoomStatus;
  playerCount: number;
  connectedCount: number;
  players: Array<{
    id: string;
    nickname: string;
    avatarId: string;
    position: number;
    tileName: string;
    connected: boolean;
  }>;
  turnCount: number;
  maxTurns: number;
  currentTurnPlayerName: string;
  currentTileIndex: number;
  currentTileName: string;
  currentTileEmoji: string;
  turnPhase: TurnPhase;
  activeMissionTitle: string | null;
  keys: number;
  targetKeys: number;
  visitedBiblicalCount: number;
  createdAt: number;
}

export interface NextChurchEventPromo {
  badge: string;
  title: string;
  subtitle: string;
  dateText: string;
  locationText: string;
  perks: string[];
  posterImageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface EndingConfig {
  /** 직접 제작한 .mp4 경로(예: '/ending.mp4') 또는 유튜브 URL(예: 'https://youtu.be/...'). 비워두면 자체 시네마틱 엔딩 영상이 재생됩니다! */
  customVideoUrl: string;
  videoAutoPlay: boolean;
  outroSlides: Array<{
    emoji: string;
    headline: string;
    subtext: string;
    durationMs: number;
  }>;
  warmGreetingTitle: string;
  warmGreetingBody: string;
  gospelCardTitle: string;
  gospelCardBody: string;
  nextEventPromo: NextChurchEventPromo;
}

