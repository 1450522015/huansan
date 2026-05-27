const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../huansan.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    转数 INTEGER DEFAULT 0,
    等级 INTEGER DEFAULT 1,
    职业串 TEXT DEFAULT '',
    坐骑名 TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    config_json TEXT NOT NULL
  );
`);

const defaultConfig = {
  主将: {
    职业经历: ['平民'],
    转数: 0,
    等级: 1,
    属性分配: { 体质: 5, 智力: 5, 力量: 5, 敏捷: 5 },
    装备: {
      头盔: { 名称: '布帽', 词条: null, 宝石: [] },
      项饰: { 名称: '布链', 词条: null, 宝石: [] },
      武器: { 名称: '木剑', 词条: null, 宝石: [] },
      护腕: { 名称: '布腕', 词条: null, 宝石: [] },
      铠甲: { 名称: '布衣', 词条: null, 宝石: [] },
      战靴: { 名称: '布鞋', 词条: null, 宝石: [] }
    },
    坐骑: { 种类: '无', 转数: 0, 等级: 0 },
    天赋: [],
    技能: [],
    帮派: { 主抗性: '无', 副抗性: '无' }
  },
  副将列表: [],
  副将上阵顺序: []
};

function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function register(username, password, config) {
  const cfg = config || defaultConfig;
  const insertUser = db.prepare('INSERT INTO users (username, password, 转数, 等级, 职业串, 坐骑名) VALUES (?, ?, ?, ?, ?, ?)');
  const insertConfig = db.prepare('INSERT INTO configs (username, config_json) VALUES (?, ?)');

  const 职业串 = cfg.主将.职业经历.join(',');
  const 坐骑名 = cfg.主将.坐骑.种类;

  const tx = db.transaction(() => {
    insertUser.run(username, password, cfg.主将.转数, cfg.主将.等级, 职业串, 坐骑名);
    insertConfig.run(username, JSON.stringify(cfg));
  });

  try {
    tx();
    return true;
  } catch (e) {
    return false;
  }
}

function verifyPassword(username, password) {
  const user = findByUsername(username);
  if (!user) return false;
  return user.password === password;
}

function getConfig(username) {
  const row = db.prepare('SELECT config_json FROM configs WHERE username = ?').get(username);
  if (!row) return null;
  return JSON.parse(row.config_json);
}

module.exports = { findByUsername, register, verifyPassword, getConfig };