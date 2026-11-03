import { io, type Socket } from 'socket.io-client';

const PLAYER_ID_KEY = 'bg_player_id';
const ROOM_CODE_KEY = 'bg_room_code';
const NICKNAME_KEY = 'bg_nickname';
const AVATAR_KEY = 'bg_avatar_id';

export const socket: Socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
});

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getSavedSession(): {
  roomCode: string | null;
  nickname: string;
  avatarId: string;
} {
  return {
    roomCode: localStorage.getItem(ROOM_CODE_KEY),
    nickname: localStorage.getItem(NICKNAME_KEY) ?? '',
    avatarId: localStorage.getItem(AVATAR_KEY) ?? 'fox',
  };
}

export function saveSessionProfile(nickname: string, avatarId: string, roomCode?: string | null): void {
  localStorage.setItem(NICKNAME_KEY, nickname);
  localStorage.setItem(AVATAR_KEY, avatarId);
  if (roomCode !== undefined) {
    if (roomCode) {
      localStorage.setItem(ROOM_CODE_KEY, roomCode);
    } else {
      localStorage.removeItem(ROOM_CODE_KEY);
    }
  }
}

