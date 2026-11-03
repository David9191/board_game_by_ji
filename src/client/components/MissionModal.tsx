import React, { useEffect, useId, useRef, useState } from 'react';
import { AVATAR_OPTIONS, BOARD_TILES } from '../../shared/gameConfig';
import type { RoomState } from '../../shared/types';
import { sfx } from '../sound';

interface MissionModalProps {
  room: RoomState;
  myPlayerId: string;
  isSpectator?: boolean;
  onSubwaySelect: (destIndex: number) => void;
  onMissionAction: (payload: {
    type: 'tap' | 'swipe' | 'timing' | 'target';
    value?: number;
    targetId?: string;
  }) => void;
  onMissionVote: (optionIndex: number, forceFinalize?: boolean) => void;
  onCompleteTalk: () => void;
  onNextTurn: () => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({
  room,
  myPlayerId,
  isSpectator = false,
  onSubwaySelect,
  onMissionAction,
  onMissionVote,
  onCompleteTalk,
  onNextTurn,
}) => {
  const mission = room.activeMission;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [remainSec, setRemainSec] = useState<string>('0.0');
  const [gaugePos, setGaugePos] = useState<number>(50);
  const [timingCooldown, setTimingCooldown] = useState(false);
  const [lastTimingFeedback, setLastTimingFeedback] = useState<string | null>(null);
  const lastSwipeX = useRef<number | null>(null);
  const lastArrowKey = useRef<string>('');
  const playedResultIdRef = useRef<string | null>(null);

  const me = room.players.find((p) => p.id === myPlayerId);
  const currentPlayer = room.players[room.currentTurnIndex];
  const canControlTurn =
    !isSpectator &&
    (currentPlayer?.id === myPlayerId || Boolean(me?.isHost && currentPlayer && !currentPlayer.connected));

  // Sync native <dialog> top-layer modal state
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (mission && room.status === 'playing') {
      if (!dlg.open) {
        try {
          dlg.showModal();
        } catch {
          // ignore if already open
        }
      }
    } else if (dlg.open) {
      dlg.close();
    }
  }, [mission, room.status]);

  // Play key chime once on result
  useEffect(() => {
    if (!mission || mission.stage !== 'result' || !mission.result) return;
    const key = `${mission.id}-result`;
    if (playedResultIdRef.current === key) return;
    playedResultIdRef.current = key;
    if (mission.result.keysEarned > 0) {
      sfx.playKeyEarned(mission.result.keysEarned >= 2);
    }
  }, [mission]);

  // Live countdown timer for action minigames
  useEffect(() => {
    if (!mission || mission.stage !== 'action' || !mission.endsAt) {
      setRemainSec('0.0');
      return;
    }
    const tick = () => {
      const ms = Math.max(0, (mission.endsAt ?? 0) - Date.now());
      setRemainSec((ms / 1000).toFixed(1));
    };
    tick();
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, [mission?.id, mission?.stage, mission?.endsAt]);

  // Oscillating rhythm/baseball bar for timing_sync
  useEffect(() => {
    if (!mission || mission.kind !== 'timing_sync' || mission.stage !== 'action') return;
    let rafId = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const wave = (Math.sin(elapsed * 4.4) + 1) * 50; // 0..100
      setGaugePos(wave);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [mission?.id, mission?.kind, mission?.stage]);

  // Keyboard support (Spacebar for tap/timing, Left/Right arrows for Red Sea swipe!)
  useEffect(() => {
    if (isSpectator || !mission || mission.stage !== 'action') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (
        e.code === 'Space' &&
        (mission.kind === 'tap_rush' || mission.kind === 'jericho_combo' || mission.kind === 'finale_rush')
      ) {
        e.preventDefault();
        sfx.playTap();
        onMissionAction({ type: 'tap' });
      } else if (e.code === 'Space' && mission.kind === 'timing_sync' && !timingCooldown) {
        e.preventDefault();
        triggerTimingHit();
      } else if (
        mission.kind === 'red_sea_combo' &&
        (e.code === 'ArrowLeft' || e.code === 'ArrowRight') &&
        lastArrowKey.current !== e.code
      ) {
        e.preventDefault();
        lastArrowKey.current = e.code;
        sfx.playTap();
        onMissionAction({ type: 'swipe' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const triggerTimingHit = () => {
    if (isSpectator || timingCooldown) return;
    setTimingCooldown(true);
    const dist = Math.abs(gaugePos - 50);
    if (dist <= 12) {
      setLastTimingFeedback('🔥 PERFECT!! +22점');
      sfx.playKeyEarned(false);
    } else if (dist <= 24) {
      setLastTimingFeedback('✨ GOOD! +14점');
      sfx.playTap();
    } else {
      setLastTimingFeedback('💨 조금 아쉬워요! +10점');
      sfx.playTap();
    }
    onMissionAction({ type: 'timing', value: Math.round(gaugePos) });
    setTimeout(() => setTimingCooldown(false), 420);
  };

  const handleSeaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpectator) return;
    lastSwipeX.current = e.clientX;
  };

  const handleSeaPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpectator || lastSwipeX.current === null) return;
    const dx = Math.abs(e.clientX - lastSwipeX.current);
    if (dx >= 42) {
      lastSwipeX.current = e.clientX;
      sfx.playTap();
      onMissionAction({ type: 'swipe' });
    }
  };

  const handleSeaPointerUp = () => {
    lastSwipeX.current = null;
  };

  const pct = mission
    ? Math.min(100, Math.round((mission.progress / Math.max(1, mission.targetProgress)) * 100))
    : 0;

  const myVote = mission ? mission.votes[myPlayerId] : undefined;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'none' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      className={`pop-dialog mission-dialog ${mission?.isBiblical ? 'biblical-dialog' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => e.preventDefault()}
    >
      {mission && (
        <div className="mission-inner">
          {/* 상단 배지 & 타이틀 */}
          <header className="mission-header">
            <div className="mission-badges">
              <span className={`mission-cat-pill ${mission.isBiblical ? 'gold' : ''}`}>
                {mission.isBiblical
                  ? '🌟 성경 황금 명소 (열쇠 ×2)'
                  : mission.kind === 'finale_rush'
                    ? '⚡ 비상 포탈 개방'
                    : '🎯 모둠 실시간 미션'}
              </span>
              {mission.stage === 'action' && mission.endsAt && (
                <span className="timer-pill">⏱️ {remainSec}초</span>
              )}
              {isSpectator && <span className="spectate-pill">👀 관전 중</span>}
            </div>

            <h2 id={titleId} className="mission-title">
              <span aria-hidden="true">{mission.tileEmoji}</span> {mission.tileName}
            </h2>
            {mission.introStory && mission.stage !== 'result' && (
              <p className="mission-intro-story">{mission.introStory}</p>
            )}
          </header>

          {/* 0) 지하철 급행역 목적지 선택 */}
          {mission.kind === 'subway_jump' && mission.stage === 'action' && (
            <div className="subway-picker-body">
              <p className="subway-guide">
                {canControlTurn
                  ? '이동할 명소를 터치하세요! (🌟 황금 명소는 열쇠 2개!)'
                  : `🚇 ${mission.protagonistName}님이 모둠원들과 상의해 행선지를 고르고 있어요!`}
              </p>

              <div className="subway-golden-section">
                <span className="sub-label">🌟 추천! 열쇠 2개 황금 성경 명소</span>
                <div className="subway-grid golden">
                  {BOARD_TILES.filter((t) => t.category === 'biblical').map((t) => {
                    const visited = room.visitedBiblicalTiles.includes(t.index);
                    return (
                      <button
                        key={t.index}
                        type="button"
                        disabled={!canControlTurn}
                        className="subway-dest-btn gold"
                        onClick={() => {
                          sfx.playKeyEarned(true);
                          onSubwaySelect(t.index);
                        }}
                      >
                        <span className="sd-emoji">{t.emoji}</span>
                        <strong>{t.name}</strong>
                        <span className="sd-tag">{visited ? '🔑+2 (재방문 가능)' : '✨ 미방문 추천! 🔑+2'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="subway-golden-section">
                <span className="sub-label">🏙️ 한국 핫플 & 특수 칸</span>
                <div className="subway-grid compact">
                  {BOARD_TILES.filter((t) => t.category !== 'biblical' && t.index !== 6 && t.index !== 0).map(
                    (t) => (
                      <button
                        key={t.index}
                        type="button"
                        disabled={!canControlTurn}
                        className="subway-dest-btn"
                        onClick={() => {
                          sfx.playTap();
                          onSubwaySelect(t.index);
                        }}
                      >
                        <span>
                          {t.emoji} {t.shortName}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1) 액션 미니게임 준비 카운트다운 */}
          {mission.stage === 'countdown' && (
            <div className="countdown-stage">
              <div className="countdown-pulse">READY!</div>
              <p className="countdown-tip">
                {mission.kind === 'red_sea_combo'
                  ? '잠시 후 화면의 바다를 좌우로 스와이프(또는 마우스 드래그 · 방향키 ←→) 하세요!'
                  : mission.kind === 'timing_sync'
                    ? '잠시 후 게이지가 중앙 황금 구역에 올 때 타이밍 맞춰 터치(또는 스페이스바)!'
                    : mission.kind === 'target_catch'
                      ? '잠시 후 화면에 뜨는 아이콘들을 모둠원 모두 빠르게 터치·클릭!'
                      : '잠시 후 전원이 화면 버튼(또는 스페이스바)을 미친 듯이 연타하세요!'}
              </p>
            </div>
          )}

          {/* 2-A) 연타 미니게임 (PC방 / 여리고 1단계 / 피날레) */}
          {mission.stage === 'action' &&
            (mission.kind === 'tap_rush' ||
              mission.kind === 'jericho_combo' ||
              mission.kind === 'finale_rush') && (
              <div className="action-stage">
                <div className="coop-meter-wrap">
                  <div className="coop-meter-head">
                    <strong>합동 파워 게이지</strong>
                    <span>
                      {mission.progress} / {mission.targetProgress} ({pct}%)
                    </span>
                  </div>
                  <div className="key-progress-track large">
                    <div className="key-progress-fill hot" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {mission.kind === 'jericho_combo' && (
                  <div className={`jericho-wall ${pct >= 70 ? 'cracked-heavy' : pct >= 35 ? 'cracked-mid' : ''}`}>
                    <div className="wall-bricks" aria-hidden="true">
                      🧱🧱🧱🧱🧱
                    </div>
                    <span className="wall-caption">
                      {pct >= 70 ? '💥 성벽이 무너지기 직전이에요!!' : '🗣️ 다 같이 두드려 마음의 벽을 허물어라!'}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSpectator}
                  className="giant-tap-btn"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (isSpectator) return;
                    sfx.playTap();
                    onMissionAction({ type: 'tap' });
                  }}
                >
                  <span className="gt-emoji">
                    {mission.kind === 'jericho_combo' ? '🔨' : mission.kind === 'finale_rush' ? '⚡' : '🖱️'}
                  </span>
                  <strong>{isSpectator ? '학생들이 연타 중입니다!' : '여기를 미친 듯이 연타!!'}</strong>
                  <span className="gt-sub">터치 · 마우스 클릭 · 스페이스바 모두 OK!</span>
                </button>

                <div className="contrib-chips">
                  {room.players.map((p) => (
                    <span key={p.id} className="contrib-chip">
                      {p.nickname}: <strong>{mission.contributions[p.id] ?? 0}</strong>회
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* 2-B) 홍해 바닷길 가르기 미니게임 */}
          {mission.stage === 'action' && mission.kind === 'red_sea_combo' && (
            <div className="action-stage">
              <div className="coop-meter-wrap">
                <div className="coop-meter-head">
                  <strong>🌊 홍해 바닷길 개방률</strong>
                  <span>{pct}%</span>
                </div>
                <div className="key-progress-track large">
                  <div className="key-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div
                className="red-sea-arena"
                onPointerDown={handleSeaPointerDown}
                onPointerMove={handleSeaPointerMove}
                onPointerUp={handleSeaPointerUp}
                onPointerCancel={handleSeaPointerUp}
              >
                <div className="dry-land-path">
                  <span>🥾 마른 땅 길이 열리고 있어요!</span>
                </div>
                <div
                  className="sea-wave left-wave"
                  style={{ transform: `translateX(-${Math.min(82, pct * 0.82)}%)` }}
                >
                  🌊🌊
                </div>
                <div
                  className="sea-wave right-wave"
                  style={{ transform: `translateX(${Math.min(82, pct * 0.82)}%)` }}
                >
                  🌊🌊
                </div>
                <div className="sea-overlay-hint">
                  👈 좌우로 문지르거나 아래 버튼·방향키(←/→) 연타! 👉
                </div>
              </div>

              {!isSpectator && (
                <div className="sea-split-buttons">
                  <button
                    type="button"
                    className="sea-push-btn"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      sfx.playTap();
                      onMissionAction({ type: 'swipe' });
                    }}
                  >
                    ◀ 왼쪽 파도 밀어내기!
                  </button>
                  <button
                    type="button"
                    className="sea-push-btn"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      sfx.playTap();
                      onMissionAction({ type: 'swipe' });
                    }}
                  >
                    오른쪽 파도 밀어내기! ▶
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2-C) 타이밍 미니게임 (코인노래방 / 야구장) */}
          {mission.stage === 'action' && mission.kind === 'timing_sync' && (
            <div className="action-stage">
              <div className="coop-meter-wrap">
                <div className="coop-meter-head">
                  <strong>모둠 합산 점수</strong>
                  <span>
                    {mission.progress} / {mission.targetProgress}점
                  </span>
                </div>
                <div className="key-progress-track large">
                  <div className="key-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="timing-track-box">
                <div className="timing-good-zone" />
                <div className="timing-perfect-zone">PERFECT</div>
                <div className="timing-cursor" style={{ left: `${gaugePos}%` }} />
              </div>

              {lastTimingFeedback && <div className="timing-feedback-pop">{lastTimingFeedback}</div>}

              <button
                type="button"
                disabled={isSpectator || timingCooldown}
                className="giant-tap-btn timing-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerTimingHit();
                }}
              >
                <span className="gt-emoji">{mission.tileIndex === 4 ? '🎤' : '⚾'}</span>
                <strong>
                  {timingCooldown ? '호흡 가다듬는 중...' : '황금 구역에 오면 지금 터치!!'}
                </strong>
                <span className="gt-sub">5초 동안 여러 번 맞힐 수 있어요! (스페이스바 가능)</span>
              </button>
            </div>
          )}

          {/* 2-D) 타겟 캐치 미니게임 (학교 매점 / 오락실) */}
          {mission.stage === 'action' && mission.kind === 'target_catch' && (
            <div className="action-stage">
              <div className="coop-meter-wrap">
                <div className="coop-meter-head">
                  <strong>모둠 합동 획득 개수</strong>
                  <span>
                    {mission.progress} / {mission.targetProgress}개
                  </span>
                </div>
                <div className="key-progress-track large">
                  <div className="key-progress-fill hot" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="target-field">
                {(mission.targets ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isSpectator}
                    className="floating-target-btn"
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (isSpectator) return;
                      sfx.playTap();
                      onMissionAction({ type: 'target', targetId: t.id });
                    }}
                  >
                    {t.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3) 투표 / 퀴즈 / 공감 선택 단계 */}
          {mission.stage === 'quiz' && mission.question && (
            <div className="quiz-stage">
              <div className="quiz-role-callout">
                {mission.kind === 'guess_protagonist' ? (
                  mission.protagonistId === myPlayerId && !isSpectator ? (
                    <span>🤫 이번 턴 주인공은 바로 <strong>나</strong>! 내 진짜 취향을 비밀리에 골라주세요!</span>
                  ) : (
                    <span>
                      🕵️ <strong>{mission.protagonistName}</strong>님은 어떤 보기를 고를까요? 예측해서 눌러보세요!
                    </span>
                  )
                ) : mission.kind === 'telepathy' ? (
                  <span>⚡ 하나 둘 셋! 우리 모둠 과반수가 같은 보기를 고르면 열쇠 획득!</span>
                ) : mission.kind === 'empathy_talk' ? (
                  <span>💛 정답 없는 공감 토크! 내 마음과 가장 가까운 보기를 편하게 골라주세요</span>
                ) : (
                  <span>
                    {mission.stage1Success
                      ? '🎉 1단계 미니게임 성공! 이제 모둠원들과 상의해 보너스 퀴즈를 맞혀보세요!'
                      : '💡 아깝게 1단계를 놓쳤지만 괜찮아요! 이 퀴즈를 맞히면 황금 열쇠 2개를 다 받을 수 있어요!'}
                  </span>
                )}
              </div>

              <p className="quiz-prompt-text">{mission.question.prompt}</p>

              <div className="quiz-options-list">
                {mission.question.options.map((opt, idx) => {
                  const selected = myVote === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSpectator}
                      className={`quiz-option-btn ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        sfx.playTap();
                        onMissionVote(idx, false);
                      }}
                    >
                      <span className="opt-num">{idx + 1}</span>
                      <span className="opt-label">{opt}</span>
                      {selected && <span className="opt-check">선택됨 ✅</span>}
                    </button>
                  );
                })}
              </div>

              <div className="vote-status-bar">
                <div className="voter-pills">
                  {room.players.map((p) => {
                    const voted = typeof mission.votes[p.id] === 'number';
                    return (
                      <span key={p.id} className={`voter-pill ${voted ? 'done' : ''}`}>
                        {p.nickname} {voted ? '✅' : '⏳'}
                      </span>
                    );
                  })}
                </div>

                {!isSpectator &&
                  me?.isHost &&
                  Object.keys(mission.votes).length > 0 &&
                  Object.keys(mission.votes).length < room.players.length && (
                    <button
                      type="button"
                      className="force-vote-btn"
                      onClick={() => onMissionVote(myVote ?? 0, true)}
                    >
                      응답 완료자 기준으로 결과 보기
                    </button>
                  )}
              </div>
            </div>
          )}

          {/* 4) 성경 명소(에덴동산·베들레헴) 공감 선택 결과 공유 & 짧은 대화 단계 */}
          {mission.stage === 'talk_share' && mission.question && (
            <div className="talk-share-stage">
              <div className="talk-guide-banner">
                💬 우리 모둠원들의 선택이 공개되었어요! 왜 골랐는지 <strong>20초 동안</strong> 서로 웃으며
                이야기 나눠보세요!
              </div>

              <div className="shared-choices-list">
                {mission.question.options.map((opt, idx) => {
                  const choosers = room.players.filter((p) => mission.votes[p.id] === idx);
                  return (
                    <div key={idx} className={`shared-choice-row ${choosers.length > 0 ? 'picked' : ''}`}>
                      <div className="sc-opt-text">{opt}</div>
                      <div className="sc-avatars">
                        {choosers.length === 0 ? (
                          <span className="sc-none">-</span>
                        ) : (
                          choosers.map((c) => {
                            const av = AVATAR_OPTIONS.find((a) => a.id === c.avatarId) ?? AVATAR_OPTIONS[0];
                            return (
                              <span key={c.id} className="sc-user-badge">
                                {av.emoji} {c.nickname}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {mission.question.explanation && (
                <div className="warm-story-note">{mission.question.explanation}</div>
              )}

              {!isSpectator && (
                <button
                  type="button"
                  className="primary-cta-btn gold-cta"
                  onClick={() => {
                    sfx.playKeyEarned(true);
                    onCompleteTalk();
                  }}
                >
                  🌟 대화 완료! 황금 열쇠 2개 받기 🔑✨
                </button>
              )}
            </div>
          )}

          {/* 5) 미션 최종 결과 화면 */}
          {mission.stage === 'result' && mission.result && (
            <div className="result-stage">
              <div className={`result-banner ${mission.result.success ? 'win' : 'try'}`}>
                <h3>{mission.result.headline}</h3>
                <p>{mission.result.detail}</p>
              </div>

              {/* 투표형 미션이었을 때 누가 무엇을 골랐는지 한눈에 공개 */}
              {mission.question && Object.keys(mission.votes).length > 0 && (
                <div className="shared-choices-list compact">
                  {mission.question.options.map((opt, idx) => {
                    const choosers = room.players.filter((p) => mission.votes[p.id] === idx);
                    const isWinner = mission.result?.winningOptionIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`shared-choice-row ${isWinner ? 'highlight-answer' : ''}`}
                      >
                        <div className="sc-opt-text">
                          {isWinner ? '⭐ ' : ''}
                          {opt}
                        </div>
                        <div className="sc-avatars">
                          {choosers.map((c) => {
                            const av = AVATAR_OPTIONS.find((a) => a.id === c.avatarId) ?? AVATAR_OPTIONS[0];
                            return (
                              <span key={c.id} className="sc-user-badge">
                                {av.emoji} {c.nickname}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isSpectator ? (
                <button
                  type="button"
                  className="primary-cta-btn"
                  autoFocus
                  onClick={() => {
                    sfx.playTap();
                    onNextTurn();
                  }}
                >
                  {room.keys >= room.targetKeys
                    ? '🎉 차원 포탈 열기! (탈출 성공 화면으로!)'
                    : '다음 턴으로 계속하기 ▶'}
                </button>
              ) : (
                <div className="waiting-roll-pill">학생이 확인 버튼을 누르면 다음 턴으로 넘어갑니다.</div>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
};

