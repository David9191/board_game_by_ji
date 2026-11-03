import {
  AVATAR_OPTIONS,
  BIBLICAL_EMPATHY_QUESTIONS,
  BIBLICAL_STAGE2_QUIZZES,
  BOARD_TILES,
  GAME_SETTINGS,
  GUESS_PROTAGONIST_QUESTIONS,
  TELEPATHY_QUESTIONS,
  getBalanceByPlayerCount,
} from '../shared/gameConfig';
import type {
  ActiveMissionState,
  AdminRoomSummary,
  PlayerState,
  QuestionItem,
  RoomState,
  SpawnedTarget,
} from '../shared/types';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface InternalRoom {
  state: RoomState;
  usedQuestionIds: Set<string>;
  timers: Set<ReturnType<typeof setTimeout>>;
}

export class RoomManager {
  private rooms = new Map<string, InternalRoom>();
  private socketToPlayer = new Map<string, { roomCode: string; playerId: string }>();
  private onRoomUpdated: (roomCode: string) => void;

  constructor(onRoomUpdated: (roomCode: string) => void) {
    this.onRoomUpdated = onRoomUpdated;
  }

  private generateRoomCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    return `RM${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  private addTimer(room: InternalRoom, fn: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      room.timers.delete(timer);
      fn();
    }, delayMs);
    room.timers.add(timer);
  }

  private clearRoomTimers(room: InternalRoom): void {
    for (const timer of room.timers) {
      clearTimeout(timer);
    }
    room.timers.clear();
  }

  private pushLog(state: RoomState, text: string): void {
    state.logs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      createdAt: Date.now(),
    });
    if (state.logs.length > 15) {
      state.logs.length = 15;
    }
  }

  private getActivePlayers(state: RoomState): PlayerState[] {
    const connected = state.players.filter((p) => p.connected);
    return connected.length > 0 ? connected : state.players;
  }

  private pickQuestion(room: InternalRoom, pool: QuestionItem[]): QuestionItem {
    const unused = pool.filter((q) => !room.usedQuestionIds.has(q.id));
    const candidates = unused.length > 0 ? unused : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    room.usedQuestionIds.add(chosen.id);
    return chosen;
  }

  public getRoomState(roomCode: string): RoomState | null {
    const normalized = roomCode.trim().toUpperCase();
    return this.rooms.get(normalized)?.state ?? null;
  }

  public getAdminSummaries(): AdminRoomSummary[] {
    const summaries: AdminRoomSummary[] = [];
    for (const { state } of this.rooms.values()) {
      const currentPlayer = state.players[state.currentTurnIndex] ?? state.players[0];
      const activeTileIdx =
        state.activeMission?.tileIndex ??
        (currentPlayer ? currentPlayer.position : 0);
      const tile = BOARD_TILES[activeTileIdx] ?? BOARD_TILES[0];

      summaries.push({
        roomCode: state.roomCode,
        password: state.password,
        status: state.status,
        playerCount: state.players.length,
        connectedCount: state.players.filter((p) => p.connected).length,
        players: state.players.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatarId: p.avatarId,
          position: p.position,
          tileName: BOARD_TILES[p.position]?.shortName ?? '출발',
          connected: p.connected,
        })),
        turnCount: state.turnCount,
        maxTurns: state.maxTurns,
        currentTurnPlayerName: currentPlayer?.nickname ?? '-',
        currentTileIndex: activeTileIdx,
        currentTileName: tile.name,
        currentTileEmoji: tile.emoji,
        turnPhase: state.turnPhase,
        activeMissionTitle: state.activeMission ? `${state.activeMission.tileEmoji} ${state.activeMission.tileName}` : null,
        keys: state.keys,
        targetKeys: state.targetKeys,
        visitedBiblicalCount: state.visitedBiblicalTiles.length,
        createdAt: state.createdAt,
      });
    }
    return summaries.sort((a, b) => b.createdAt - a.createdAt);
  }

  public createRoom(params: {
    socketId: string;
    playerId: string;
    nickname: string;
    avatarId: string;
    password: string;
  }): { ok: true; state: RoomState } | { ok: false; error: string } {
    const nickname = params.nickname.trim().slice(0, 12);
    const password = params.password.trim();
    if (!nickname) return { ok: false, error: '닉네임을 입력해 주세요.' };
    if (!/^\d{4}$/.test(password)) {
      return { ok: false, error: '비밀번호는 숫자 4자리로 입력해 주세요.' };
    }

    const avatarId = AVATAR_OPTIONS.some((a) => a.id === params.avatarId)
      ? params.avatarId
      : AVATAR_OPTIONS[0].id;

    const roomCode = this.generateRoomCode();
    const hostPlayer: PlayerState = {
      id: params.playerId,
      socketId: params.socketId,
      nickname,
      avatarId,
      position: 0,
      isHost: true,
      connected: true,
    };

    const state: RoomState = {
      roomCode,
      password,
      status: 'waiting',
      players: [hostPlayer],
      currentTurnIndex: 0,
      turnCount: 1,
      maxTurns: 14,
      keys: 0,
      targetKeys: 9,
      adjustTokens: GAME_SETTINGS.initialAdjustTokens,
      turnPhase: 'ready_to_roll',
      lastDiceValue: null,
      pendingRoll: null,
      activeMission: null,
      visitedBiblicalTiles: [],
      logs: [],
      createdAt: Date.now(),
    };

    this.pushLog(state, `🎉 ${nickname}님이 방(${roomCode})을 만들었습니다!`);
    this.rooms.set(roomCode, {
      state,
      usedQuestionIds: new Set(),
      timers: new Set(),
    });
    this.socketToPlayer.set(params.socketId, { roomCode, playerId: params.playerId });
    this.onRoomUpdated(roomCode);
    return { ok: true, state };
  }

  public joinRoom(params: {
    socketId: string;
    playerId: string;
    nickname: string;
    avatarId: string;
    roomCode: string;
    password: string;
  }): { ok: true; state: RoomState } | { ok: false; error: string } {
    const roomCode = params.roomCode.trim().toUpperCase();
    const password = params.password.trim();
    const nickname = params.nickname.trim().slice(0, 12);

    if (!nickname) return { ok: false, error: '닉네임을 입력해 주세요.' };
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      return { ok: false, error: '방 코드는 6자리 영문+숫자입니다.' };
    }
    if (!/^\d{4}$/.test(password)) {
      return { ok: false, error: '비밀번호 숫자 4자리를 입력해 주세요.' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, error: '존재하지 않는 방 코드입니다. 방 코드를 다시 확인해 주세요!' };
    }
    if (room.state.password !== password) {
      return { ok: false, error: '방 비밀번호(숫자 4자리)가 일치하지 않습니다.' };
    }

    const existing = room.state.players.find((p) => p.id === params.playerId);
    if (existing) {
      existing.socketId = params.socketId;
      existing.connected = true;
      existing.nickname = nickname;
      this.socketToPlayer.set(params.socketId, { roomCode, playerId: params.playerId });
      this.onRoomUpdated(roomCode);
      return { ok: true, state: room.state };
    }

    if (room.state.status !== 'waiting') {
      return { ok: false, error: '이미 게임이 진행 중인 방입니다.' };
    }
    if (room.state.players.length >= 6) {
      return { ok: false, error: '방 정원(최대 6명)이 가득 찼습니다.' };
    }

    const usedAvatars = new Set(room.state.players.map((p) => p.avatarId));
    let avatarId = params.avatarId;
    if (!AVATAR_OPTIONS.some((a) => a.id === avatarId) || usedAvatars.has(avatarId)) {
      const available = AVATAR_OPTIONS.find((a) => !usedAvatars.has(a.id));
      avatarId = available ? available.id : AVATAR_OPTIONS[0].id;
    }

    room.state.players.push({
      id: params.playerId,
      socketId: params.socketId,
      nickname,
      avatarId,
      position: 0,
      isHost: false,
      connected: true,
    });

    const balance = getBalanceByPlayerCount(room.state.players.length);
    room.state.maxTurns = balance.maxTurns;
    room.state.targetKeys = balance.targetKeys;

    this.pushLog(room.state, `🙌 ${nickname}님이 모둠에 합류했습니다!`);
    this.socketToPlayer.set(params.socketId, { roomCode, playerId: params.playerId });
    this.onRoomUpdated(roomCode);
    return { ok: true, state: room.state };
  }

  public reconnectSession(params: {
    socketId: string;
    roomCode: string;
    playerId: string;
  }): { ok: true; state: RoomState } | { ok: false } {
    const code = params.roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return { ok: false };

    const player = room.state.players.find((p) => p.id === params.playerId);
    if (!player) return { ok: false };

    player.socketId = params.socketId;
    player.connected = true;
    this.socketToPlayer.set(params.socketId, { roomCode: code, playerId: player.id });
    this.onRoomUpdated(code);
    return { ok: true, state: room.state };
  }

  public leaveRoom(socketId: string): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    this.socketToPlayer.delete(socketId);

    const room = this.rooms.get(info.roomCode);
    if (!room) return;

    if (room.state.status === 'waiting') {
      room.state.players = room.state.players.filter((p) => p.id !== info.playerId);
      if (room.state.players.length === 0) {
        this.clearRoomTimers(room);
        this.rooms.delete(info.roomCode);
        this.onRoomUpdated(info.roomCode);
        return;
      }
      if (!room.state.players.some((p) => p.isHost)) {
        room.state.players[0].isHost = true;
      }
      const balance = getBalanceByPlayerCount(Math.max(2, room.state.players.length));
      room.state.maxTurns = balance.maxTurns;
      room.state.targetKeys = balance.targetKeys;
    } else {
      const player = room.state.players.find((p) => p.id === info.playerId);
      if (player) player.connected = false;
    }
    this.onRoomUpdated(info.roomCode);
  }

  public handleDisconnect(socketId: string): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    this.socketToPlayer.delete(socketId);

    const room = this.rooms.get(info.roomCode);
    if (!room) return;

    const player = room.state.players.find((p) => p.id === info.playerId);
    if (player && player.socketId === socketId) {
      player.connected = false;
      this.onRoomUpdated(info.roomCode);
    }
  }

  public updateAvatar(socketId: string, avatarId: string): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room || room.state.status !== 'waiting') return;
    if (!AVATAR_OPTIONS.some((a) => a.id === avatarId)) return;

    const player = room.state.players.find((p) => p.id === info.playerId);
    if (!player) return;
    player.avatarId = avatarId;
    this.onRoomUpdated(info.roomCode);
  }

  public startGame(socketId: string): { ok: true } | { ok: false; error: string } {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return { ok: false, error: '방 정보를 찾을 수 없습니다.' };
    const room = this.rooms.get(info.roomCode);
    if (!room) return { ok: false, error: '방이 존재하지 않습니다.' };

    const caller = room.state.players.find((p) => p.id === info.playerId);
    if (!caller?.isHost) return { ok: false, error: '방장만 게임을 시작할 수 있습니다.' };
    if (room.state.players.length < 2 || room.state.players.length > 6) {
      return { ok: false, error: '2명에서 6명 사이일 때 시작할 수 있습니다!' };
    }

    const balance = getBalanceByPlayerCount(room.state.players.length);
    room.state.status = 'playing';
    room.state.currentTurnIndex = 0;
    room.state.turnCount = 1;
    room.state.maxTurns = balance.maxTurns;
    room.state.keys = 0;
    room.state.targetKeys = balance.targetKeys;
    room.state.adjustTokens = GAME_SETTINGS.initialAdjustTokens;
    room.state.turnPhase = 'ready_to_roll';
    room.state.lastDiceValue = null;
    room.state.pendingRoll = null;
    room.state.activeMission = null;
    room.state.visitedBiblicalTiles = [];

    for (const p of room.state.players) {
      p.position = 0;
    }

    this.pushLog(
      room.state,
      `🚀 차원 탈출 시작! 목표 열쇠 ${balance.targetKeys}개를 모아 포탈을 여세요!`
    );
    this.onRoomUpdated(info.roomCode);
    return { ok: true };
  }

  private canActForCurrentTurn(state: RoomState, playerId: string): boolean {
    const currentPlayer = state.players[state.currentTurnIndex];
    if (!currentPlayer) return false;
    if (currentPlayer.id === playerId) return true;
    const caller = state.players.find((p) => p.id === playerId);
    return Boolean(!currentPlayer.connected && caller?.isHost);
  }

  public rollDice(socketId: string): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;

    if (state.status !== 'playing' || state.turnPhase !== 'ready_to_roll') return;
    if (!this.canActForCurrentTurn(state, info.playerId)) return;

    const currentPlayer = state.players[state.currentTurnIndex];
    const dice = Math.floor(Math.random() * 6) + 1;
    state.lastDiceValue = dice;

    const fromPos = currentPlayer.position;
    const exactTargetPos = (fromPos + dice) % BOARD_TILES.length;
    const minusSteps = Math.max(1, dice - 1);
    const plusSteps = dice + 1;
    const minusOnePos = (fromPos + minusSteps) % BOARD_TILES.length;
    const plusOnePos = (fromPos + plusSteps) % BOARD_TILES.length;

    if (state.adjustTokens > 0) {
      state.turnPhase = 'adjust_choice';
      state.pendingRoll = {
        playerId: currentPlayer.id,
        baseDice: dice,
        fromPos,
        exactTargetPos,
        minusOnePos,
        plusOnePos,
      };
      this.pushLog(state, `🎲 ${currentPlayer.nickname}님이 주사위 [${dice}]을 굴렸습니다!`);
      this.onRoomUpdated(info.roomCode);
    } else {
      this.pushLog(state, `🎲 ${currentPlayer.nickname}님 주사위 [${dice}] 이동!`);
      this.executeMove(room, currentPlayer, dice);
    }
  }

  public confirmRollChoice(socketId: string, choice: 'minus' | 'exact' | 'plus'): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;

    if (state.status !== 'playing' || state.turnPhase !== 'adjust_choice' || !state.pendingRoll) {
      return;
    }
    if (!this.canActForCurrentTurn(state, info.playerId)) return;

    const currentPlayer = state.players[state.currentTurnIndex];
    const base = state.pendingRoll.baseDice;
    let steps = base;

    if (choice === 'minus' && state.adjustTokens > 0 && base > 1) {
      steps = base - 1;
      state.adjustTokens -= 1;
      this.pushLog(state, `✨ ±1 조절권 사용! (${base} → ${steps}칸 이동)`);
    } else if (choice === 'plus' && state.adjustTokens > 0) {
      steps = base + 1;
      state.adjustTokens -= 1;
      this.pushLog(state, `✨ ±1 조절권 사용! (${base} → ${steps}칸 이동)`);
    }

    state.pendingRoll = null;
    this.executeMove(room, currentPlayer, steps);
  }

  private executeMove(room: InternalRoom, player: PlayerState, steps: number): void {
    const { state } = room;
    const oldPos = player.position;
    const rawNew = oldPos + steps;
    const newPos = rawNew % BOARD_TILES.length;
    const passedPortal = rawNew >= BOARD_TILES.length;

    player.position = newPos;
    state.turnPhase = 'moving';

    if (passedPortal) {
      state.keys += 1;
      this.pushLog(state, `🌀 한 바퀴 완주! 차원 포탈 보너스 열쇠 🔑 +1 획득!`);
    }

    this.onRoomUpdated(state.roomCode);

    // 짧은 말 이동 애니메이션(650ms) 후 도착 칸 이벤트 오픈!
    this.addTimer(
      room,
      () => {
        if (state.status !== 'playing') return;
        if (state.keys >= state.targetKeys) {
          this.markRoomCleared(room);
          return;
        }
        this.openTileMission(room, player, newPos);
      },
      680
    );
  }

  private markRoomCleared(room: InternalRoom): void {
    this.clearRoomTimers(room);
    room.state.status = 'cleared';
    room.state.activeMission = null;
    room.state.pendingRoll = null;
    room.state.clearedAt = Date.now();
    this.pushLog(room.state, `🎉 차원 포탈 개방 완료! 우리 모둠 전원 탈출 성공!`);
    this.onRoomUpdated(room.state.roomCode);
  }

  private spawnTargets(tileIndex: number, count: number): SpawnedTarget[] {
    const snackEmojis = ['🥐', '🧃', '🍕', '🍩', '🍦', '🥨'];
    const arcadeEmojis = ['👾', '🎯', '⭐', '💎', '🛸', '⚡'];
    const palette = tileIndex === 7 ? snackEmojis : arcadeEmojis;
    const list: SpawnedTarget[] = [];

    for (let i = 0; i < count; i++) {
      list.push({
        id: `t-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        emoji: palette[i % palette.length],
        x: 14 + Math.floor(Math.random() * 72),
        y: 18 + Math.floor(Math.random() * 64),
      });
    }
    return list;
  }

  private openTileMission(room: InternalRoom, protagonist: PlayerState, tileIndex: number): void {
    const { state } = room;
    const tile = BOARD_TILES[tileIndex];
    const activeCount = Math.max(1, this.getActivePlayers(state).length);
    const missionId = `m-${Date.now()}-${tileIndex}`;

    if (tile.category === 'biblical' && !state.visitedBiblicalTiles.includes(tileIndex)) {
      state.visitedBiblicalTiles.push(tileIndex);
    }

    state.turnPhase = 'mission';

    // 00 차원 포탈 도착 시 (이미 완주 보너스 +1을 받았으므로 축하 안내 카드 표시)
    if (tile.eventType === 'portal') {
      state.activeMission = {
        id: missionId,
        kind: 'lucky_chest',
        tileIndex,
        tileName: tile.name,
        tileEmoji: tile.emoji,
        isBiblical: false,
        protagonistId: protagonist.id,
        protagonistName: protagonist.nickname,
        stage: 'result',
        progress: 1,
        targetProgress: 1,
        contributions: {},
        votes: {},
        result: {
          success: true,
          keysEarned: 0,
          headline: '🌀 차원 포탈 정중앙 도착! 숨 고르기 보너스!',
          detail: '완주 보너스 열쇠(+1)에 더해 팀 주사위 ±1 조절권이 1개 충전되었습니다!',
        },
      };
      state.adjustTokens += 1;
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 11 럭키 찬스 상자
    if (tile.eventType === 'lucky_chest') {
      state.keys += 1;
      state.adjustTokens += 1;
      this.pushLog(state, `🎁 럭키 찬스 상자! 열쇠 🔑 +1 & ±1 조절권 +1 획득!`);
      if (state.keys >= state.targetKeys) {
        this.markRoomCleared(room);
        return;
      }
      state.activeMission = {
        id: missionId,
        kind: 'lucky_chest',
        tileIndex,
        tileName: tile.name,
        tileEmoji: tile.emoji,
        isBiblical: false,
        protagonistId: protagonist.id,
        protagonistName: protagonist.nickname,
        stage: 'result',
        progress: 1,
        targetProgress: 1,
        contributions: {},
        votes: {},
        introStory: tile.introStory,
        result: {
          success: true,
          keysEarned: 1,
          headline: '🎁 대박 행운! 열쇠 +1 & 주사위 ±1 조절권 충전!',
          detail: '새로 얻은 ±1 조절권으로 열쇠 2개가 걸린 🌟 황금 성경 명소를 노려보세요!',
        },
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 06 지하철 급행역
    if (tile.eventType === 'subway_jump') {
      state.activeMission = {
        id: missionId,
        kind: 'subway_jump',
        tileIndex,
        tileName: tile.name,
        tileEmoji: tile.emoji,
        isBiblical: false,
        protagonistId: protagonist.id,
        protagonistName: protagonist.nickname,
        stage: 'action',
        progress: 0,
        targetProgress: 1,
        contributions: {},
        votes: {},
        introStory: tile.introStory,
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 주인공 취향 맞히기
    if (tile.eventType === 'guess_protagonist') {
      const pool = GUESS_PROTAGONIST_QUESTIONS[tileIndex] ?? GUESS_PROTAGONIST_QUESTIONS[2];
      const question = this.pickQuestion(room, pool);
      state.activeMission = {
        id: missionId,
        kind: 'guess_protagonist',
        tileIndex,
        tileName: tile.name,
        tileEmoji: tile.emoji,
        isBiblical: false,
        protagonistId: protagonist.id,
        protagonistName: protagonist.nickname,
        stage: 'quiz',
        progress: 0,
        targetProgress: activeCount,
        contributions: {},
        votes: {},
        question,
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 이심전심 텔레파시
    if (tile.eventType === 'telepathy') {
      const pool = TELEPATHY_QUESTIONS[tileIndex] ?? TELEPATHY_QUESTIONS[5];
      const question = this.pickQuestion(room, pool);
      state.activeMission = {
        id: missionId,
        kind: 'telepathy',
        tileIndex,
        tileName: tile.name,
        tileEmoji: tile.emoji,
        isBiblical: false,
        protagonistId: protagonist.id,
        protagonistName: protagonist.nickname,
        stage: 'quiz',
        progress: 0,
        targetProgress: activeCount,
        contributions: {},
        votes: {},
        question,
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 성경 공감 토크 (03 에덴동산, 18 베들레헴)
    if (tile.eventType === 'empathy_talk') {
      const pool = BIBLICAL_EMPATHY_QUESTIONS[tileIndex] ?? BIBLICAL_EMPATHY_QUESTIONS[3];
      const question = this.pickQuestion(room, pool);
      state.activeMission = {
        id: missionId,
        kind: 'empathy_talk',
        tileIndex,
        tileName: tile.name,
        tileEmoji: tile.emoji,
        isBiblical: true,
        protagonistId: protagonist.id,
        protagonistName: protagonist.nickname,
        stage: 'quiz',
        progress: 0,
        targetProgress: activeCount,
        contributions: {},
        votes: {},
        question,
        introStory: tile.introStory,
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 액션 미니게임 공통 (PC방 tap_rush, 코노/야구장 timing_sync, 매점/오락실 target_catch, 홍해 red_sea_combo, 여리고 jericho_combo)
    let kind: ActiveMissionState['kind'] = 'tap_rush';
    let durationMs = 3500;
    let targetProgress = activeCount * 12;

    if (tile.eventType === 'tap_rush') {
      kind = 'tap_rush';
      durationMs = 3500; // 체감 3초 광클!
      targetProgress = Math.max(18, activeCount * 12);
    } else if (tile.eventType === 'timing_sync') {
      kind = 'timing_sync';
      durationMs = 5500;
      targetProgress = Math.max(40, activeCount * 32);
    } else if (tile.eventType === 'target_catch') {
      kind = 'target_catch';
      durationMs = 4500;
      targetProgress = Math.max(6, activeCount * 4);
    } else if (tile.eventType === 'red_sea_combo') {
      kind = 'red_sea_combo';
      durationMs = 5500;
      targetProgress = Math.max(16, activeCount * 11);
    } else if (tile.eventType === 'jericho_combo') {
      kind = 'jericho_combo';
      durationMs = 5000;
      targetProgress = Math.max(22, activeCount * 14);
    }

    state.activeMission = {
      id: missionId,
      kind,
      tileIndex,
      tileName: tile.name,
      tileEmoji: tile.emoji,
      isBiblical: tile.category === 'biblical',
      protagonistId: protagonist.id,
      protagonistName: protagonist.nickname,
      stage: 'countdown',
      durationMs,
      progress: 0,
      targetProgress,
      contributions: {},
      votes: {},
      timingGrades: {},
      targets: kind === 'target_catch' ? this.spawnTargets(tileIndex, 5) : undefined,
      introStory: tile.introStory,
    };
    this.onRoomUpdated(state.roomCode);

    this.startActionCountdown(room, missionId, durationMs);
  }

  private startActionCountdown(room: InternalRoom, missionId: string, durationMs: number): void {
    const { state } = room;
    // 1.9초 준비 카운트다운 후 본 미니게임 시작
    this.addTimer(
      room,
      () => {
        const m = state.activeMission;
        if (!m || m.id !== missionId || m.stage !== 'countdown') return;
        m.stage = 'action';
        m.endsAt = Date.now() + durationMs;
        this.onRoomUpdated(state.roomCode);

        this.addTimer(
          room,
          () => {
            const current = state.activeMission;
            if (!current || current.id !== missionId || current.stage !== 'action') return;
            this.finishActionStage(room, current);
          },
          durationMs + 120
        );
      },
      1900
    );
  }

  public selectSubwayDestination(socketId: string, destinationIndex: number): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;

    const m = state.activeMission;
    if (!m || m.kind !== 'subway_jump' || m.stage !== 'action') return;
    if (!this.canActForCurrentTurn(state, info.playerId)) return;
    if (destinationIndex < 0 || destinationIndex >= BOARD_TILES.length || destinationIndex === 6) {
      return;
    }

    const currentPlayer = state.players[state.currentTurnIndex];
    currentPlayer.position = destinationIndex;
    const destTile = BOARD_TILES[destinationIndex];
    this.pushLog(
      state,
      `🚇 ${currentPlayer.nickname}님이 지하철 급행으로 [${destTile.name}]에 도착!`
    );
    this.openTileMission(room, currentPlayer, destinationIndex);
  }

  public handleMissionAction(
    socketId: string,
    payload: { type: 'tap' | 'swipe' | 'timing' | 'target'; value?: number; targetId?: string }
  ): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;
    const m = state.activeMission;
    if (!m || m.stage !== 'action') return;

    const pid = info.playerId;

    if (
      payload.type === 'tap' &&
      (m.kind === 'tap_rush' || m.kind === 'jericho_combo' || m.kind === 'finale_rush')
    ) {
      m.progress += 1;
      m.contributions[pid] = (m.contributions[pid] ?? 0) + 1;
      if (m.progress >= m.targetProgress) {
        this.finishActionStage(room, m);
      } else {
        this.onRoomUpdated(state.roomCode);
      }
      return;
    }

    if (payload.type === 'swipe' && m.kind === 'red_sea_combo') {
      m.progress += 1;
      m.contributions[pid] = (m.contributions[pid] ?? 0) + 1;
      if (m.progress >= m.targetProgress) {
        this.finishActionStage(room, m);
      } else {
        this.onRoomUpdated(state.roomCode);
      }
      return;
    }

    if (payload.type === 'timing' && m.kind === 'timing_sync') {
      const accuracy = typeof payload.value === 'number' ? payload.value : 50; // 0..100, 50 is exact center
      const dist = Math.abs(accuracy - 50);
      let points = 10;
      let grade: 'PERFECT' | 'GOOD' | 'MISS' = 'MISS';
      if (dist <= 12) {
        points = 22;
        grade = 'PERFECT';
      } else if (dist <= 24) {
        points = 14;
        grade = 'GOOD';
      }
      m.progress += points;
      m.contributions[pid] = (m.contributions[pid] ?? 0) + points;
      if (m.timingGrades) m.timingGrades[pid] = grade;

      if (m.progress >= m.targetProgress) {
        this.finishActionStage(room, m);
      } else {
        this.onRoomUpdated(state.roomCode);
      }
      return;
    }

    if (payload.type === 'target' && m.kind === 'target_catch' && m.targets && payload.targetId) {
      const targetIdx = m.targets.findIndex((t) => t.id === payload.targetId);
      if (targetIdx === -1) return;
      m.targets.splice(targetIdx, 1);
      m.progress += 1;
      m.contributions[pid] = (m.contributions[pid] ?? 0) + 1;

      if (m.progress >= m.targetProgress) {
        this.finishActionStage(room, m);
      } else {
        const replacement = this.spawnTargets(m.tileIndex, 1)[0];
        m.targets.push(replacement);
        this.onRoomUpdated(state.roomCode);
      }
    }
  }

  private finishActionStage(room: InternalRoom, m: ActiveMissionState): void {
    const { state } = room;
    const succeeded = m.progress >= m.targetProgress;

    // 홍해 / 여리고는 1단계 미니게임 직후 2단계 초간단 상식·오해풀기 퀴즈로 이어짐!
    if (m.kind === 'red_sea_combo' || m.kind === 'jericho_combo') {
      m.stage1Success = succeeded;
      m.stage = 'quiz';
      m.votes = {};
      const pool = BIBLICAL_STAGE2_QUIZZES[m.tileIndex] ?? BIBLICAL_STAGE2_QUIZZES[8];
      m.question = this.pickQuestion(room, pool);
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 피날레 역전 미션은 모둠이 힘을 모은 것만으로 무조건 부족한 열쇠를 모두 채워 해피엔딩 보장!
    if (m.kind === 'finale_rush') {
      const needed = Math.max(1, state.targetKeys - state.keys);
      state.keys += needed;
      m.stage = 'result';
      m.result = {
        success: true,
        keysEarned: needed,
        headline: '⚡ 차원 포탈 비상 에너지 충전 100% 성공!',
        detail: `모둠원 전원의 합동 연타로 마지막 열쇠 ${needed}개를 단숨에 획득했습니다! 이제 포탈이 열립니다!`,
      };
      this.pushLog(state, `⚡ 피날레 합동 미션 대성공! 열쇠 🔑 +${needed} 획득!`);
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 일반 미니게임 결과
    const keysEarned = succeeded ? 1 : 0;
    if (keysEarned > 0) {
      state.keys += keysEarned;
      this.pushLog(state, `🔥 [${m.tileName}] 협동 미니게임 성공! 열쇠 🔑 +${keysEarned} 획득!`);
    } else {
      this.pushLog(state, `💦 [${m.tileName}] 아깝게 실패! 다음 턴에 만회해요!`);
    }

    m.stage = 'result';
    m.result = {
      success: succeeded,
      keysEarned,
      headline: succeeded
        ? `🎉 [${m.tileName}] 협동 대성공! 열쇠 +1 획득!`
        : `😅 조금만 더 빨랐다면! 아깝게 목표치에 살짝 못 미쳤어요`,
      detail: succeeded
        ? '우리 모둠 호흡 진짜 환상적이에요!'
        : `달성 기록: ${m.progress} / ${m.targetProgress} — 괜찮아요, 황금 명소에서 한 방에 2개 따면 됩니다!`,
    };
    this.onRoomUpdated(state.roomCode);
  }

  public submitVote(socketId: string, optionIndex: number, forceFinalize = false): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;
    const m = state.activeMission;
    if (!m || m.stage !== 'quiz' || !m.question) return;

    if (optionIndex >= 0 && optionIndex < m.question.options.length) {
      m.votes[info.playerId] = optionIndex;
    }

    const activePlayers = this.getActivePlayers(state);
    const allVoted = activePlayers.every((p) => typeof m.votes[p.id] === 'number');
    const caller = state.players.find((p) => p.id === info.playerId);
    const canForce = forceFinalize && Boolean(caller?.isHost) && Object.keys(m.votes).length > 0;

    if (!allVoted && !canForce) {
      this.onRoomUpdated(state.roomCode);
      return;
    }

    this.evaluateQuizOrVote(room, m);
  }

  private evaluateQuizOrVote(room: InternalRoom, m: ActiveMissionState): void {
    const { state } = room;
    const q = m.question!;

    // 1) 에덴동산 · 베들레헴: 정답 없는 공감 토크 → talk_share 단계로 전환해 서로 선택 공유!
    if (m.kind === 'empathy_talk') {
      m.stage = 'talk_share';
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 2) 주인공 취향 맞히기
    if (m.kind === 'guess_protagonist') {
      const protagonistChoice = m.votes[m.protagonistId] ?? 0;
      const guessEntries = Object.entries(m.votes).filter(([pid]) => pid !== m.protagonistId);
      const matched = guessEntries.filter(([, choice]) => choice === protagonistChoice).length;
      const needed = guessEntries.length === 0 ? 0 : Math.ceil(guessEntries.length / 2);
      const success = matched >= needed;

      if (success) {
        state.keys += 1;
        this.pushLog(state, `🎯 ${m.protagonistName}님 취향 적중! 열쇠 🔑 +1 획득!`);
      } else {
        this.pushLog(state, `🤭 ${m.protagonistName}님의 의외의 취향 발견!`);
      }

      m.stage = 'result';
      m.result = {
        success,
        keysEarned: success ? 1 : 0,
        winningOptionIndex: protagonistChoice,
        headline: success
          ? `🎯 적중 대성공! (${matched}/${guessEntries.length}명 맞힘) 열쇠 +1!`
          : `🤭 반전 취향! (${matched}/${guessEntries.length}명 적중)`,
        detail: `${m.protagonistName}님의 진짜 선택은 「${q.options[protagonistChoice]}」였습니다! 왜 골랐는지 한마디 들어볼까요?`,
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 3) 이심전심 텔레파시
    if (m.kind === 'telepathy') {
      const counts = new Map<number, number>();
      let topIdx = 0;
      let topCount = 0;
      for (const choice of Object.values(m.votes)) {
        const next = (counts.get(choice) ?? 0) + 1;
        counts.set(choice, next);
        if (next > topCount) {
          topCount = next;
          topIdx = choice;
        }
      }
      const voterCount = Math.max(1, Object.keys(m.votes).length);
      const needed = voterCount <= 2 ? voterCount : Math.ceil(voterCount / 2);
      const success = topCount >= needed;

      if (success) {
        state.keys += 1;
        this.pushLog(state, `⚡ [${m.tileName}] 이심전심 통했다! 열쇠 🔑 +1 획득!`);
      } else {
        this.pushLog(state, `😂 [${m.tileName}] 각자 개성 폭발! 마음이 사방으로 갈렸어요!`);
      }

      m.stage = 'result';
      m.result = {
        success,
        keysEarned: success ? 1 : 0,
        winningOptionIndex: topIdx,
        headline: success
          ? `⚡ 텔레파시 성공! ${topCount}명이 같은 곳으로 통했어요! (열쇠 +1)`
          : `😂 취향 존중! 표가 골고루 갈렸네요 (최다 ${topCount}표)`,
        detail: `가장 많이 모인 선택: 「${q.options[topIdx]}」`,
      };
      this.onRoomUpdated(state.roomCode);
      return;
    }

    // 4) 홍해 · 여리고 2단계 초간단 상식·오해풀기 퀴즈 (다수결)
    if (m.kind === 'red_sea_combo' || m.kind === 'jericho_combo') {
      const correctIdx = q.correctIndex ?? 0;
      const totalVotes = Object.values(m.votes);
      const correctVotes = totalVotes.filter((v) => v === correctIdx).length;
      const quizSuccess = correctVotes >= Math.ceil(Math.max(1, totalVotes.length) / 2);

      // 1단계 미니게임 + 2단계 퀴즈로 최대 2개, 황금 명소 방문 격려로 최소 1개 보장!
      const keysEarned = m.stage1Success && quizSuccess ? 2 : m.stage1Success || quizSuccess ? 2 : 1;
      state.keys += keysEarned;
      this.pushLog(
        state,
        `🌟 황금 명소 [${m.tileName}] 클리어! 열쇠 🔑 +${keysEarned} 획득!`
      );

      m.stage = 'result';
      m.result = {
        success: true,
        keysEarned,
        winningOptionIndex: correctIdx,
        headline:
          keysEarned === 2
            ? `🌟 퍼펙트 클리어! 황금 열쇠 +2개 획득!`
            : `🌟 [${m.tileName}] 탐험 완료! 열쇠 +1개 획득!`,
        detail: q.explanation ?? `정답은 「${q.options[correctIdx]}」입니다!`,
      };
      this.onRoomUpdated(state.roomCode);
    }
  }

  public completeEmpathyTalk(socketId: string): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;
    const m = state.activeMission;
    if (!m || m.kind !== 'empathy_talk' || m.stage !== 'talk_share') return;

    state.keys += 2;
    this.pushLog(state, `🌟 [${m.tileName}] 따뜻한 공감 대화 완료! 황금 열쇠 🔑 +2 획득!`);

    m.stage = 'result';
    m.result = {
      success: true,
      keysEarned: 2,
      headline: `🌟 [${m.tileName}] 공감 토크 완료! 황금 열쇠 +2개!`,
      detail: m.question?.explanation ?? '서로의 이야기를 따뜻하게 들어준 우리 모둠 최고예요!',
    };
    this.onRoomUpdated(state.roomCode);
  }

  public closeMissionAndAdvance(socketId: string): void {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return;
    const room = this.rooms.get(info.roomCode);
    if (!room) return;
    const { state } = room;
    const m = state.activeMission;
    if (!m || m.stage !== 'result') return;

    // 탈출 열쇠 목표 달성 체크!
    if (state.keys >= state.targetKeys) {
      this.markRoomCleared(room);
      return;
    }

    // 정규 턴을 모두 소진했는데 열쇠가 부족하면 '피날레 보너스 협동 미션' 발동!
    if (state.turnCount >= state.maxTurns) {
      const activeCount = Math.max(1, this.getActivePlayers(state).length);
      const missionId = `finale-${Date.now()}`;
      const durationMs = 5500;
      state.activeMission = {
        id: missionId,
        kind: 'finale_rush',
        tileIndex: 0,
        tileName: '차원 포탈 비상 개방!',
        tileEmoji: '⚡',
        isBiblical: false,
        protagonistId: state.players[0].id,
        protagonistName: '우리 모둠 전원',
        stage: 'countdown',
        durationMs,
        progress: 0,
        targetProgress: Math.max(16, activeCount * 12),
        contributions: {},
        votes: {},
        introStory: `열쇠가 ${state.targetKeys - state.keys}개 남았어요! 포기란 없다 — 5초 동안 모둠원 전원이 함께 연타해 포탈을 강제 개방하세요!`,
      };
      this.onRoomUpdated(state.roomCode);
      this.startActionCountdown(room, missionId, durationMs);
      return;
    }

    // 다음 턴 플레이어로 진행
    state.activeMission = null;
    state.currentTurnIndex = (state.currentTurnIndex + 1) % state.players.length;
    state.turnCount += 1;
    state.turnPhase = 'ready_to_roll';
    state.lastDiceValue = null;
    this.onRoomUpdated(state.roomCode);
  }
}

