# 03 · 共享规则与代码对照

[← 返回索引](./README.md)

---

## 3.1 为什么要有 `common/gameCatalog.js`

手游与后端 **必须使用同一套规则**：

- 装备名称与固定数值是否一致  
- 属性点上限、风格判定是否一致  
- `normalizeConfigDeep` 是否与表单/导入 JSON 一致  

若分别在 `mobile` 与 `nodejs` 各写一份，极易 **漂移**。因此将 **可共享、无环境依赖** 的逻辑集中到仓库根目录：

**[`common/gameCatalog.js`](../../common/gameCatalog.js)**

它承担三类职责：

1. **静态表**：装备列表、坐骑名、宝石可用属性、天赋分段、固定四技能等。  
2. **规范化**：`getDefaultConfig`、`normalizeConfigDeep`、`normalize装备槽` 等，保证读写数据库的配置结构统一。  
3. **纯计算**：`修正属性分配`、`空闲点`、`计算风格`、`天赋百分比`、`解析装备格`、`解析装备格汇总`（部位固定属性 + 该部位三槽宝石按属性名相加）、`坐骑战斗加成`、`坐骑战斗阶段占位`（战斗回合预留文案，不进面板合并）、`帮派战斗加成`、`职业原始战斗属性(轴, 是否主将)`、`副将默契战斗加成` 等（不含 HTTP、不含数据库）。

---

## 3.2 本文档目录与代码的分工

| 内容 | 人类阅读（推荐） | 机器执行（源码） |
|------|------------------|------------------|
| 装备有哪些、数值多少 | [05-gear-mount-gems-skills.md](./05-gear-mount-gems-skills.md) | `解析装备格`、`解析装备格汇总`、武器表、铠甲表、头盔配置等 |
| 天赋分段曲线 | [06-talents-skill-mastery.md](./06-talents-skill-mastery.md) | `天赋段`、`天赋百分比` |
| 属性点与风格 | [07-stats-style.md](./07-stats-style.md) | `等级总点`、`修正属性分配`、`计算风格` |
| 配置 JSON 长什么样 | [04-config-schema.md](./04-config-schema.md) | `getDefaultConfig`、`normalizeConfigDeep` |
| 服务端如何汇总战斗属性 | [08-battle-attrs.md](./08-battle-attrs.md) | `common/attrCalculator.js` |
| 主将帮派抗性、副将默契等 | [14-main-hero.md](./14-main-hero.md)、[15-deputy.md](./15-deputy.md) | `帮派战斗加成`、`副将默契战斗加成`（由 `attrCalculator` 合并） |

**原则**：

- **策划改表**：先更新 `docs/项目介绍` 中对应章节，再改 `gameCatalog.js`（及必要的 `attrCalculator.js`）。  
- **Code Review**：若只改 JS 未改文档，应要求补文档或至少在 PR 说明里写「文档待补」。  
- **读者**：策划、测试、新人 **优先读 Markdown**；开发调试可对照 `gameCatalog.js` 单行注释与导出函数名。

---

## 3.3 不在 `gameCatalog.js` 里的逻辑

- **`common/attrCalculator.js`**：战斗属性汇总（依赖 `gameCatalog` 的表与纯函数）；与 `gameCatalog` 分文件便于替换公式。  
- **因依赖运行时或策略，保留在 Node 服务内**：JWT 校验、用户查找、bcrypt；Express 路由、限流、Socket 事件；管理端 `PATCH` 密码等业务流程。  

---

## 3.4 相关文档

- [04-config-schema.md](./04-config-schema.md)  
- [05-gear-mount-gems-skills.md](./05-gear-mount-gems-skills.md)  
- [02-repo-layout.md](./02-repo-layout.md)

