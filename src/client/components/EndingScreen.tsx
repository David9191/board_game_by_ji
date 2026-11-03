import confetti from 'canvas-confetti';
import React, { useEffect, useState } from 'react';
import { AVATAR_OPTIONS, ENDING_CONFIG } from '../../shared/gameConfig';
import type { RoomState } from '../../shared/types';
import { sfx } from '../sound';

interface EndingScreenProps {
  room: RoomState;
  isSpectator?: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onExitToLobby: () => void;
}

function toYoutubeEmbedUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return rawUrl;
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({
  room,
  isSpectator = false,
  soundOn,
  onToggleSound,
  onExitToLobby,
}) => {
  const slides = ENDING_CONFIG.outroSlides;
  const [slideIdx, setSlideIdx] = useState(0);
  const [isPlayingReel, setIsPlayingReel] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return ENDING_CONFIG.videoAutoPlay && !prefersReduced;
  });
  const [reelFinished, setReelFinished] = useState(false);

  // 화려한 폭죽 컨페티 & 팡파레 (모션 감소 설정 시 생략)
  useEffect(() => {
    sfx.playFanfare();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.58 },
    });

    const t1 = window.setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0.1, y: 0.65 },
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 0.9, y: 0.65 },
      });
    }, 650);

    return () => window.clearTimeout(t1);
  }, []);

  // 내장 시네마틱 엔딩 영상 슬라이드 자동 재생 타이머
  useEffect(() => {
    if (ENDING_CONFIG.customVideoUrl.trim() !== '' || !isPlayingReel) return;
    const current = slides[slideIdx];
    if (!current) return;

    const timer = window.setTimeout(() => {
      if (slideIdx < slides.length - 1) {
        setSlideIdx((prev) => prev + 1);
      } else {
        setIsPlayingReel(false);
        setReelFinished(true);
      }
    }, current.durationMs);

    return () => window.clearTimeout(timer);
  }, [slideIdx, isPlayingReel, slides]);

  const customUrl = ENDING_CONFIG.customVideoUrl.trim();
  const youtubeEmbed = customUrl ? toYoutubeEmbedUrl(customUrl) : null;
  const activeSlide = slides[slideIdx] ?? slides[0];
  const promo = ENDING_CONFIG.nextEventPromo;

  return (
    <div className="ending-shell">
      <div className="ending-container">
        <div className="ending-topbar">
          <button type="button" className="ghost-chip" onClick={onExitToLobby}>
            {isSpectator ? '⬅ 관리자 대시보드로' : '🏠 처음으로'}
          </button>
          <div className="top-actions">
            {isSpectator && <span className="spectate-pill">👀 관리자 관전 중</span>}
            <button type="button" className="ghost-chip" onClick={onToggleSound}>
              {soundOn ? '🔊 효과음 ON' : '🔇 무음'}
            </button>
          </div>
        </div>

        {/* 1. 화려한 클리어 배너 & 우리 모둠 아바타 단체 기념샷 */}
        <section className="ending-hero-card pop-surface">
          <div className="clear-sparkle-badge">✨ PORTAL UNLOCKED · 전원 탈출 완료 ✨</div>
          <h1 className="ending-main-title">{ENDING_CONFIG.warmGreetingTitle}</h1>
          <p className="ending-greeting-body">{ENDING_CONFIG.warmGreetingBody}</p>

          <div className="team-photo-strip" aria-label="함께 탈출한 모둠원">
            {room.players.map((p) => {
              const av = AVATAR_OPTIONS.find((a) => a.id === p.avatarId) ?? AVATAR_OPTIONS[0];
              return (
                <div
                  key={p.id}
                  className="photo-member"
                  style={{ '--av-color': av.color } as React.CSSProperties}
                >
                  <span className="pm-emoji">{av.emoji}</span>
                  <strong className="pm-name">{p.nickname}</strong>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 엔딩 영상 ("재밌게 잘 하셨나요?" 아웃트로 비디오/시네마틱 릴) */}
        <section className="ending-video-card pop-surface" aria-label="엔딩 영상">
          <div className="video-section-header">
            <span className="video-live-dot">🎬 ENDING VIDEO</span>
            <span className="video-caption">끝까지 보면 특별한 초대가 기다리고 있어요!</span>
          </div>

          <div className="ending-video-frame">
            {customUrl ? (
              youtubeEmbed ? (
                <iframe
                  src={youtubeEmbed}
                  title="엔딩 영상"
                  className="media-fill"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={customUrl}
                  className="media-fill"
                  controls
                  playsInline
                  autoPlay={ENDING_CONFIG.videoAutoPlay}
                />
              )
            ) : (
              /* 기본 내장 시네마틱 엔딩 영상 플레이어 */
              <div className={`cinematic-reel slide-theme-${slideIdx}`}>
                <div className="reel-progress-bars" aria-hidden="true">
                  {slides.map((_, i) => (
                    <div
                      key={i}
                      className={`reel-seg ${i < slideIdx || reelFinished ? 'done' : i === slideIdx ? 'active' : ''}`}
                    />
                  ))}
                </div>

                <div key={slideIdx} className="reel-scene-content">
                  <div className="reel-big-emoji" aria-hidden="true">
                    {activeSlide.emoji}
                  </div>
                  <h2 className="reel-headline">{activeSlide.headline}</h2>
                  <p className="reel-subtext">{activeSlide.subtext}</p>
                </div>

                <div className="reel-controls">
                  <span className="reel-step-indicator">
                    SCENE {slideIdx + 1} / {slides.length}
                  </span>
                  <div className="reel-btn-group">
                    <button
                      type="button"
                      className="reel-ctrl-btn"
                      onClick={() => {
                        sfx.playTap();
                        if (reelFinished) {
                          setSlideIdx(0);
                          setReelFinished(false);
                          setIsPlayingReel(true);
                        } else {
                          setIsPlayingReel((prev) => !prev);
                        }
                      }}
                    >
                      {reelFinished ? '🔄 처음부터 다시 보기' : isPlayingReel ? '⏸ 일시정지' : '▶ 재생'}
                    </button>
                    {slideIdx < slides.length - 1 && (
                      <button
                        type="button"
                        className="reel-ctrl-btn"
                        onClick={() => {
                          sfx.playTap();
                          setSlideIdx((prev) => Math.min(slides.length - 1, prev + 1));
                        }}
                      >
                        다음 장면 ⏭
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. 따뜻하고 부담 없는 복음 메시지 카드 */}
        <section className="gospel-message-card pop-surface">
          <h2>{ENDING_CONFIG.gospelCardTitle}</h2>
          <p>{ENDING_CONFIG.gospelCardBody}</p>
        </section>

        {/* 4. 마지막 하이라이트: 다음 교회 행사 홍보 초대장 */}
        <section className="promo-invite-card pop-surface">
          <div className="promo-badge">{promo.badge}</div>
          <h2 className="promo-title">{promo.title}</h2>
          <p className="promo-subtitle">{promo.subtitle}</p>

          {promo.posterImageUrl && (
            <div className="promo-poster-wrap">
              <img src={promo.posterImageUrl} alt={promo.title} className="promo-poster-img" />
            </div>
          )}

          <div className="promo-meta-box">
            <div className="promo-meta-row">
              <span className="pm-label">📅 일시</span>
              <strong>{promo.dateText}</strong>
            </div>
            <div className="promo-meta-row">
              <span className="pm-label">📍 장소</span>
              <strong>{promo.locationText}</strong>
            </div>
          </div>

          <ul className="promo-perks-list">
            {promo.perks.map((perk, idx) => (
              <li key={idx}>{perk}</li>
            ))}
          </ul>

          {promo.ctaUrl && promo.ctaLabel && (
            <a
              href={promo.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-cta-btn promo-cta-link"
            >
              {promo.ctaLabel}
            </a>
          )}
        </section>
      </div>
    </div>
  );
};

