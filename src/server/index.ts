import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { GAME_SETTINGS } from '../shared/gameConfig';
import { RoomManager } from './roomManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || GAME_SETTINGS.defaultAdminPassword;
const authenticatedAdmins = new Set<string>();

const roomManager = new RoomManager((roomCode: string) => {
  const state = roomManager.getRoomState(roomCode);
  if (state) {
    io.to(`room:${roomCode}`).emit('room:state', state);
    io.to(`spectate:${roomCode}`).emit('room:state', state);
  }
  io.to('admins').emit('admin:rooms', roomManager.getAdminSummaries());
});

function leaveJoinedPlayerRooms(socketId: string) {
  const sock = io.sockets.sockets.get(socketId);
  if (!sock) return;
  for (const r of sock.rooms) {
    if (r.startsWith('room:')) {
      sock.leave(r);
    }
  }
}

function leaveSpectateRooms(socketId: string) {
  const sock = io.sockets.sockets.get(socketId);
  if (!sock) return;
  for (const r of sock.rooms) {
    if (r.startsWith('spectate:')) {
      sock.leave(r);
    }
  }
}

io.on('connection', (socket) => {
  // ---------------- 플레이어 방 입장/복구 ----------------
  socket.on('room:create', (payload, ack) => {
    leaveJoinedPlayerRooms(socket.id);
    const res = roomManager.createRoom({
      socketId: socket.id,
      playerId: String(payload?.playerId ?? ''),
      nickname: String(payload?.nickname ?? ''),
      avatarId: String(payload?.avatarId ?? ''),
      password: String(payload?.password ?? ''),
    });
    if (res.ok) {
      socket.join(`room:${res.state.roomCode}`);
    }
    ack?.(res);
  });

  socket.on('room:join', (payload, ack) => {
    leaveJoinedPlayerRooms(socket.id);
    const res = roomManager.joinRoom({
      socketId: socket.id,
      playerId: String(payload?.playerId ?? ''),
      nickname: String(payload?.nickname ?? ''),
      avatarId: String(payload?.avatarId ?? ''),
      roomCode: String(payload?.roomCode ?? ''),
      password: String(payload?.password ?? ''),
    });
    if (res.ok) {
      socket.join(`room:${res.state.roomCode}`);
    }
    ack?.(res);
  });

  socket.on('room:reconnect', (payload, ack) => {
    const res = roomManager.reconnectSession({
      socketId: socket.id,
      roomCode: String(payload?.roomCode ?? ''),
      playerId: String(payload?.playerId ?? ''),
    });
    if (res.ok) {
      leaveJoinedPlayerRooms(socket.id);
      socket.join(`room:${res.state.roomCode}`);
    }
    ack?.(res);
  });

  socket.on('room:leave', (_, ack) => {
    leaveJoinedPlayerRooms(socket.id);
    roomManager.leaveRoom(socket.id);
    ack?.({ ok: true });
  });

  socket.on('room:avatar', (payload) => {
    roomManager.updateAvatar(socket.id, String(payload?.avatarId ?? ''));
  });

  // ---------------- 게임 진행 이벤트 ----------------
  socket.on('game:start', (_, ack) => {
    const res = roomManager.startGame(socket.id);
    ack?.(res);
  });

  socket.on('game:roll', () => {
    roomManager.rollDice(socket.id);
  });

  socket.on('game:confirm_roll', (payload) => {
    const choice = payload?.choice;
    if (choice === 'minus' || choice === 'exact' || choice === 'plus') {
      roomManager.confirmRollChoice(socket.id, choice);
    }
  });

  socket.on('mission:subway', (payload) => {
    const idx = Number(payload?.destinationIndex);
    if (Number.isInteger(idx)) {
      roomManager.selectSubwayDestination(socket.id, idx);
    }
  });

  socket.on('mission:action', (payload) => {
    if (!payload || typeof payload.type !== 'string') return;
    roomManager.handleMissionAction(socket.id, payload);
  });

  socket.on('mission:vote', (payload) => {
    roomManager.submitVote(
      socket.id,
      Number(payload?.optionIndex ?? -1),
      Boolean(payload?.forceFinalize)
    );
  });

  socket.on('mission:complete_talk', () => {
    roomManager.completeEmpathyTalk(socket.id);
  });

  socket.on('mission:next_turn', () => {
    roomManager.closeMissionAndAdvance(socket.id);
  });

  // ---------------- 관리자(Admin) 대시보드 & 실시간 관전 ----------------
  socket.on('admin:auth', (payload, ack) => {
    const pw = String(payload?.password ?? '').trim();
    if (pw !== ADMIN_PASSWORD) {
      ack?.({ ok: false, error: '관리자 비밀번호가 일치하지 않습니다.' });
      return;
    }
    authenticatedAdmins.add(socket.id);
    socket.join('admins');
    ack?.({ ok: true, rooms: roomManager.getAdminSummaries() });
  });

  socket.on('admin:spectate', (payload, ack) => {
    if (!authenticatedAdmins.has(socket.id)) {
      ack?.({ ok: false, error: '관리자 인증이 필요합니다.' });
      return;
    }
    const code = String(payload?.roomCode ?? '').trim().toUpperCase();
    const state = roomManager.getRoomState(code);
    if (!state) {
      ack?.({ ok: false, error: '해당 방을 찾을 수 없습니다.' });
      return;
    }
    leaveSpectateRooms(socket.id);
    socket.join(`spectate:${code}`);
    ack?.({ ok: true, state });
  });

  socket.on('admin:stop_spectate', () => {
    leaveSpectateRooms(socket.id);
  });

  socket.on('disconnect', () => {
    authenticatedAdmins.delete(socket.id);
    roomManager.handleDisconnect(socket.id);
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// 프로덕션 배포 시 빌드된 프론트엔드 정적 서빙 (/admin 등 SPA 라우트 호환)
const clientDistPath = path.resolve(__dirname, '../../dist/client');
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Dev server running. Open Vite port (5173) during development.');
    }
  });
});

const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎲 Board Game Real-Time Server running on http://0.0.0.0:${PORT}`);
});

