const { v4: uuidv4 } = require('uuid');

module.exports = function createBattleService(deps) {
  const { engine, bot, onlineMap, battleRepo, userRepo, io } = deps;

  const battleContexts = [];

  function getContextBySocketId(socketId) {
    const user = onlineMap.getUserBySocketId(socketId);
    if (!user) return null;
    const ctx = battleContexts.find(c =>
      c.战局.战局描述.红方用户名 === user.用户名 || c.战局.战局描述.黑方用户名 === user.用户名
    );
    return ctx;
  }

  function getContextByUsername(username) {
    return battleContexts.find(c =>
      c.战局.战局描述.红方用户名 === username || c.战局.战局描述.黑方用户名 === username
    );
  }

  function destroyContext(ctx, reason) {
    ctx.战局.战局描述.状态 = '已结束';
    ctx.战局.战局描述.结束原因 = reason || '异常结束';
    ctx.战局.战局描述.结束时间 = new Date().toISOString();
    battleRepo.save(ctx.战局.战局描述.id, ctx.战局);

    const idx = battleContexts.indexOf(ctx);
    if (idx !== -1) battleContexts.splice(idx, 1);
  }

  function setBothFree(ctx) {
    for (const [sid, user] of onlineMap.onlineUsers) {
      if (user.用户名 === ctx.战局.战局描述.红方用户名 || user.用户名 === ctx.战局.战局描述.黑方用户名) {
        user.战斗状态 = '空闲';
      }
    }
    io.emit('online-user-push', onlineMap.getOnlineList());
  }

  function setRedFree(ctx) {
    for (const [sid, user] of onlineMap.onlineUsers) {
      if (user.用户名 === ctx.战局.战局描述.红方用户名) {
        user.战斗状态 = '空闲';
      }
    }
    io.emit('online-user-push', onlineMap.getOnlineList());
  }

  function sendRoundToBoth(ctx) {
    const roundData = engine.当前回合数据(ctx.战局);
    const redSocketId = findSocketIdByUsername(ctx.战局.战局描述.红方用户名);
    const blackSocketId = findSocketIdByUsername(ctx.战局.战局描述.黑方用户名);
    if (redSocketId) io.to(redSocketId).emit('pk-push', { success: true, 战局: roundData, 已出招: false });
    if (blackSocketId) io.to(blackSocketId).emit('pk-push', { success: true, 战局: roundData, 已出招: false });
  }

  function sendRoundToRed(ctx) {
    const roundData = engine.当前回合数据(ctx.战局);
    const redSocketId = findSocketIdByUsername(ctx.战局.战局描述.红方用户名);
    if (redSocketId) io.to(redSocketId).emit('pk-push', { success: true, 战局: roundData, 已出招: false });
  }

  function findSocketIdByUsername(username) {
    for (const [socketId, user] of onlineMap.onlineUsers) {
      if (user.用户名 === username) return socketId;
    }
    return null;
  }

  function handlePkRequest(socketId, data) {
    console.log('[battleService] 收到 pk-request:', { socketId, data });
    const inviter = onlineMap.getUserBySocketId(socketId);
    console.log('[battleService] 邀请者信息:', inviter);
    if (!inviter) return;

    const targetUsername = data.目标用户名;
    const targetSocketId = findSocketIdByUsername(targetUsername);
    const target = targetSocketId ? onlineMap.getUserBySocketId(targetSocketId) : null;
    console.log('[battleService] 目标用户信息:', { targetUsername, targetSocketId, target });

    if (inviter.战斗状态 !== '空闲') {
      io.to(socketId).emit('pk-push', { success: false, 原因: '您的状态不可发起PK' });
      return;
    }
    if (!target || target.战斗状态 !== '空闲') {
      io.to(socketId).emit('pk-push', { success: false, 原因: '对方正在战斗中' });
      return;
    }

    const inviterInfo = onlineMap.loginUsers.get(inviter.用户名);
    console.log('[battleService] 发送 pk-invite-push 到:', targetSocketId);
    io.to(targetSocketId).emit('pk-invite-push', {
      邀请者用户名: inviter.用户名,
      邀请者转数: inviter.转数,
      邀请者等级: inviter.等级,
      邀请者职业串: inviter.职业串,
      邀请者坐骑名: inviter.坐骑名,
    });
  }

  function handlePkAgree(socketId, data) {
    const target = onlineMap.getUserBySocketId(socketId);
    if (!target) return;

    const inviterUsername = data.邀请者用户名;
    const inviterSocketId = findSocketIdByUsername(inviterUsername);
    const inviter = inviterSocketId ? onlineMap.getUserBySocketId(inviterSocketId) : null;

    if (!inviter || inviter.战斗状态 !== '空闲' || target.战斗状态 !== '空闲') {
      io.to(socketId).emit('pk-push', { success: false, 原因: '对方状态已变更，无法开始战局' });
      return;
    }

    const redConfig = userRepo.getConfig(inviterUsername);
    const blackConfig = userRepo.getConfig(target.用户名);
    if (!redConfig || !blackConfig) {
      io.to(socketId).emit('pk-push', { success: false, 原因: '配置读取失败' });
      return;
    }

    const battleId = uuidv4();
    const battle = engine.初始化(battleId, inviterUsername, redConfig, target.用户名, blackConfig);

    battleRepo.save(battleId, battle);

    const ctx = {
      战局: battle,
      红方出招: null,
      黑方出招: null,
      出招计时: Date.now() + 9999000,
      连续断连次数: 0,
      人机类型: null,
    };
    battleContexts.push(ctx);

    inviter.战斗状态 = '战局中';
    target.战斗状态 = '战局中';
    io.emit('online-user-push', onlineMap.getOnlineList());

    const roundData = engine.当前回合数据(battle);
    if (inviterSocketId) io.to(inviterSocketId).emit('pk-push', { success: true, 战局: roundData, 已出招: false });
    if (socketId) io.to(socketId).emit('pk-push', { success: true, 战局: roundData, 已出招: false });
  }

  function handlePkPlan(socketId, data) {
    const ctx = getContextBySocketId(socketId);
    if (!ctx) return;

    const user = onlineMap.getUserBySocketId(socketId);
    if (ctx.战局.战局描述.红方用户名 === user.用户名) {
      ctx.红方出招 = data.出招数据;
    } else {
      ctx.黑方出招 = data.出招数据;
    }
  }

  function poll() {
    for (let i = battleContexts.length - 1; i >= 0; i--) {
      const ctx = battleContexts[i];

      if (ctx.人机类型) {
        const redOnline = findSocketIdByUsername(ctx.战局.战局描述.红方用户名) !== null;
        if (!redOnline) {
          ctx.连续断连次数++;
        } else {
          ctx.连续断连次数 = 0;
        }

        if (ctx.连续断连次数 >= 10) {
          destroyContext(ctx, '红方断连超时');
          setRedFree(ctx);
          continue;
        }

        if (ctx.红方出招 !== null || Date.now() > ctx.出招计时) {
          const blackPlan = bot.出招(ctx.战局, ctx.红方出招, ctx.人机类型);
          ctx.战局 = engine.结算(ctx.战局, ctx.红方出招, blackPlan);
          ctx.红方出招 = null;
          ctx.黑方出招 = null;
          ctx.出招计时 = Date.now() + 9999000;

          sendRoundToRed(ctx);

          if (ctx.战局.战局描述.状态 === '已结束') {
            destroyContext(ctx, ctx.战局.战局描述.结束原因);
            setRedFree(ctx);
          }
        }
      } else {
        const redOnline = findSocketIdByUsername(ctx.战局.战局描述.红方用户名) !== null;
        const blackOnline = findSocketIdByUsername(ctx.战局.战局描述.黑方用户名) !== null;

        if (!redOnline && !blackOnline) {
          ctx.连续断连次数++;
        } else {
          ctx.连续断连次数 = 0;
        }

        if (ctx.连续断连次数 >= 10) {
          destroyContext(ctx, '双方断连超时');
          setBothFree(ctx);
          continue;
        }

        if ((ctx.红方出招 !== null && ctx.黑方出招 !== null) || Date.now() > ctx.出招计时) {
          ctx.战局 = engine.结算(ctx.战局, ctx.红方出招, ctx.黑方出招);
          ctx.红方出招 = null;
          ctx.黑方出招 = null;
          ctx.出招计时 = Date.now() + 9999000;

          sendRoundToBoth(ctx);

          if (ctx.战局.战局描述.状态 === '已结束') {
            destroyContext(ctx, ctx.战局.战局描述.结束原因);
            setBothFree(ctx);
          }
        }
      }
    }
  }

  function startPolling() {
    setInterval(poll, 1000);
  }

  return {
    battleContexts,
    handlePkRequest,
    handlePkAgree,
    handlePkPlan,
    startPolling,
  };
};