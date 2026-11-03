import React, { useEffect, useState } from 'react';
import { AVATAR_OPTIONS, BOARD_TILES } from '../../shared/gameConfig';
import type { RoomState } from '../../shared/types';
import { sfx } from '../sound';
import { MissionModal } from './MissionModal';

const PORTRAIT_COORDS: Array<[number, number]> = [
  [5, 7], // 00
  [4, 7], // 01
  [3, 7], // 02
  [2, 7], // 03 ★에덴동산
  [1, 7], // 04
  [1, 6], // 05
  [1, 5], // 06
  [1, 4], // 07
  [1, 3], // 08 ★홍해
  [1, 2], // 09
  [1, 1], // 10
  [2, 1], // 11
  [3, 1], // 12
  [4, 1], // 13 ★여리고
  [5, 1], // 14
  [5, 2], // 15
  [5, 3], // 16
  [5, 4], // 17
  [5, 5], // 18 ★베들레헴
  [5, 6], // 19
];

const LANDSCAPE_COORDS: Array<[number, number]> = [
  [7, 5], // 00
  [6, 5], // 01
  [5, 5], // 02
  [4, 5], // 03 ★에덴동산
  [3, 5], // 04
  [2, 5], // 05
  [1, 5], // 06
  [1, 4], // 07
  [1, 3], // 08 ★홍해
  [1, 2], // 09
  [1, 1], // 10
  [2, 1], // 11
  [3, 1], // 12
  [4, 1], // 13 ★여리고
  [5, 1], // 14
  [6, 1], // 15
  [7, 1], // 16
  [7, 2], // 17
  [7, 3], // 18 ★베들레헴
  [7, 4], // 19
];

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface GameBoardProps {
  room: RoomState;
  myPlayerId: string;
  isSpectator?: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onRollDice: () => void;
  onConfirmRoll: (choice: 'minus' | 'exact' | 'plus') => void;
  onSubwaySelect: (destIndex: number) => void;
  onMissionAction: (payload: {
    type: 'tap' | 'swipe' | 'timing' | 'target';
    value?: number;
    targetId?: string;
  }) => void;
  onMissionVote: (optionIndex: number, forceFinalize?: boolean) => void;
  onCompleteTalk: () => void;
  onNextTurn: () => void;
  onExit: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  myPlayerId,
  isSpectator = false,
  soundOn,
  onToggleSound,
  onRollDice,
  onConfirmRoll,
  onSubwaySelect,
  onMissionAction,
  onMissionVote,
  onCompleteTalk,
  onNextTurn,
  onExit,
}) => {
  const [isWide, setIsWide] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 860 || (window.innerWidth > window.innerHeight && window.innerWidth >= 560);
  });

  useEffect(() => {
    const updateLayout = () => {
      setIsWide(
        window.innerWidth >= 860 || (window.innerWidth > window.innerHeight && window.innerWidth >= 560)
      );
    };
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  const currentPlayer = room.players[room.currentTurnIndex] ?? room.players[0];
  const me = room.players.find((p) => p.id === myPlayerId);
  const isMyTurn = !isSpectator && currentPlayer?.id === myPlayerId;
  const canActForOfflineTurn =
    !isSpectator && Boolean(me?.isHost && currentPlayer && !currentPlayer.connected);
  const canControlTurn = isMyTurn || canActForOfflineTurn;

  // 노트북/태블릿 키보드 스페이스바로 주사위 굴리기 지원
  useEffect(() => {
    if (!canControlTurn || room.turnPhase !== 'ready_to_roll') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        sfx.playDice();
        onRollDice();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canControlTurn, room.turnPhase, onRollDice]);

  const coords = isWide ? LANDSCAPE_COORDS : PORTRAIT_COORDS;
  const keyProgressPct = Math.min(100, Math.round((room.keys / Math.max(1, room.targetKeys)) * 100));

  const pending = room.pendingRoll;
  const exactTile = pending ? BOARD_TILES[pending.exactTargetPos] : null;
  const minusTile = pending && pending.baseDice > 1 ? BOARD_TILES[pending.minusOnePos] : null;
  const plusTile = pending ? BOARD_TILES[pending.plusOnePos] : null;

  const renderTurnActionControls = () => {
    if (isSpectator) {
      return (
        <div className="turn-control-card spectator-box">
          <span className="spectate-pill">👀 실시간 관전 모드</span>
          <p className="turn-subtext">
            현재 <strong>{currentPlayer?.nickname}</strong>님의 턴 ({room.turnCount}/{room.maxTurns}턴)
          </p>
        </div>
      );
    }

    if (room.turnPhase === 'ready_to_roll') {
      return (
        <div className="turn-control-card">
          <div className="turn-who-row">
            <span className="turn-badge">TURN {room.turnCount}/{room.maxTurns}</span>
            <span className="turn-who-text">
              {isMyTurn ? '🔥 내 차례예요!' : `🎲 ${currentPlayer?.nickname}님 차례`}
            </span>
          </div>
          {canControlTurn ? (
            <button
              type="button"
              className="roll-dice-btn pulse-cta"
              onClick={() => {
                sfx.playDice();
                onRollDice();
              }}
            >
              🎲 주사위 굴리기! {canActForOfflineTurn ? '(오프라인 대리)' : ''}
            </button>
          ) : (
            <div className="waiting-roll-pill">
              <strong>{currentPlayer?.nickname}</strong>님이 주사위를 굴리는 중...
            </div>
          )}
        </div>
      );
    }

    if (room.turnPhase === 'adjust_choice' && pending) {
      return (
        <div className="turn-control-card adjust-panel">
          <div className="dice-rolled-header">
            <span className="big-dice-icon" aria-hidden="true">
              {DICE_FACES[pending.baseDice] ?? '🎲'}
            </span>
            <div>
              <strong>주사위 [{pending.baseDice}] 나왔어요!</strong>
              <span className="adjust-sub">남은 팀 ±1 조절권: ✨ {room.adjustTokens}개</span>
            </div>
          </div>

          {canControlTurn ? (
            <div className="adjust-btn-stack">
              <button
                type="button"
                className={`adjust-choice-btn exact ${exactTile?.category === 'biblical' ? 'golden-opt' : ''}`}
                onClick={() => {
                  sfx.playTap();
                  onConfirmRoll('exact');
                }}
              >
                <span>그대로 {pending.baseDice}칸 이동</span>
                <strong>
                  {exactTile?.emoji} {exactTile?.shortName}
                </strong>
              </button>

              <div className="adjust-split-row">
                {minusTile && (
                  <button
                    type="button"
                    className={`adjust-choice-btn mod ${minusTile.category === 'biblical' ? 'golden-opt' : ''}`}
                    onClick={() => {
                      sfx.playKeyEarned(minusTile.category === 'biblical');
                      onConfirmRoll('minus');
                    }}
                  >
                    <span>✨ -1칸 ({pending.baseDice - 1}칸)</span>
                    <strong>
                      {minusTile.emoji} {minusTile.shortName}
                    </strong>
                  </button>
                )}

                {plusTile && (
                  <button
                    type="button"
                    className={`adjust-choice-btn mod ${plusTile.category === 'biblical' ? 'golden-opt' : ''}`}
                    onClick={() => {
                      sfx.playKeyEarned(plusTile.category === 'biblical');
                      onConfirmRoll('plus');
                    }}
                  >
                    <span>✨ +1칸 ({pending.baseDice + 1}칸)</span>
                    <strong>
                      {plusTile.emoji} {plusTile.shortName}
                    </strong>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="waiting-roll-pill">
              <strong>{currentPlayer?.nickname}</strong>님이 ±1 조절권 사용 여부를 고르고 있어요!
              {(minusTile?.category === 'biblical' || plusTile?.category === 'biblical') && (
                <span className="cheer-hint"> 🌟 황금 명소 찬스! 옆에서 알려주세요!</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="turn-control-card">
        <div className="waiting-roll-pill">
          {room.turnPhase === 'moving' ? '🏃 아바타 이동 중...' : '🎯 모둠 협동 미션 진행 중!'}
        </div>
      </div>
    );
  };

  return (
    <div className={`gameboard-viewport ${isWide ? 'mode-landscape' : 'mode-portrait'}`}>
      {/* 상단 컴팩트 바 (세로 모드 전용 헤더, 가로 모드는 우측 패널에 통합 표시) */}
      {!isWide && (
        <header className="portrait-topbar">
          <div className="pt-left">
            <button type="button" className="mini-icon-btn" onClick={onExit} title="나가기">
              {isSpectator ? '⬅ 관전종료' : '🏠'}
            </button>
            <span className="room-chip">{room.roomCode}</span>
            {isSpectator && <span className="spectate-pill">👀 관전</span>}
          </div>
          <div className="pt-keys">
            <span>🔑 {room.keys} / {room.targetKeys}</span>
            <span className="divider-dot">·</span>
            <span>✨±1권 {room.adjustTokens}</span>
          </div>
          <button type="button" className="mini-icon-btn" onClick={onToggleSound}>
            {soundOn ? '🔊' : '🔇'}
          </button>
        </header>
      )}

      <main className="board-stage">
        <div className={`board-grid ${isWide ? 'grid-7x5' : 'grid-5x7'}`}>
          {BOARD_TILES.map((tile) => {
            const [col, row] = coords[tile.index];
            const occupants = room.players.filter((p) => p.position === tile.index);
            const isExactTarget = pending?.exactTargetPos === tile.index;
            const isModTarget =
              (pending && pending.baseDice > 1 && pending.minusOnePos === tile.index) ||
              pending?.plusOnePos === tile.index;
            const isVisitedBiblical = room.visitedBiblicalTiles.includes(tile.index);

            return (
              <div
                key={tile.index}
                className={[
                  'board-tile',
                  `cat-${tile.category}`,
                  isExactTarget ? 'highlight-exact' : '',
                  isModTarget ? 'highlight-mod' : '',
                  occupants.length > 0 ? 'has-players' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  {
                    gridColumn: col,
                    gridRow: row,
                    '--tile-color': tile.themeColor,
                  } as React.CSSProperties
                }
              >
                <div className="tile-top-row">
                  <span className="tile-idx">{String(tile.index).padStart(2, '0')}</span>
                  {tile.category === 'biblical' && (
                    <span className="golden-key-tag">{isVisitedBiblical ? '🌟+2' : '🔑×2'}</span>
                  )}
                </div>

                <div className="tile-emoji" aria-hidden="true">
                  {tile.emoji}
                </div>
                <div className="tile-name">{tile.shortName}</div>

                {occupants.length > 0 && (
                  <div className="tile-tokens" aria-label="위치한 플레이어">
                    {occupants.map((occ) => {
                      const av = AVATAR_OPTIONS.find((a) => a.id === occ.avatarId) ?? AVATAR_OPTIONS[0];
                      const isTurnOwner = occ.id === currentPlayer?.id;
                      return (
                        <span
                          key={occ.id}
                          className={`player-token ${isTurnOwner ? 'active-token' : ''}`}
                          style={{ '--av-color': av.color } as React.CSSProperties}
                          title={occ.nickname}
                        >
                          {av.emoji}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 보드 중앙 영역 */}
          <div className="board-center-hub">
            {!isWide ? (
              /* 세로 모드(스마트폰 Portrait): 중앙에 열쇠 게이지 + 턴 컨트롤 + 모둠원 미니 바 배치 */
              <div className="portrait-center-inner">
                <div className="key-gauge-box">
                  <div className="key-gauge-labels">
                    <strong>🔑 탈출 열쇠 {room.keys} / {room.targetKeys}</strong>
                    <span>남은 턴 {Math.max(0, room.maxTurns - room.turnCount + 1)}회</span>
                  </div>
                  <div className="key-progress-track">
                    <div className="key-progress-fill" style={{ width: `${keyProgressPct}%` }} />
                  </div>
                </div>

                {renderTurnActionControls()}

                <div className="mini-roster">
                  {room.players.map((p, idx) => {
                    const av = AVATAR_OPTIONS.find((a) => a.id === p.avatarId) ?? AVATAR_OPTIONS[0];
                    const active = idx === room.currentTurnIndex;
                    return (
                      <div
                        key={p.id}
                        className={`roster-chip ${active ? 'active' : ''} ${!p.connected ? 'offline' : ''}`}
                      >
                        <span>{av.emoji}</span>
                        <span className="rc-name">{p.nickname}</span>
                      </div>
                    );
                  })}
                </div>

                {room.logs[0] && <div className="latest-log-pill">{room.logs[0].text}</div>}
              </div>
            ) : (
              /* 가로 모드(태블릿·노트북·가로폰): 와이드 보드 중앙에 현장 중계 스테이지 연출 */
              <div className="landscape-center-stage">
                <div className="portal-emblem">
                  <span className="emblem-spin" aria-hidden="true">
                    🌀
                  </span>
                  <div>
                    <div className="stage-eyebrow">CO-OP ESCAPE BOARD</div>
                    <h2 className="stage-headline">
                      목표 열쇠 <strong>{room.targetKeys}개</strong>를 모아 차원 포탈을 여세요!
                    </h2>
                  </div>
                </div>

                <div className="landscape-key-bar-wrap">
                  <div className="key-progress-track large">
                    <div className="key-progress-fill" style={{ width: `${keyProgressPct}%` }} />
                  </div>
                  <span className="key-count-badge">
                    🔑 {room.keys} / {room.targetKeys} ({keyProgressPct}%)
                  </span>
                </div>

                {room.logs[0] && <div className="stage-live-feed">{room.logs[0].text}</div>}
              </div>
            )}
          </div>
        </div>

        {/* 가로 모드(스마트폰 회전 · 태블릿 · 노트북): 우측 전용 컨트롤 사이드 패널 */}
        {isWide && (
          <aside className="landscape-sidebar pop-surface">
            <div className="sidebar-top-row">
              <button type="button" className="ghost-chip" onClick={onExit}>
                {isSpectator ? '⬅ 대시보드' : '🏠 나가기'}
              </button>
              <span className="room-chip">방 {room.roomCode}</span>
              <button type="button" className="ghost-chip" onClick={onToggleSound}>
                {soundOn ? '🔊 ON' : '🔇 OFF'}
              </button>
            </div>

            <div className="sidebar-stats-grid">
              <div className="stat-tile">
                <span className="st-label">탈출 열쇠</span>
                <strong className="st-val">🔑 {room.keys}/{room.targetKeys}</strong>
              </div>
              <div className="stat-tile">
                <span className="st-label">진행 턴</span>
                <strong className="st-val">🎲 {room.turnCount}/{room.maxTurns}</strong>
              </div>
              <div className="stat-tile">
                <span className="st-label">±1 조절권</span>
                <strong className="st-val">✨ {room.adjustTokens}개</strong>
              </div>
            </div>

            {renderTurnActionControls()}

            <div className="sidebar-players-box">
              <h3 className="sidebar-sec-title">👥 모둠원 위치 & 턴 순서</h3>
              <ul className="sidebar-player-list">
                {room.players.map((p, idx) => {
                  const av = AVATAR_OPTIONS.find((a) => a.id === p.avatarId) ?? AVATAR_OPTIONS[0];
                  const tile = BOARD_TILES[p.position] ?? BOARD_TILES[0];
                  const isTurn = idx === room.currentTurnIndex;
                  return (
                    <li
                      key={p.id}
                      className={`sp-item ${isTurn ? 'active-turn' : ''} ${!p.connected ? 'offline' : ''}`}
                    >
                      <span className="sp-av">{av.emoji}</span>
                      <div className="sp-meta">
                        <strong>
                          {p.nickname} {p.id === myPlayerId && !isSpectator ? '(나)' : ''}
                        </strong>
                        <span className="sp-loc">
                          {String(p.position).padStart(2, '0')}번 {tile.emoji} {tile.shortName}
                        </span>
                      </div>
                      {isTurn && <span className="turn-pointer">현재 턴</span>}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="sidebar-logs">
              {room.logs.slice(0, 3).map((l) => (
                <div key={l.id} className="sidebar-log-line">
                  {l.text}
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>

      <MissionModal
        room={room}
        myPlayerId={myPlayerId}
        isSpectator={isSpectator}
        onSubwaySelect={onSubwaySelect}
        onMissionAction={onMissionAction}
        onMissionVote={onMissionVote}
        onCompleteTalk={onCompleteTalk}
        onNextTurn={onNextTurn}
      />
    </div>
  );
};

