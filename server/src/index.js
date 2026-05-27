require('module-alias/register');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const userRepo = require('#/repositories/userRepo');
const battleRepo = require('#/repositories/battleRepo');
const onlineMap = require('#/services/onlineMap');
const createBattleService = require('#/services/battleService');

async function main() {
  const engine = await import('../../core/engine.js');
  const bot = await import('../../core/bot.js');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:5173' },
  });

  const battleService = createBattleService({ engine, bot, onlineMap, battleRepo, userRepo, io });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.json({ success: false, reason: '参数不完整' });
      return;
    }
    const result = onlineMap.login(username, password, userRepo);
    res.json(result);
  });

  app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.json({ success: false, reason: '参数不完整' });
      return;
    }
    const success = userRepo.register(username, password);
    res.json({ success });
  });

  app.get('/api/user/config', (req, res) => {
    const token = req.query.token;
    if (!token) {
      res.json({ success: false, reason: '缺少token' });
      return;
    }
    const username = onlineMap.getUsernameByToken(token);
    if (!username) {
      res.json({ success: false, reason: 'token无效' });
      return;
    }
    const config = userRepo.getConfig(username);
    res.json({ success: true, config });
  });

  io.on('connection', (socket) => {
    const token = socket.handshake.auth.token;
    console.log('[server] 新连接, socketId=', socket.id, 'token=', token ? token.slice(0,8)+'...' : null);
    if (!token) {
      console.log('[server] 拒绝: 无 token');
      socket.disconnect();
      return;
    }

    const result = onlineMap.connect(token, battleService.battleContexts, engine);
    console.log('[server] connect结果:', result.success ? '成功:'+result.userInfo.用户名 : '失败:'+result.reason);
    if (!result.success) {
      socket.disconnect();
      return;
    }

    onlineMap.addOnlineUser(socket.id, result.userInfo);
    console.log('[server] 当前在线:', onlineMap.getOnlineList().map(u=>u.用户名));
    io.emit('online-user-push', onlineMap.getOnlineList());

    if (result.pkPush) {
      socket.emit('pk-push', result.pkPush);
    }

    socket.on('ping', () => {
      onlineMap.handlePing(socket.id);
      socket.emit('pong');
    });

    socket.on('login-exit', () => {
      onlineMap.handleLogout(socket.id);
      io.emit('online-user-push', onlineMap.getOnlineList());
    });

    socket.on('pk-request', (data) => {
      battleService.handlePkRequest(socket.id, data);
    });

    socket.on('pk-agree', (data) => {
      battleService.handlePkAgree(socket.id, data);
    });

    socket.on('pk-plan', (data) => {
      battleService.handlePkPlan(socket.id, data);
    });

    socket.on('online-user-pull', () => {
      socket.emit('online-user-push', onlineMap.getOnlineList());
    });

    socket.on('disconnect', () => {
      const username = onlineMap.removeOnlineUser(socket.id);
      console.log('[server] 断开连接:', username);
      io.emit('online-user-push', onlineMap.getOnlineList());
    });
  });

  setInterval(() => {
    onlineMap.heartbeat(io);
  }, 5000);

  battleService.startPolling();

  httpServer.listen(3001, () => {
    console.log('Server running on port 3001');
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});