import React, { useState } from 'react';
import { AVATAR_OPTIONS, getBalanceByPlayerCount } from '../../shared/gameConfig';
import type { RoomState } from '../../shared/types';
import { sfx } from '../sound';

interface WaitingRoomProps {
  room: RoomState;
  myPlayerId: string;
  isSpectator?: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onChangeAvatar: (avatarId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  room,
  myPlayerId,
  isSpectator = false,
  soundOn,
  onToggleSound,
  onChangeAvatar,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const me = room.players.find((p) => p.id === myPlayerId);
  const isHost = Boolean(me?.isHost) && !isSpectator;
  const canStart = room.players.length >= 2 && room.players.length <= 6;
  const previewBalance = getBalanceByPlayerCount(Math.max(2, room.players.length));

  const copyInvite = async () => {
    sfx.playTap();
    const url = `${window.location.origin}/?room=${room.roomCode}`;
    const text = `[차원 뒤섞인 핫플 탈출기]\n방 코드: ${room.roomCode}\n비밀번호: ${room.password}\n바로 접속: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard fallback
    }
  };

  return (
    <div className="lobby-shell">
      <div className="waiting-card pop-surface">
        <div className="lobby-top-bar">
          <button type="button" className="ghost-chip" onClick={onLeaveRoom}>
            {isSpectator ? '⬅ 대시보드로' : '⬅ 나가기'}
          </button>
          <div className="top-actions">
            {isSpectator && <span className="spectate-pill">👀 관리자 관전 중</span>}
            <button type="button" className="ghost-chip" onClick={onToggleSound}>
              {soundOn ? '🔊 효과음' : '🔇 무음'}
            </button>
          </div>
        </div>

        <div className="room-code-banner">
          <div className="code-pair">
            <div className="code-box">
              <span className="code-caption">방 코드 (6자리)</span>
              <strong className="code-value">{room.roomCode}</strong>
            </div>
            <div className="code-divider" aria-hidden="true" />
            <div className="code-box">
              <span className="code-caption">비밀번호 (4자리)</span>
              <strong className="code-value pw">{room.password}</strong>
            </div>
          </div>
          <button type="button" className="copy-invite-btn" onClick={copyInvite}>
            {copied ? '✅ 복사 완료! 친구들에게 알려주세요' : '📋 방 코드·비밀번호 복사하기'}
          </button>
        </div>

        <section className="players-lobby-section">
          <div className="section-head">
            <h2>
              모둠원 대기실 <span className="count-highlight">({room.players.length} / 6명)</span>
            </h2>
            <span className="balance-hint">
              목표: {previewBalance.maxTurns}턴 안에 🔑 {previewBalance.targetKeys}개 수집!
            </span>
          </div>

          <div className="waiting-players-grid">
            {room.players.map((p) => {
              const av = AVATAR_OPTIONS.find((a) => a.id === p.avatarId) ?? AVATAR_OPTIONS[0];
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`waiting-player-card ${isMe ? 'me' : ''} ${!p.connected ? 'offline' : ''}`}
                  style={{ '--av-color': av.color } as React.CSSProperties}
                >
                  <div className="wp-avatar">{av.emoji}</div>
                  <div className="wp-info">
                    <div className="wp-name-row">
                      <strong>{p.nickname}</strong>
                      {isMe && <span className="mini-tag me-tag">나</span>}
                      {p.isHost && <span className="mini-tag host-tag">👑 방장</span>}
                    </div>
                    <span className="wp-sub">{p.connected ? av.label : '재접속 대기 중...'}</span>
                  </div>
                </div>
              );
            })}

            {Array.from({ length: Math.max(0, 4 - room.players.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="waiting-player-card empty-slot">
                <div className="wp-avatar">➕</div>
                <div className="wp-info">
                  <span className="wp-sub">모둠원 입장 대기 중...</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {!isSpectator && me && (
          <div className="quick-avatar-bar">
            <span className="field-hint">대기 중 캐릭터 바꾸기:</span>
            <div className="avatar-mini-row">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  className={`avatar-mini-btn ${me.avatarId === av.id ? 'selected' : ''}`}
                  onClick={() => {
                    sfx.playTap();
                    onChangeAvatar(av.id);
                  }}
                  aria-label={`${av.label} 선택`}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="waiting-bottom-cta">
          {isSpectator ? (
            <div className="waiting-notice">방장이 게임을 시작하면 자동으로 보드판 화면으로 전환됩니다.</div>
          ) : isHost ? (
            <button
              type="button"
              className="primary-cta-btn"
              disabled={!canStart}
              onClick={() => {
                sfx.playKeyEarned(false);
                onStartGame();
              }}
            >
              {canStart
                ? `🚀 ${room.players.length}명 모둠 탐험 출발하기!`
                : '⏳ 최소 2명 이상 모이면 시작할 수 있어요!'}
            </button>
          ) : (
            <div className="waiting-notice">
              👑 방장(<strong>{room.players.find((p) => p.isHost)?.nickname}</strong>)님이 시작 버튼을 누르면
              동시에 출발합니다!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

