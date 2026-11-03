import React, { useEffect, useId, useState } from 'react';
import { AVATAR_OPTIONS } from '../../shared/gameConfig';
import type { AdminRoomSummary, RoomState } from '../../shared/types';
import { socket } from '../socket';
import { sfx } from '../sound';
import { EndingScreen } from './EndingScreen';
import { GameBoard } from './GameBoard';
import { WaitingRoom } from './WaitingRoom';

const ADMIN_PW_CACHE_KEY = 'bg_admin_pw';

interface AdminDashboardProps {
  soundOn: boolean;
  onToggleSound: () => void;
  onBackHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  soundOn,
  onToggleSound,
  onBackHome,
}) => {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<AdminRoomSummary[]>([]);
  const [spectatingRoom, setSpectatingRoom] = useState<RoomState | null>(null);

  const pwId = useId();
  const pwHintId = useId();

  const authenticate = (pw: string) => {
    socket.emit(
      'admin:auth',
      { password: pw },
      (res: { ok: boolean; rooms?: AdminRoomSummary[]; error?: string }) => {
        if (res.ok && res.rooms) {
          setAuthed(true);
          setAuthError(null);
          setRooms(res.rooms);
          sessionStorage.setItem(ADMIN_PW_CACHE_KEY, pw);
        } else {
          setAuthError(res.error ?? '비밀번호가 올바르지 않습니다.');
          sessionStorage.removeItem(ADMIN_PW_CACHE_KEY);
        }
      }
    );
  };

  useEffect(() => {
    const cached = sessionStorage.getItem(ADMIN_PW_CACHE_KEY);
    if (cached) {
      authenticate(cached);
    }

    const handleAdminRooms = (nextRooms: AdminRoomSummary[]) => {
      setRooms(nextRooms);
    };

    const handleSpectateState = (nextState: RoomState) => {
      setSpectatingRoom((prev) => (prev && prev.roomCode === nextState.roomCode ? nextState : prev));
    };

    const handleReconnect = () => {
      const savedPw = sessionStorage.getItem(ADMIN_PW_CACHE_KEY);
      if (savedPw) authenticate(savedPw);
    };

    socket.on('admin:rooms', handleAdminRooms);
    socket.on('room:state', handleSpectateState);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('admin:rooms', handleAdminRooms);
      socket.off('room:state', handleSpectateState);
      socket.off('connect', handleReconnect);
    };
  }, []);

  const startSpectate = (roomCode: string) => {
    sfx.playTap();
    socket.emit(
      'admin:spectate',
      { roomCode },
      (res: { ok: boolean; state?: RoomState; error?: string }) => {
        if (res.ok && res.state) {
          setSpectatingRoom(res.state);
        }
      }
    );
  };

  const stopSpectate = () => {
    sfx.playTap();
    socket.emit('admin:stop_spectate');
    setSpectatingRoom(null);
  };

  // 실시간 관전 화면
  if (authed && spectatingRoom) {
    if (spectatingRoom.status === 'waiting') {
      return (
        <WaitingRoom
          room={spectatingRoom}
          myPlayerId="__admin_spectator__"
          isSpectator={true}
          soundOn={soundOn}
          onToggleSound={onToggleSound}
          onChangeAvatar={() => {}}
          onStartGame={() => {}}
          onLeaveRoom={stopSpectate}
        />
      );
    }
    if (spectatingRoom.status === 'cleared') {
      return (
        <EndingScreen
          room={spectatingRoom}
          isSpectator={true}
          soundOn={soundOn}
          onToggleSound={onToggleSound}
          onExitToLobby={stopSpectate}
        />
      );
    }
    return (
      <GameBoard
        room={spectatingRoom}
        myPlayerId="__admin_spectator__"
        isSpectator={true}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onRollDice={() => {}}
        onConfirmRoll={() => {}}
        onSubwaySelect={() => {}}
        onMissionAction={() => {}}
        onMissionVote={() => {}}
        onCompleteTalk={() => {}}
        onNextTurn={() => {}}
        onExit={stopSpectate}
      />
    );
  }

  // 관리자 비밀번호 인증 화면
  if (!authed) {
    return (
      <div className="lobby-shell">
        <div className="lobby-card pop-surface admin-auth-card">
          <div className="lobby-top-bar">
            <button type="button" className="ghost-chip" onClick={onBackHome}>
              ⬅ 학생 입장 화면으로
            </button>
          </div>

          <header className="lobby-hero">
            <div className="hero-icons" aria-hidden="true">
              <span>🛡️</span>
            </div>
            <h1 className="hero-title">관리자 대시보드 로그인</h1>
            <p className="hero-subtitle">실시간 모둠 진행 현황 확인 및 방 관전 전용 페이지입니다.</p>
          </header>

          <form
            className="lobby-form"
            onSubmit={(e) => {
              e.preventDefault();
              authenticate(pwInput);
            }}
          >
            <div className="field-group">
              <label htmlFor={pwId} className="field-label">
                관리자 비밀번호
              </label>
              <span id={pwHintId} className="field-hint">
                설정 파일(gameConfig.ts)에 지정된 관리자 비밀번호를 입력하세요
              </span>
              <input
                id={pwId}
                type="password"
                className="pop-input code-input"
                placeholder="비밀번호 입력"
                required
                autoFocus
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                aria-describedby={pwHintId}
              />
            </div>

            {authError && (
              <div className="alert-banner" role="alert">
                <span>🚨</span> {authError}
              </div>
            )}

            <button type="submit" className="primary-cta-btn">
              🔓 대시보드 열기
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalStudents = rooms.reduce((acc, r) => acc + r.playerCount, 0);
  const playingCount = rooms.filter((r) => r.status === 'playing').length;
  const clearedCount = rooms.filter((r) => r.status === 'cleared').length;

  return (
    <div className="admin-shell">
      <div className="admin-container">
        <header className="admin-header pop-surface">
          <div className="admin-title-group">
            <span className="pill-badge">🛡️ LIVE ADMIN DASHBOARD</span>
            <h1>전체 모둠 실시간 진행 현황</h1>
          </div>
          <div className="top-actions">
            <button type="button" className="ghost-chip" onClick={onToggleSound}>
              {soundOn ? '🔊 효과음 ON' : '🔇 무음'}
            </button>
            <button type="button" className="ghost-chip" onClick={onBackHome}>
              🏠 학생 로비로 이동
            </button>
          </div>
        </header>

        <section className="admin-summary-strip">
          <div className="admin-metric-card pop-surface">
            <span className="am-label">생성된 모둠 방</span>
            <strong className="am-value">{rooms.length}개</strong>
          </div>
          <div className="admin-metric-card pop-surface">
            <span className="am-label">참여 학생 수</span>
            <strong className="am-value">{totalStudents}명</strong>
          </div>
          <div className="admin-metric-card pop-surface">
            <span className="am-label">보드 진행 중</span>
            <strong className="am-value highlight-blue">{playingCount}개 조</strong>
          </div>
          <div className="admin-metric-card pop-surface">
            <span className="am-label">탈출 클리어 완료</span>
            <strong className="am-value highlight-green">{clearedCount}개 조</strong>
          </div>
        </section>

        {rooms.length === 0 ? (
          <div className="admin-empty-box pop-surface">
            <p className="empty-emoji" aria-hidden="true">
              📡
            </p>
            <h2>아직 생성된 모둠 방이 없습니다</h2>
            <p>학생들이 방을 만들면 이 화면에 실시간으로 각 방의 위치와 진행 상황이 나타납니다.</p>
          </div>
        ) : (
          <section className="admin-rooms-grid">
            {rooms.map((r) => {
              const keyPct = Math.min(100, Math.round((r.keys / Math.max(1, r.targetKeys)) * 100));
              const statusLabel =
                r.status === 'waiting'
                  ? '⏳ 대기실 집결 중'
                  : r.status === 'playing'
                    ? '🔥 보드 탐험 중'
                    : '🎉 탈출 완료!';

              const phaseLabel =
                r.status !== 'playing'
                  ? '-'
                  : r.turnPhase === 'ready_to_roll'
                    ? `${r.currentTurnPlayerName}님 주사위 대기`
                    : r.turnPhase === 'adjust_choice'
                      ? `${r.currentTurnPlayerName}님 ±1 고민 중`
                      : r.turnPhase === 'moving'
                        ? '말 이동 중'
                        : `미션 수행 중 (${r.activeMissionTitle ?? r.currentTileName})`;

              return (
                <article key={r.roomCode} className={`admin-room-card pop-surface st-${r.status}`}>
                  <div className="arc-head">
                    <div>
                      <span className="arc-code">{r.roomCode}</span>
                      <span className="arc-pw">비번 {r.password}</span>
                    </div>
                    <span className={`arc-status-pill st-${r.status}`}>{statusLabel}</span>
                  </div>

                  <div className="arc-location-box">
                    <div className="arc-loc-row">
                      <span className="arc-loc-label">📍 현재 진행 칸</span>
                      <strong>
                        {String(r.currentTileIndex).padStart(2, '0')}번 {r.currentTileEmoji}{' '}
                        {r.currentTileName}
                      </strong>
                    </div>
                    <div className="arc-loc-row">
                      <span className="arc-loc-label">🎲 턴 진행도</span>
                      <strong>
                        {r.status === 'waiting' ? '시작 전' : `${r.turnCount} / ${r.maxTurns}턴`} · {phaseLabel}
                      </strong>
                    </div>
                  </div>

                  <div className="arc-key-progress">
                    <div className="arc-kp-head">
                      <span>
                        🔑 열쇠 <strong>{r.keys}</strong> / {r.targetKeys}개
                      </span>
                      <span>🌟 성경 명소 {r.visitedBiblicalCount}/4곳 방문</span>
                    </div>
                    <div className="key-progress-track">
                      <div className="key-progress-fill" style={{ width: `${keyPct}%` }} />
                    </div>
                  </div>

                  <div className="arc-players-list">
                    {r.players.map((p) => {
                      const av = AVATAR_OPTIONS.find((a) => a.id === p.avatarId) ?? AVATAR_OPTIONS[0];
                      return (
                        <div key={p.id} className={`arc-player-chip ${!p.connected ? 'offline' : ''}`}>
                          <span>{av.emoji}</span>
                          <strong>{p.nickname}</strong>
                          <span className="arc-p-tile">
                            ({String(p.position).padStart(2, '0')}번 {p.tileName})
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="primary-cta-btn spectate-btn"
                    onClick={() => startSpectate(r.roomCode)}
                  >
                    👀 이 방 실시간 관전하기
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

