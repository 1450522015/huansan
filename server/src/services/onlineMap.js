const { v4: uuidv4 } = require('uuid');

const loginUsers = new Map();
const onlineUsers = new Map();
const tokenMap = new Map();

function login(username, password, userRepo) {
  if (!userRepo.verifyPassword(username, password)) {
    return { success: false, reason: '用户名或密码错误' };
  }

  const user = userRepo.findByUsername(username);
  const config = userRepo.getConfig(username);

  const token = uuidv4();
  const existingToken = [...tokenMap.entries()].find(([, u]) => u === username);
  if (existingToken) {
    tokenMap.delete(existingToken[0]);
  }
  tokenMap.set(token, username);

  loginUsers.set(username, {
    用户名: username,
    密码: password,
    转数: user.转数,
    等级: user.等级,
    职业串: user.职业串,
    坐骑名: user.坐骑名,
    配置: config,
  });

  return { success: true, token };
}

function connect(token, battleContexts, engine) {
  const username = tokenMap.get(token);
  if (!username) return { success: false, reason: 'token无效' };

  const userInfo = loginUsers.get(username);
  if (!userInfo) return { success: false, reason: '用户未登录' };

  let pkPush = null;
  if (battleContexts && battleContexts.length > 0) {
    const ctx = battleContexts.find(c =>
      c.战局.战局描述.红方用户名 === username || c.战局.战局描述.黑方用户名 === username
    );
    if (ctx) {
      const roundData = engine.当前回合数据(ctx.战局);
      const isRed = ctx.战局.战局描述.红方用户名 === username;
      const 已出招 = ctx.战局.战局描述.状态 === '已结束'
        ? false
        : (isRed ? ctx.红方出招 !== null : ctx.黑方出招 !== null);
      pkPush = { success: true, 战局: roundData, 已出招 };
    }
  }

  return { success: true, userInfo, pkPush };
}

function addOnlineUser(socketId, userInfo) {
  onlineUsers.set(socketId, {
    用户名: userInfo.用户名,
    转数: userInfo.转数,
    等级: userInfo.等级,
    职业串: userInfo.职业串,
    坐骑名: userInfo.坐骑名,
    战斗状态: '空闲',
    ping时间: Date.now(),
  });
}

function handlePing(socketId) {
  const user = onlineUsers.get(socketId);
  if (user) {
    user.ping时间 = Date.now();
  }
}

function handleLogout(socketId) {
  const user = onlineUsers.get(socketId);
  if (user) {
    const username = user.用户名;
    onlineUsers.delete(socketId);
    const entries = [...tokenMap.entries()].find(([, u]) => u === username);
    if (entries) {
      tokenMap.delete(entries[0]);
    }
    loginUsers.delete(username);
    return username;
  }
  return null;
}

function removeOnlineUser(socketId) {
  const user = onlineUsers.get(socketId);
  if (user) {
    onlineUsers.delete(socketId);
    return user.用户名;
  }
  return null;
}

function getOnlineList() {
  const list = [];
  for (const user of onlineUsers.values()) {
    list.push({
      用户名: user.用户名,
      转数: user.转数,
      等级: user.等级,
      职业串: user.职业串,
      坐骑名: user.坐骑名,
      战斗状态: user.战斗状态,
    });
  }
  return list;
}

function getUserBySocketId(socketId) {
  return onlineUsers.get(socketId) || null;
}

function getUsernameByToken(token) {
  return tokenMap.get(token) || null;
}

function heartbeat(io) {
  const now = Date.now();
  let changed = false;
  for (const [socketId, user] of onlineUsers) {
    if (now - user.ping时间 > 10000) {
      onlineUsers.delete(socketId);
      changed = true;
    }
  }
  if (changed) {
    io.emit('online-user-push', getOnlineList());
  }
}

module.exports = {
  loginUsers,
  onlineUsers,
  tokenMap,
  login,
  connect,
  addOnlineUser,
  handlePing,
  handleLogout,
  removeOnlineUser,
  getOnlineList,
  getUserBySocketId,
  getUsernameByToken,
  heartbeat,
};