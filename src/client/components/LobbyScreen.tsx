import React, { useEffect, useId, useRef, useState } from 'react';
import { AVATAR_OPTIONS, GAME_SETTINGS } from '../../shared/gameConfig';
import { sfx } from '../sound';

interface LobbyScreenProps {
  initialNickname: string;
  initialAvatarId: string;
  initialRoomCode?: string;
  errorMsg: string | null;
  busy: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onCreateRoom: (nickname: string, avatarId: string, password: string) => void;
  onJoinRoom: (nickname: string, avatarId: string, roomCode: string, password: string) => void;
  onGoAdmin: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  initialNickname,
  initialAvatarId,
  initialRoomCode = '',
  errorMsg,
  busy,
  soundOn,
  onToggleSound,
  onCreateRoom,
  onJoinRoom,
  onGoAdmin,
}) => {
  const [mode, setMode] = useState<'join' | 'create'>(initialRoomCode ? 'join' : 'join');
  const [nickname, setNickname] = useState(initialNickname);
  const [avatarId, setAvatarId] = useState(initialAvatarId);
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [password, setPassword] = useState('');

  const rulesDialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const nickId = useId();
  const nickHintId = useId();
  const nickErrId = useId();
  const codeId = useId();
  const codeHintId = useId();
  const codeErrId = useId();
  const pwId = useId();
  const pwHintId = useId();
  const pwErrId = useId();
  const rulesTitleId = useId();

  // Keep aria-invalid synced with :user-invalid and provide fallback if needed
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const dirtyState = new WeakMap<HTMLInputElement, { interacted: boolean; blurred: boolean }>();
    const supportsUserInvalid = typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');

    const syncField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLInputElement)) return;
      if (supportsUserInvalid) {
        el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
      } else {
        const valid = el.checkValidity();
        el.classList.toggle('user-invalid-fallback', !valid);
        el.setAttribute('aria-invalid', !valid ? 'true' : 'false');
      }
    };

    const onBlur = (e: Event) => {
      if (!(e.target instanceof HTMLInputElement)) return;
      const st = dirtyState.get(e.target) ?? { interacted: false, blurred: false };
      st.blurred = true;
      dirtyState.set(e.target, st);
      if (st.interacted || supportsUserInvalid) syncField(e.target);
    };

    const onInput = (e: Event) => {
      if (!(e.target instanceof HTMLInputElement)) return;
      const st = dirtyState.get(e.target) ?? { interacted: false, blurred: false };
      st.interacted = true;
      dirtyState.set(e.target, st);
      if (st.blurred || e.target.hasAttribute('aria-invalid')) syncField(e.target);
    };

    form.addEventListener('blur', onBlur, true);
    form.addEventListener('input', onInput);
    return () => {
      form.removeEventListener('blur', onBlur, true);
      form.removeEventListener('input', onInput);
    };
  }, [mode]);

  const handleImeSafeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) {
        return;
      }
      formRef.current?.requestSubmit();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.playTap();
    if (mode === 'create') {
      onCreateRoom(nickname.trim(), avatarId, password.trim());
    } else {
      onJoinRoom(nickname.trim(), avatarId, roomCode.trim().toUpperCase(), password.trim());
    }
  };

  return (
    <div className="lobby-shell">
      <div className="lobby-card pop-surface">
        <div className="lobby-top-bar">
          <span className="pill-badge">🎲 2–6인 실시간 모둠 협동</span>
          <div className="top-actions">
            <button
              type="button"
              className="ghost-chip"
              onClick={() => {
                sfx.playTap();
                rulesDialogRef.current?.showModal();
              }}
            >
              📖 1분 규칙
            </button>
            <button type="button" className="ghost-chip" onClick={onToggleSound}>
              {soundOn ? '🔊 효과음 ON' : '🔇 무음'}
            </button>
          </div>
        </div>

        <header className="lobby-hero">
          <div className="hero-icons" aria-hidden="true">
            <span>🎢</span>
            <span>🍜</span>
            <span>🌊</span>
            <span>🖱️</span>
            <span>⭐</span>
          </div>
          <h1 className="hero-title">{GAME_SETTINGS.gameTitle}</h1>
          <p className="hero-subtitle">{GAME_SETTINGS.gameSubtitle}</p>
        </header>

        <div className="mode-tabs" role="tablist" aria-label="방 입장 방식 선택">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'join'}
            className={`mode-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => {
              sfx.playTap();
              setMode('join');
            }}
          >
            🔑 방 코드로 입장
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => {
              sfx.playTap();
              setMode('create');
            }}
          >
            🏠 새 모둠 방 만들기
          </button>
        </div>

        <form ref={formRef} className="lobby-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor={nickId} className="field-label">
              내 이름 (닉네임)
            </label>
            <span id={nickHintId} className="field-hint">
              모둠 친구들이 알아볼 수 있는 이름이나 별명을 적어주세요 (1–12자)
            </span>
            <input
              id={nickId}
              type="text"
              className="pop-input"
              placeholder="예: 민수, 서연"
              required
              minLength={1}
              maxLength={12}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={handleImeSafeEnter}
              aria-describedby={nickHintId}
              aria-errormessage={nickErrId}
            />
            <div id={nickErrId} className="field-error">
              <span aria-hidden="true">⚠️</span> 닉네임을 1자 이상 입력해 주세요.
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">내 보드판 캐릭터 선택</span>
            <div className="avatar-grid" role="radiogroup" aria-label="캐릭터 아바타 선택">
              {AVATAR_OPTIONS.map((av) => {
                const selected = avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`avatar-pick-btn ${selected ? 'selected' : ''}`}
                    style={{ '--av-color': av.color } as React.CSSProperties}
                    onClick={() => {
                      sfx.playTap();
                      setAvatarId(av.id);
                    }}
                  >
                    <span className="av-emoji" aria-hidden="true">
                      {av.emoji}
                    </span>
                    <span className="av-name">{av.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'join' && (
            <div className="field-group">
              <label htmlFor={codeId} className="field-label">
                방 코드 (영문+숫자 6자리)
              </label>
              <span id={codeHintId} className="field-hint">
                모둠 방장이 알려준 6자리 방 코드를 입력하세요 (대소문자 무관)
              </span>
              <input
                id={codeId}
                type="text"
                className="pop-input code-input"
                placeholder="예: K7M4P9"
                required
                minLength={6}
                maxLength={6}
                pattern="[A-Za-z0-9]{6}"
                autoCapitalize="characters"
                autoComplete="off"
                value={roomCode}
                onChange={(e) =>
                  setRoomCode(
                    e.target.value
                      .replace(/[^A-Za-z0-9]/g, '')
                      .toUpperCase()
                      .slice(0, 6)
                  )
                }
                onKeyDown={handleImeSafeEnter}
                aria-describedby={codeHintId}
                aria-errormessage={codeErrId}
              />
              <div id={codeErrId} className="field-error">
                <span aria-hidden="true">⚠️</span> 영문과 숫자로 된 6자리 방 코드를 입력해 주세요.
              </div>
            </div>
          )}

          <div className="field-group">
            <label htmlFor={pwId} className="field-label">
              {mode === 'create' ? '방 비밀번호 설정 (숫자 4자리)' : '방 비밀번호 (숫자 4자리)'}
            </label>
            <span id={pwHintId} className="field-hint">
              {mode === 'create'
                ? '우리 모둠원끼리 공유할 숫자 4자리(예: 1234)를 정해주세요'
                : '방장이 설정한 숫자 4자리 비밀번호를 입력하세요'}
            </span>
            <input
              id={pwId}
              type="text"
              inputMode="numeric"
              className="pop-input code-input"
              placeholder="예: 1234"
              required
              minLength={4}
              maxLength={4}
              pattern="[0-9]{4}"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={handleImeSafeEnter}
              aria-describedby={pwHintId}
              aria-errormessage={pwErrId}
            />
            <div id={pwErrId} className="field-error">
              <span aria-hidden="true">⚠️</span> 숫자 4자리를 정확히 입력해 주세요 (예: 1234).
            </div>
          </div>

          {errorMsg && (
            <div className="alert-banner" role="alert">
              <span>🚨</span> {errorMsg}
            </div>
          )}

          <button type="submit" className="primary-cta-btn" disabled={busy}>
            {busy
              ? '접속 중...'
              : mode === 'create'
                ? '🏠 모둠 방 만들고 코드 받기!'
                : '🚀 우리 모둠 방 입장하기!'}
          </button>
        </form>

        <footer className="lobby-footer">
          <span>스마트폰(세로·가로) · 태블릿 · 노트북 모두 지원</span>
          <button type="button" className="subtle-admin-link" onClick={onGoAdmin}>
            관리자 화면
          </button>
        </footer>
      </div>

      <dialog ref={rulesDialogRef} className="pop-dialog" aria-labelledby={rulesTitleId}>
        <div className="dialog-inner">
          <h2 id={rulesTitleId} className="dialog-title">
            🎲 1분 만에 끝나는 게임 방법!
          </h2>
          <ol className="rules-list">
            <li>
              <strong>우리 모둠은 한 팀!</strong> 경쟁이 아니라 2–6명이 힘을 합쳐 목표 개수의{' '}
              <strong>🔑 탈출 열쇠</strong>를 모으면 전원 탈출 성공!
            </li>
            <li>
              <strong>이동은 순서대로, 미션은 다 같이 실시간!</strong> 내 차례가 아니어도 친구가 도착한 칸의
              취향 투표·텔레파시·PC방 3초 광클을 <strong>모든 팀원 화면에서 동시에</strong> 진행해요.
            </li>
            <li>
              <strong>🌟 황금 명소를 노려라!</strong> 보드 위의 성경 명소 4곳(에덴동산·홍해·여리고·베들레헴)은 성공 시{' '}
              <strong>열쇠 2개</strong>! 팀 공용 <strong>±1 조절권</strong>과 <strong>지하철역</strong>으로
              전략적으로 방문해 보세요!
            </li>
          </ol>
          <form method="dialog" className="dialog-actions">
            <button type="submit" className="primary-cta-btn" autoFocus>
              완벽 이해! 닫기
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
};

