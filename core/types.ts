interface 战况目标 {
    玩家名: string;
    武将下标: number;
    气血伤害?: number;
    气血回复?: number;
    精力回复?: number;
    新状态?: Record<string, number>;
    buff?: string[];
}

type 战况事件 = {
    玩家名?: string; // 出招主体
    武将下标?: number; // 出招主体
    // 用于让前端知道人物该用哪个动画
    动画名称: '普通攻击' | '暴击攻击' | '致命攻击' | '攻击未命中' | '反震' | '无双开启' | '无双关闭' | '防御' | '九转丹' | '龙涎露' | '舍命一击' | '力劈华山' | '排山倒海' | '固若金汤' | '凌波微步' | '画地为牢' | '趁火打劫' | '四面楚歌' | '金蝉脱壳' | '暗渡陈仓' | '呼风唤雨' | '妖火燎原' | '五雷轰顶' | '巫蛊极毒' | '毁天灭地' | '招将' | '毒发' | '爆炸' | '木牛流马';
    横幅显示: string; // 用于前端显示
    目标?: 战况目标[]; // 出招目标
    气血伤害?: number;
    气血回复?: number;
    精力回复?: number;
    新状态?: Record<'气血' | '精力' | '最大气血' | '最大精力' | '速度排名', number>; // 出招主体新状态
    buff?: string[]; // 出招主体buff变化
    简要文本: string; // 前端临时使用
}

type 玩家出招 = {
    出招方玩家名: string;
    出招方武将下标: number;
    操作: '攻击';
    接招方玩家名: string;
    接招方武将下标: number;
} | {
    出招方玩家名: string;
    出招方武将下标: number;
    操作: '技能';
    接招方玩家名: string;
    接招方武将下标: number;
    技能: string;
} | {
    出招方玩家名: string;
    出招方武将下标: number;
    操作: '招将';
    招将: number;
} | {
    出招方玩家名: string;
    出招方武将下标: number;
    操作: '物品';
    接招方玩家名: string;
    接招方武将下标: number;
    物品: string;
} | {
    出招方玩家名: string;
    出招方武将下标: number;
    操作: '防御';
}

interface 回合信息 {
    回合数: number;
    红方出招: 玩家出招[];
    黑方出招: 玩家出招[];
    回合初状态: {
        红方: 玩家状态;
        黑方: 玩家状态;
    };
    战况事件序列: 战况事件[];
}

type Buff = {
    名称: string;
    开始回合数: number;
    总回合数: number;
    原效果?: number;
    固若金汤防御?: number;
    固若金汤抗法术?: number;
    巫蛊极毒衰减模式?: '第一回合的50%' | '上一回合的75%';
    毁天灭地溅射伤害?: number;
}

interface 无双状态 {
    无双几率: number;
    是否开启: boolean;
    开启回合数: number;
    本局开启次数: number;
}

interface 武将状态 {
    是红方: boolean;
    武将下标: number; // 下标为-1代表是主将
    角色分类: string;
    气血: number;
    精力: number;
    速度排名: number;
    buff: Buff[];
    无双?: 无双状态;
}

interface 玩家状态 {
    是红方: boolean;
    主将: 武将状态;
    副将列表: (武将状态 | null)[];
    副将死亡列表: number[]
}

type 天赋名称 =
    | '强攻'
    | '舍命'
    | '舍攻'
    | '忽视'
    | '暴击'
    | '合击'
    | '围困'
    | '扰乱'
    | '封锁'
    | '暗渡'
    | '夺命'
    | '风沙'
    | '妖火'
    | '落雷'
    | '毒术'
    | '法爆'
    | '爆率'
    | '反击'
    | '躲避'
    | '致命'
    | '强血';

type 技能名称 =
    | '舍命一击'
    | '力劈华山'
    | '排山倒海'
    | '固若金汤'
    | '凌波微步'
    | '画地为牢'
    | '趁火打劫'
    | '四面楚歌'
    | '金蝉脱壳'
    | '暗渡陈仓'
    | '呼风唤雨'
    | '妖火燎原'
    | '五雷轰顶'
    | '巫蛊极毒'
    | '毁天灭地';

type 技能效果 = {
    当前效果: number;
    目标个数?: number;
    持续回合数?: number;
    是神将技?: boolean;
    气血消耗?: number;
    精力消耗?: number;
    力劈华山固定伤害?: number;
    排山倒海固定伤害?: number;
    固若金汤防御?: number;
    固若金汤抗法术?: number;
    巫蛊极毒衰减模式?: '第一回合的50%' | '上一回合的75%';
    毁天灭地溅射伤害?: number;
}

type 无双效果 = {
    无双效果: number;
}

type 双击失神无双效果 = {
    双击几率: number;
    失神几率: number;
}

interface 武将属性 {
    风格: string;
    角色分类: string;
    气血: number;
    精力: number;
    攻击: number;
    防御: number;
    速度: number;
    命中率: number;
    暴击率: number;
    反击率: number;
    致命率: number;
    法爆率: number;
    反震率: number;
    躲避率: number;
    抗物理: number;
    抗玄击: number;
    抗封锁: number;
    抗扰乱: number;
    抗围困: number;
    抗风沙: number;
    抗妖火: number;
    抗毒术: number;
    抗落雷: number;
    暴击力: number;
    穿透率: number;
    爆伤力: number;
    法伤力: number;
    连击率: number;
    连击数: number;
    法穿率: number;
    技能效果: Record<技能名称, 技能效果>;
    天赋效果: Record<天赋名称, number>;
    无双属性?: {
        气血: number;
        精力: number;
        攻击: number;
        速度: number;
    };
    无双技能?: 无双效果 | 双击失神无双效果,
    坐骑效果?: Record<string, number>;
}

interface 玩家属性 {
    主将: 武将属性;
    副将列表: 武将属性[];
}

interface 帮派能力 {
    主抗性: string;
    副抗性: string;
}

interface 技能 {
    名称: string;
    等级: string;
    熟练度: number;
}

interface 天赋 {
    名称: string;
    等级: number;
}

interface 坐骑 {
    种类: string;
    转数: number;
    等级: number;
}

interface 宝石 {
    属性: string;
    数值: number;
}

interface 装备项 {
    名称: string;
    词条: string | null;
    宝石: 宝石[];
}

interface 装备 {
    头盔: 装备项;
    项饰: 装备项;
    武器: 装备项;
    护腕: 装备项;
    铠甲: 装备项;
    战靴: 装备项;
}

interface 四维分配 {
    体质: number;
    智力: number;
    力量: number;
    敏捷: number;
}

interface 主将配置 {
    职业经历: string[];
    转数: number;
    等级: number;
    属性分配: 四维分配;
    装备: 装备;
    坐骑: 坐骑;
    天赋: 天赋[];
    技能: 技能[];
    帮派: 帮派能力;
}

interface 副将配置 {
    头衔: string;
    人物: string;
    星级: number;
    真: boolean;
    无双等级: number;
    默契度: number;
    职业经历: string[];
    转数: number;
    等级: number;
    属性分配: 四维分配;
    宝石: 宝石[];
    天赋: 天赋[];
    技能: 技能[];
    神将技: string;
}

interface 玩家配置 {
    主将: 主将配置;
    副将列表: 副将配置[];
    副将上阵顺序: number[];
}

interface 玩家信息 {
    用户名: string;
    配置: 玩家配置;
    属性: 玩家属性;
    状态: 玩家状态;
}

interface 战局描述 {
    id: string;
    红方用户名: string;
    黑方用户名: string;
    状态: '等待中' | '战局中' | '已结束';
    当前回合: number;
    战胜方玩家名称: string | null;
    结束原因?: string;
    结束时间?: string;
}

export interface 战局 {
    战局描述: 战局描述;
    红方: 玩家信息;
    黑方: 玩家信息;
    回合信息: 回合信息[];
}
