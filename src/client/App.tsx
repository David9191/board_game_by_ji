import React, { useCallback, useEffect, useState } from 'react';
import type { RoomState } from '../shared/types';
import { AdminDashboard } from './components/AdminDashboard';
import { EndingScreen } from './components/EndingScreen';
import { GameBoard } from './components/GameBoard';
import { LobbyScreen } from './components/LobbyScreen';
import { WaitingRoom } from './components/WaitingRoom';
import { getOrCreatePlayerId, getSavedSession, saveSessionProfile, socket } from './socket';
import { sfx } from './sound';

export const App: React.FC = () => {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  );
  const [myPlayerId] = useState<string>(() => getOrCreatePlayerId());
  const [saved] = useState(() => getSavedSession());
  const [queryRoomCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('room') ?? '';
  });

  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => sfx.isEnabled());

  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setIsAdminRoute(path.startsWith('/admin'));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // 실시간 방 상태 수신 및 재접속 자동 복구
  useEffect(() => {
    if (isAdminRoute) return;

    const tryReconnect = () => {
      const currentSaved = getSavedSession();
      if (!currentSaved.roomCode) return;
      socket.emit(
        'room:reconnect',
        { roomCode: currentSaved.roomCode, playerId: myPlayerId },
        (res: { ok: boolean; state?: RoomState }) => {
          if (res.ok && res.state) {
            setRoom(res.state);
            setErrorMsg(null);
          } else {
            saveSessionProfile(currentSaved.nickname, currentSaved.avatarId, null);
          }
        }
      );
    };

    if (socket.connected) {
      tryReconnect();
    }

    const onRoomState = (nextState: RoomState) => {
      setRoom(nextState);
    };

    socket.on('connect', tryReconnect);
    socket.on('room:state', onRoomState);

    return () => {
      socket.off('connect', tryReconnect);
      socket.off('room:state', onRoomState);
    };
  }, [isAdminRoute, myPlayerId]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    sfx.setEnabled(next);
    setSoundOn(next);
    if (next) sfx.playTap();
  }, [soundOn]);

  const handleCreateRoom = (nickname: string, avatarId: string, password: string) => {
    setBusy(true);
    setErrorMsg(null);
    socket.emit(
      'room:create',
      { playerId: myPlayerId, nickname, avatarId, password },
      (res: { ok: boolean; state?: RoomState; error?: string }) => {
        setBusy(false);
        if (res.ok && res.state) {
          saveSessionProfile(nickname, avatarId, res.state.roomCode);
          setRoom(res.state);
        } else {
          setErrorMsg(res.error ?? '방 생성에 실패했습니다.');
        }
      }
    );
  };

  const handleJoinRoom = (nickname: string, avatarId: string, roomCode: string, password: string) => {
    setBusy(true);
    setErrorMsg(null);
    socket.emit(
      'room:join',
      { playerId: myPlayerId, nickname, avatarId, roomCode, password },
      (res: { ok: boolean; state?: RoomState; error?: string }) => {
        setBusy(false);
        if (res.ok && res.state) {
          saveSessionProfile(nickname, avatarId, res.state.roomCode);
          setRoom(res.state);
        } else {
          setErrorMsg(res.error ?? '방 입장에 실패했습니다.');
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    sfx.playTap();
    socket.emit('room:leave', {}, () => {
      const cur = getSavedSession();
      saveSessionProfile(cur.nickname, cur.avatarId, null);
      setRoom(null);
    });
  };

  if (isAdminRoute) {
    return (
      <AdminDashboard
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onBackHome={() => navigateTo('/')}
      />
    );
  }

  if (!room) {
    return (
      <LobbyScreen
        initialNickname={saved.nickname}
        initialAvatarId={saved.avatarId}
        initialRoomCode={queryRoomCode}
        errorMsg={errorMsg}
        busy={busy}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onGoAdmin={() => navigateTo('/admin')}
      />
    );
  }

  if (room.status === 'waiting') {
    return (
      <WaitingRoom
        room={room}
        myPlayerId={myPlayerId}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onChangeAvatar={(avatarId) => socket.emit('room:avatar', { avatarId })}
        onStartGame={() => {
          socket.emit('game:start', {}, (res: { ok: boolean; error?: string }) => {
            if (!res.ok && res.error) setErrorMsg(res.error);
          });
        }}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (room.status === 'cleared') {
    return (
      <EndingScreen
        room={room}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExitToLobby={handleLeaveRoom}
      />
    );
  }

  return (
    <GameBoard 
      room={room}
      myPlayerId={myPlayerId}
      soundOn={soundOn}
      onToggleSound={toggleSound}
      onRollDice={() => socket.emit('game:roll')}
      onConfirmRoll={(choice) => socket.emit('game:confirm_roll', { choice })}
      onSubwaySelect={(destinationIndex) => socket.emit('mission:subway', { destinationIndex })}
      onMissionAction={(payload) => socket.emit('mission:action', payload)}
      onMissionVote={(optionIndex, forceFinalize) =>
        socket.emit('mission:vote', { optionIndex, forceFinalize })
      }
      onCompleteTalk={() => socket.emit('mission:complete_talk')}
      onNextTurn={() => socket.emit('mission:next_turn')}
      onExit={handleLeaveRoom}
    />
  );
};

