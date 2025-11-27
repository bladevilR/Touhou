
import { CharacterConfig, CharacterId, Weapon, Projectile, Vector2, PlayerStats, WeaponUpgradeChoice } from './types';

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const MAP_WIDTH = 7500;
export const MAP_HEIGHT = 7500;
export const FPS = 60;
export const GAME_SPEED = 2.0; // 2x Game Speed requested

// --- Characters ---
export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  [CharacterId.REIMU]: {
    id: CharacterId.REIMU,
    name: '博丽灵梦',
    title: '乐园的巫女',
    description: '新手向。高防御与幸运。符札自动索敌，容错率极高。',
    color: '#e74c3c',
    startingWeaponId: 'homing_amulet',
    stats: {
      maxHp: 100, hp: 100, speed: 3.5, might: 1.0, area: 1.0, cooldown: 1.0,
      pickupRange: 130, luck: 1.2, armor: 1, recovery: 0, revivals: 0
    }
  },
  [CharacterId.MOKOU]: {
    id: CharacterId.MOKOU,
    name: '藤原妹红',
    title: '蓬莱人形',
    description: '狂战士。复活能力，血量越低伤害越高。',
    color: '#ecf0f1',
    startingWeaponId: 'fire_bird',
    stats: {
      maxHp: 130, hp: 130, speed: 3.5, might: 1.1, area: 1.0, cooldown: 1.0,
      pickupRange: 100, luck: 1.0, armor: 0, recovery: -0.5, revivals: 1
    }
  },
  [CharacterId.MARISA]: {
    id: CharacterId.MARISA,
    name: '雾雨魔理沙',
    title: '普通的魔法使',
    description: '玻璃大炮。超高移速与拾取，擅长直线地图炮。',
    color: '#f1c40f',
    startingWeaponId: 'star_dust',
    stats: {
      maxHp: 80, hp: 80, speed: 4.5, might: 1.2, area: 1.0, cooldown: 0.9,
      pickupRange: 150, luck: 1.0, armor: 0, recovery: 0, revivals: 0
    }
  },
  [CharacterId.SAKUYA]: {
    id: CharacterId.SAKUYA,
    name: '十六夜咲夜',
    title: '完美潇洒的女仆',
    description: '控制与暴击。飞刀反弹，且拥有时停能力。',
    color: '#3498db',
    startingWeaponId: 'knives',
    stats: {
      maxHp: 100, hp: 100, speed: 4.0, might: 1.0, area: 1.1, cooldown: 1.0,
      pickupRange: 120, luck: 1.0, armor: 0, recovery: 0, revivals: 0
    }
  },
  [CharacterId.YUMA]: {
    id: CharacterId.YUMA,
    name: '饕餮尤魔',
    title: '刚欲同盟长',
    description: '坦克吸血。护甲极高，攻击附带吸血，拥有黑洞聚怪。',
    color: '#8e44ad',
    startingWeaponId: 'spoon',
    stats: {
      maxHp: 150, hp: 150, speed: 3.0, might: 1.0, area: 1.0, cooldown: 1.0,
      pickupRange: 100, luck: 1.0, armor: 3, recovery: 1, revivals: 0
    }
  },
  [CharacterId.KOISHI]: {
    id: CharacterId.KOISHI,
    name: '古明地恋',
    title: '紧闭的恋之瞳',
    description: '随机性与隐身。技能位置不可控，但威力巨大。',
    color: '#2ecc71',
    startingWeaponId: 'mines',
    stats: {
      maxHp: 90, hp: 90, speed: 4.0, might: 1.0, area: 1.2, cooldown: 1.0,
      pickupRange: 100, luck: 1.5, armor: 0, recovery: 0, revivals: 0
    }
  }
};

// --- Weapons Logic ---
const createProj = (pos: Vector2, vel: Vector2, damage: number, duration: number, color: string, radius: number): Projectile => ({
  id: Math.random().toString(36).substr(2, 9),
  position: { ...pos },
  velocity: vel,
  radius,
  color,
  damage,
  duration,
  maxDuration: duration,
  penetration: 1,
  knockback: 2
});

export const WEAPON_DEFS: Record<string, Omit<Weapon, 'level' | 'cooldownTimer'>> = {
  // --- Reimu Weapons ---
  'homing_amulet': {
    id: 'homing_amulet', name: '梦想封印·散', description: '发射追踪灵符。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 8, cooldownMax: 60, baseDamage: 12, type: 'projectile',
    onFire: (source, target, stats) => {
      const ps = [];
      for (let i = -1; i <= 1; i++) ps.push({ ...createProj(source, {x: i*2, y: -5}, 12*stats.might, 120, '#e74c3c', 8), homingStrength: 0.1 });
      return ps;
    }
  },
  'yin_yang_orb': {
    id: 'yin_yang_orb', name: '阴阳玉大弹', description: '投掷受重力影响的巨大阴阳玉。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 8, cooldownMax: 100, baseDamage: 40, type: 'projectile',
    onFire: (source, target, stats) => [{ ...createProj(source, {x: (Math.random()-0.5)*8, y: -8}, 40*stats.might, 200, '#fff', 20), penetration: 100, knockback: 10, sprite: '☯️' }]
  },
  'boundary': {
    id: 'boundary', name: '二重结界', description: '生成击退敌人的护盾。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 8, cooldownMax: 120, baseDamage: 5, type: 'aura',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0,y:0}, 5*stats.might, 60, 'rgba(231, 76, 60, 0.3)', 80), penetration: 999, knockback: 15 }]
  },

  // --- Mokou Weapons ---
  'fire_bird': {
    id: 'fire_bird', name: '火鸟风月', description: '发射穿透火鸟。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 80, baseDamage: 20, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj(source, {x:dir.x*8, y:dir.y*8}, 20*stats.might, 100, '#e67e22', 15), penetration: 5, sprite: '🦅' }];
    }
  },
  'kick': {
    id: 'kick', name: '凯风快晴飞翔蹴', description: '【空格】飞向鼠标位置造成范围伤害。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 300, baseDamage: 80, type: 'dash',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0, y:0}, 80*stats.might, 20, '#e67e22', 40), penetration: 999, knockback: 20 }] // 主动技能，由空格键触发
  },
  'phoenix_wings': {
    id: 'phoenix_wings', name: '凤凰之翼', description: '环绕身体的火焰羽翼。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 99999, baseDamage: 18, type: 'orbital',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<4; i++) ps.push({ ...createProj(source, {x:0,y:0}, 18*stats.might, 99999, '#ff4500', 12), orbitRadius: 70, orbitAngle: i*(Math.PI/2), orbitSpeed: 0.12, sprite: '🔥' });
        return ps;
    }
  },

  // --- Marisa Weapons ---
  'star_dust': {
    id: 'star_dust', name: '星屑幻想', description: '扇形发射星星。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 8, cooldownMax: 30, baseDamage: 10, type: 'projectile',
    onFire: (source, target, stats) => {
       const ps = [];
       for (let i = -2; i <= 2; i++) {
         const angle = (i * 15) * (Math.PI / 180);
         const vel = { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 }; // Right default
         ps.push({ ...createProj(source, vel, 10 * stats.might, 60, '#f1c40f', 8), sprite: '⭐' });
       }
       return ps;
    }
  },
  'laser': {
    id: 'laser', name: '极限火花', description: '毁灭性的直线激光。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 8, cooldownMax: 300, baseDamage: 100, type: 'laser',
    onFire: (source, target, stats) => {
        return [{ ...createProj(source, {x:1, y:0}, 100*stats.might, 30, '#f1c40f', 50), isLaser: true, penetration: 999 }];
    }
  },
  'orreries': {
    id: 'orreries', name: '魔法天体仪', description: '环绕的元素球。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 8, cooldownMax: 99999, baseDamage: 12, type: 'orbital',
    onFire: (source, target, stats) => {
        const ps = [];
        const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];
        for(let i=0; i<4; i++) ps.push({ ...createProj(source, {x:0,y:0}, 12*stats.might, 99999, colors[i], 12), orbitRadius: 80, orbitAngle: i*(Math.PI/2), orbitSpeed: 0.08 });
        return ps;
    }
  },

  // --- Sakuya Weapons ---
  'knives': {
    id: 'knives', name: '幻惑飞刀', description: '碰到屏幕边缘反弹。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 8, cooldownMax: 40, baseDamage: 15, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [
            { ...createProj(source, {x: dir.x*10, y: dir.y*10}, 15*stats.might, 180, '#bdc3c7', 5), sprite: '🔪' },
            { ...createProj(source, {x: -dir.x*10, y: dir.y*10}, 15*stats.might, 180, '#bdc3c7', 5), sprite: '🔪' }
        ];
    }
  },
  'time_stop': {
    id: 'time_stop', name: '完美潇洒的世界', description: '冻结全屏敌人。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 8, cooldownMax: 600, baseDamage: 0, type: 'special',
    onFire: (source) => [{ ...createProj(source, {x:0,y:0}, 0, 180, '', 0), isTimeStop: true }] // 3s stop (180 frames)
  },
  'checkmate': {
    id: 'checkmate', name: '收束飞刀', description: '生成一圈静止飞刀后射出。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 8, cooldownMax: 120, baseDamage: 20, type: 'projectile',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<8; i++) {
            const angle = i * (Math.PI*2/8);
            ps.push({ ...createProj(source, {x: Math.cos(angle)*8, y: Math.sin(angle)*8}, 20*stats.might, 100, '#3498db', 5), sprite: '🗡️' });
        }
        return ps;
    }
  },

  // --- Yuma Weapons ---
  'spoon': {
    id: 'spoon', name: '吞噬一切的勺子', description: '扔出巨大的勺子并飞回。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 8, cooldownMax: 80, baseDamage: 30, type: 'projectile',
    onFire: (source, target, stats) => {
         const dir = target ? normalize(target) : {x:1, y:0};
         return [{ ...createProj(source, {x:dir.x*6, y:dir.y*6}, 30*stats.might, 120, '#8e44ad', 20), returnToPlayer: true, penetration: 999, sprite: '🥄' }];
    }
  },
  'fangs': {
    id: 'fangs', name: '刚欲之牙', description: '近距离咬合攻击。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 8, cooldownMax: 50, baseDamage: 50, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj({x: source.x+dir.x*40, y: source.y+dir.y*40}, {x:0,y:0}, 50*stats.might, 10, '#8e44ad', 40), penetration: 999 }];
    }
  },
  'black_hole': {
    id: 'black_hole', name: '暴食黑洞', description: '吸附周围敌人并造成伤害。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 8, cooldownMax: 300, baseDamage: 5, type: 'special',
    onFire: (source, target, stats) => {
        const pos = { x: source.x + (Math.random()-0.5)*400, y: source.y + (Math.random()-0.5)*400 };
        return [{ ...createProj(pos, {x:0,y:0}, 5*stats.might, 180, '#000', 100), isBlackHole: true, penetration: 999 }];
    }
  },

  // --- Koishi Weapons ---
  'mines': {
    id: 'mines', name: '本我的解放', description: '随机放置爱心雷。',
    exclusiveTo: CharacterId.KOISHI, maxLevel: 8, cooldownMax: 60, baseDamage: 40, type: 'projectile',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<3; i++) {
             const pos = { x: source.x + (Math.random()-0.5)*300, y: source.y + (Math.random()-0.5)*300 };
             ps.push({ ...createProj(pos, {x:0,y:0}, 40*stats.might, 300, '#2ecc71', 15), onHitEffect: 'explode', sprite: '💚' });
        }
        return ps;
    }
  },
  'whip': {
    id: 'whip', name: '深层意识的蔷薇', description: '自动抽打最近敌人。',
    exclusiveTo: CharacterId.KOISHI, maxLevel: 8, cooldownMax: 40, baseDamage: 25, type: 'projectile',
    onFire: (source, target, stats) => {
        if(target) return [{ ...createProj(source, {x:target.x*15, y:target.y*15}, 25*stats.might, 10, '#c0392b', 10), sprite: '🌹', penetration: 2 }];
        return [];
    }
  },
  'fire_pillars': {
    id: 'fire_pillars', name: '被厌恶者的火', description: '周围随机喷射火柱。',
    exclusiveTo: CharacterId.KOISHI, maxLevel: 8, cooldownMax: 100, baseDamage: 60, type: 'projectile',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<4; i++) {
            const angle = Math.random() * Math.PI * 2;
            ps.push({ ...createProj(source, {x:Math.cos(angle)*5, y:Math.sin(angle)*5}, 60*stats.might, 60, '#e74c3c', 20), sprite: '🔥', penetration: 999 });
        }
        return ps;
    }
  },

};

export const WAVES = [
    { time: 0, interval: 60, enemyStats: { hp: 10, damage: 5, speed: 1.5, type: 'slime', exp: 3, color: '#a8e6cf' } },
    { time: 0, interval: 180, enemyStats: { hp: 20, damage: 6, speed: 2.0, type: 'elf', exp: 8, color: '#87ceeb' } }, // Elf from start (every 3 seconds)
    { time: 60, interval: 45, enemyStats: { hp: 30, damage: 8, speed: 2.0, type: 'slime', exp: 5, color: '#3b7a57' } },
    { time: 180, interval: 30, enemyStats: { hp: 60, damage: 10, speed: 2.5, type: 'elf', exp: 12, color: '#87ceeb' } },
    { time: 300, interval: 300, enemyStats: { hp: 800, damage: 20, speed: 2.0, type: 'boss1', exp: 300, color: '#4dd2ff' } }, // Boss 1: 琪露诺
    { time: 360, interval: 15, enemyStats: { hp: 100, damage: 15, speed: 3.0, type: 'elf', exp: 20, color: '#4682b4' } },
    { time: 600, interval: 10, enemyStats: { hp: 200, damage: 20, speed: 3.5, type: 'ghost', exp: 35, color: '#2c3e50' } },
    { time: 900, interval: 360, enemyStats: { hp: 1500, damage: 30, speed: 2.5, type: 'boss2', exp: 500, color: '#a8d8ea' } }, // Boss 2: 妖梦
    { time: 1200, interval: 8, enemyStats: { hp: 300, damage: 25, speed: 4.0, type: 'ghost', exp: 50, color: '#16213e' } },
    { time: 1800, interval: 450, enemyStats: { hp: 3000, damage: 40, speed: 2.0, type: 'boss3', exp: 800, color: '#f8b195' } }, // Boss 3: 辉夜
];

function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}

// 技能升级树
export const WEAPON_UPGRADE_TREES: Record<string, WeaponUpgradeChoice[]> = {
  'kick': [ // 凯风快晴飞翔蹴
    // Tier 1
    { id: 'kick_reset', weaponId: 'kick', tier: 1, name: '死神之舞', description: '击杀敌人立即刷新冷却时间', icon: '💀' },
    { id: 'kick_invuln', weaponId: 'kick', tier: 1, name: '不死之身', description: '飞行过程中获得无敌时间', icon: '🛡️' },
    { id: 'kick_range', weaponId: 'kick', tier: 1, name: '凤凰长鸣', description: '飞行距离 +100%', icon: '🦅' },
    // Tier 2
    { id: 'kick_explosion', weaponId: 'kick', tier: 2, name: '燃尽一切', description: '着陆时产生火焰爆炸', icon: '💥' },
    { id: 'kick_trail', weaponId: 'kick', tier: 2, name: '业火之路', description: '飞行轨迹留下持续伤害的火焰', icon: '🔥' },
    { id: 'kick_multi', weaponId: 'kick', tier: 2, name: '连环踢击', description: '可连续使用两次', icon: '⚡' },
    // Tier 3
    { id: 'kick_phoenix', weaponId: 'kick', tier: 3, name: '不死鸟化身', description: '复活时自动触发，造成巨大伤害', icon: '🔆' },
    { id: 'kick_burn', weaponId: 'kick', tier: 3, name: '永恒之火', description: '命中的敌人持续燃烧', icon: '♨️' },
    { id: 'kick_speed', weaponId: 'kick', tier: 3, name: '光速冲刺', description: '飞行速度 +200%，伤害 +100%', icon: '💫' }
  ],
  'fire_bird': [
    // Tier 1
    { id: 'bird_pierce', weaponId: 'fire_bird', tier: 1, name: '穿云破日', description: '贯穿 +3', icon: '🎯' },
    { id: 'bird_homing', weaponId: 'fire_bird', tier: 1, name: '追踪火鸟', description: '获得追踪能力', icon: '🧭' },
    { id: 'bird_split', weaponId: 'fire_bird', tier: 1, name: '分裂火鸟', description: '命中后分裂成3个小火鸟', icon: '✨' },
    // Tier 2
    { id: 'bird_count', weaponId: 'fire_bird', tier: 2, name: '群鸟翔空', description: '同时发射数量 +2', icon: '🦜' },
    { id: 'bird_size', weaponId: 'fire_bird', tier: 2, name: '巨鸟降临', description: '大小和伤害 +100%', icon: '🦅' },
    { id: 'bird_bounce', weaponId: 'fire_bird', tier: 2, name: '跳弹火鸟', description: '可以弹射3次', icon: '↩️' },
    // Tier 3
    { id: 'bird_nova', weaponId: 'fire_bird', tier: 3, name: '凤凰涅槃', description: '消失时产生火焰新星', icon: '☀️' },
    { id: 'bird_loop', weaponId: 'fire_bird', tier: 3, name: '回旋火鸟', description: '绕场一周后回到发射点', icon: '🔄' },
    { id: 'bird_rapid', weaponId: 'fire_bird', tier: 3, name: '暴风火鸟', description: '冷却时间 -70%', icon: '🌪️' }
  ],
  'phoenix_wings': [
    // Tier 1
    { id: 'wings_count', weaponId: 'phoenix_wings', tier: 1, name: '六翼天使', description: '火焰羽翼数量 +2', icon: '👼' },
    { id: 'wings_damage', weaponId: 'phoenix_wings', tier: 1, name: '烈焰之翼', description: '伤害 +50%', icon: '🔥' },
    { id: 'wings_range', weaponId: 'phoenix_wings', tier: 1, name: '展翅高飞', description: '旋转范围 +50%', icon: '📐' },
    // Tier 2
    { id: 'wings_shoot', weaponId: 'phoenix_wings', tier: 2, name: '羽翼射击', description: '定期发射火焰弹', icon: '🎯' },
    { id: 'wings_burn', weaponId: 'phoenix_wings', tier: 2, name: '灼热光环', description: '接触敌人施加燃烧效果', icon: '♨️' },
    { id: 'wings_shield', weaponId: 'phoenix_wings', tier: 2, name: '火焰护盾', description: '抵挡敌方弹幕', icon: '🛡️' },
    // Tier 3
    { id: 'wings_double', weaponId: 'phoenix_wings', tier: 3, name: '双重旋转', description: '添加反向旋转的第二层', icon: '♾️' },
    { id: 'wings_pull', weaponId: 'phoenix_wings', tier: 3, name: '火焰漩涡', description: '吸引敌人和宝石', icon: '🌀' },
    { id: 'wings_explode', weaponId: 'phoenix_wings', tier: 3, name: '爆裂之翼', description: '击杀敌人触发爆炸', icon: '💣' }
  ],

  // --- Reimu (博丽灵梦) Weapons ---
  'homing_amulet': [
    // Tier 1
    { id: 'amulet_count', weaponId: 'homing_amulet', tier: 1, name: '散弹符阵', description: '同时发射数量 +2', icon: '📜' },
    { id: 'amulet_homing', weaponId: 'homing_amulet', tier: 1, name: '完美追踪', description: '追踪强度 +100%', icon: '🎯' },
    { id: 'amulet_bounce', weaponId: 'homing_amulet', tier: 1, name: '弹跳灵符', description: '符札可在敌人间弹跳', icon: '↩️' },
    // Tier 2
    { id: 'amulet_split', weaponId: 'homing_amulet', tier: 2, name: '阴阳裂变', description: '命中后分裂成两个追踪符', icon: '✨' },
    { id: 'amulet_pierce', weaponId: 'homing_amulet', tier: 2, name: '神灵穿透', description: '贯穿 +5，伤害 +30%', icon: '💥' },
    { id: 'amulet_heal', weaponId: 'homing_amulet', tier: 2, name: '净化灵符', description: '命中回复 1 HP', icon: '💚' },
    // Tier 3
    { id: 'amulet_rain', weaponId: 'homing_amulet', tier: 3, name: '梦想天生', description: '向所有敌人发射符札', icon: '🌟' },
    { id: 'amulet_barrier', weaponId: 'homing_amulet', tier: 3, name: '常驻结界', description: '符札环绕身体形成护盾', icon: '🛡️' },
    { id: 'amulet_explosion', weaponId: 'homing_amulet', tier: 3, name: '灵爆符咒', description: '命中产生小范围爆炸', icon: '💢' }
  ],
  'yin_yang_orb': [
    // Tier 1
    { id: 'orb_size', weaponId: 'yin_yang_orb', tier: 1, name: '巨大阴阳', description: '大小和伤害 +100%', icon: '⚫⚪' },
    { id: 'orb_gravity', weaponId: 'yin_yang_orb', tier: 1, name: '重力控制', description: '可手动控制抛物线', icon: '🌀' },
    { id: 'orb_multi', weaponId: 'yin_yang_orb', tier: 1, name: '双子阴阳', description: '同时投掷两个', icon: '♊' },
    // Tier 2
    { id: 'orb_seeking', weaponId: 'yin_yang_orb', tier: 2, name: '寻敌阴阳', description: '落地时追踪最近敌人', icon: '🧲' },
    { id: 'orb_crush', weaponId: 'yin_yang_orb', tier: 2, name: '碾压重击', description: '命中眩晕敌人 3 秒', icon: '😵' },
    { id: 'orb_bounce_ground', weaponId: 'yin_yang_orb', tier: 2, name: '地面弹跳', description: '落地后继续弹跳 5 次', icon: '🏐' },
    // Tier 3
    { id: 'orb_meteor', weaponId: 'yin_yang_orb', tier: 3, name: '阴阳天降', description: '召唤 10 个小阴阳玉从天而降', icon: '☄️' },
    { id: 'orb_vortex', weaponId: 'yin_yang_orb', tier: 3, name: '阴阳漩涡', description: '落地创造吸引敌人的旋涡', icon: '🌊' },
    { id: 'orb_return', weaponId: 'yin_yang_orb', tier: 3, name: '回旋阴阳', description: '落地后飞回玩家', icon: '🔄' }
  ],
  'boundary': [
    // Tier 1
    { id: 'boundary_size', weaponId: 'boundary', tier: 1, name: '扩展结界', description: '范围 +50%', icon: '📐' },
    { id: 'boundary_damage', weaponId: 'boundary', tier: 1, name: '伤害结界', description: '伤害 +100%', icon: '⚡' },
    { id: 'boundary_duration', weaponId: 'boundary', tier: 1, name: '常驻结界', description: '持续时间 +100%', icon: '⏱️' },
    // Tier 2
    { id: 'boundary_reflect', weaponId: 'boundary', tier: 2, name: '反射护盾', description: '反弹敌方弹幕', icon: '🪞' },
    { id: 'boundary_heal', weaponId: 'boundary', tier: 2, name: '治愈结界', description: '每秒恢复 2 HP', icon: '💚' },
    { id: 'boundary_slow', weaponId: 'boundary', tier: 2, name: '时缓领域', description: '结界内敌人速度 -70%', icon: '🐌' },
    // Tier 3
    { id: 'boundary_fantasy', weaponId: 'boundary', tier: 3, name: '幻想封印', description: '持续时间内完全无敌', icon: '✨' },
    { id: 'boundary_banish', weaponId: 'boundary', tier: 3, name: '幻想崩坏', description: '结束时驱逐所有结界内敌人', icon: '💫' },
    { id: 'boundary_double', weaponId: 'boundary', tier: 3, name: '双重结界', description: '同时展开两层结界', icon: '♾️' }
  ],

  // --- Marisa (雾雨魔理沙) Weapons ---
  'star_dust': [
    // Tier 1
    { id: 'star_count', weaponId: 'star_dust', tier: 1, name: '星河漫天', description: '发射角度范围扩大', icon: '🌠' },
    { id: 'star_speed', weaponId: 'star_dust', tier: 1, name: '光速星尘', description: '弹速 +100%，伤害 +30%', icon: '💫' },
    { id: 'star_pierce', weaponId: 'star_dust', tier: 1, name: '穿星之力', description: '贯穿 +3', icon: '🎯' },
    // Tier 2
    { id: 'star_homing', weaponId: 'star_dust', tier: 2, name: '追星魔法', description: '星星获得追踪能力', icon: '🧭' },
    { id: 'star_explode', weaponId: 'star_dust', tier: 2, name: '星爆魔法', description: '命中产生小爆炸', icon: '💥' },
    { id: 'star_rapid', weaponId: 'star_dust', tier: 2, name: '速射星尘', description: '冷却时间 -50%', icon: '⚡' },
    // Tier 3
    { id: 'star_galaxy', weaponId: 'star_dust', tier: 3, name: '银河狂想', description: '向所有方向发射 16 颗星星', icon: '🌌' },
    { id: 'star_comet', weaponId: 'star_dust', tier: 3, name: '彗星魔法', description: '每颗星星留下持续伤害轨迹', icon: '☄️' },
    { id: 'star_supernova', weaponId: 'star_dust', tier: 3, name: '超新星', description: '星星消失时产生大爆炸', icon: '💫' }
  ],
  'laser': [
    // Tier 1
    { id: 'laser_width', weaponId: 'laser', tier: 1, name: '极宽火花', description: '激光宽度 +100%', icon: '📏' },
    { id: 'laser_duration', weaponId: 'laser', tier: 1, name: '持久火花', description: '持续时间 +100%', icon: '⏱️' },
    { id: 'laser_damage', weaponId: 'laser', tier: 1, name: '终极火花', description: '伤害 +200%', icon: '⚡' },
    // Tier 2
    { id: 'laser_sweep', weaponId: 'laser', tier: 2, name: '扫射火花', description: '激光缓慢旋转扫射', icon: '🌀' },
    { id: 'laser_multi', weaponId: 'laser', tier: 2, name: '三重火花', description: '同时发射三道激光', icon: '🔱' },
    { id: 'laser_burn', weaponId: 'laser', tier: 2, name: '灼烧火花', description: '命中施加持续燃烧', icon: '🔥' },
    // Tier 3
    { id: 'laser_rainbow', weaponId: 'laser', tier: 3, name: '七彩究极火花', description: '发射 7 道彩虹激光', icon: '🌈' },
    { id: 'laser_penetrate', weaponId: 'laser', tier: 3, name: '贯穿世界', description: '激光穿透地图边界', icon: '🌍' },
    { id: 'laser_charge', weaponId: 'laser', tier: 3, name: '蓄力火花', description: '冷却期间蓄力，伤害累加', icon: '⚡' }
  ],
  'orreries': [
    // Tier 1
    { id: 'orrery_count', weaponId: 'orreries', tier: 1, name: '八星天体', description: '元素球数量 +4', icon: '🪐' },
    { id: 'orrery_speed', weaponId: 'orreries', tier: 1, name: '高速运行', description: '旋转速度 +100%', icon: '💨' },
    { id: 'orrery_size', weaponId: 'orreries', tier: 1, name: '巨大星球', description: '大小和伤害 +100%', icon: '🌕' },
    // Tier 2
    { id: 'orrery_shoot', weaponId: 'orreries', tier: 2, name: '星球射击', description: '定期向敌人发射光弹', icon: '🎯' },
    { id: 'orrery_orbit', weaponId: 'orreries', tier: 2, name: '双轨运行', description: '添加反向旋转的第二层', icon: '♾️' },
    { id: 'orrery_explode', weaponId: 'orreries', tier: 2, name: '星球爆炸', description: '命中产生元素爆炸', icon: '💥' },
    // Tier 3
    { id: 'orrery_solar', weaponId: 'orreries', tier: 3, name: '太阳系统', description: '创建完整太阳系（12 星球）', icon: '☀️' },
    { id: 'orrery_chain', weaponId: 'orreries', tier: 3, name: '星球链接', description: '星球间释放闪电链', icon: '⚡' },
    { id: 'orrery_gravity', weaponId: 'orreries', tier: 3, name: '引力场', description: '吸引敌人和宝石', icon: '🌀' }
  ],

  // --- Sakuya (十六夜咲夜) Weapons ---
  'knives': [
    // Tier 1
    { id: 'knife_count', weaponId: 'knives', tier: 1, name: '飞刀暴雨', description: '同时发射 4 把飞刀', icon: '🔪' },
    { id: 'knife_bounce', weaponId: 'knives', tier: 1, name: '完美弹射', description: '弹射次数 +3', icon: '↩️' },
    { id: 'knife_speed', weaponId: 'knives', tier: 1, name: '光速飞刀', description: '飞刀速度 +150%', icon: '💨' },
    // Tier 2
    { id: 'knife_explode', weaponId: 'knives', tier: 2, name: '爆裂飞刀', description: '命中产生小爆炸', icon: '💥' },
    { id: 'knife_poison', weaponId: 'knives', tier: 2, name: '剧毒涂层', description: '命中施加持续毒伤', icon: '☠️' },
    { id: 'knife_freeze', weaponId: 'knives', tier: 2, name: '冻结飞刀', description: '命中冻结敌人 2 秒', icon: '❄️' },
    // Tier 3
    { id: 'knife_danmaku', weaponId: 'knives', tier: 3, name: '飞刀弹幕', description: '全屏随机发射飞刀', icon: '🌪️' },
    { id: 'knife_time', weaponId: 'knives', tier: 3, name: '时停飞刀', description: '飞刀在空中静止 3 秒后同时射出', icon: '⏰' },
    { id: 'knife_return', weaponId: 'knives', tier: 3, name: '回旋飞刀', description: '飞刀最终返回玩家', icon: '🔄' }
  ],
  'time_stop': [
    // Tier 1
    { id: 'timestop_duration', weaponId: 'time_stop', tier: 1, name: '延长时停', description: '时停持续时间 +3 秒', icon: '⏱️' },
    { id: 'timestop_damage', weaponId: 'time_stop', tier: 1, name: '时停累积', description: '时停期间伤害累计结算', icon: '💥' },
    { id: 'timestop_cooldown', weaponId: 'time_stop', tier: 1, name: '快速恢复', description: '冷却时间 -40%', icon: '⚡' },
    // Tier 2
    { id: 'timestop_freeze', weaponId: 'time_stop', tier: 2, name: '永久冻结', description: '时停后敌人继续冻结 3 秒', icon: '❄️' },
    { id: 'timestop_heal', weaponId: 'time_stop', tier: 2, name: '时间治愈', description: '时停期间每秒恢复 5 HP', icon: '💚' },
    { id: 'timestop_invuln', weaponId: 'time_stop', tier: 2, name: '时停无敌', description: '时停期间完全无敌', icon: '🛡️' },
    // Tier 3
    { id: 'timestop_world', weaponId: 'time_stop', tier: 3, name: 'THE WORLD', description: '时停持续时间 +10 秒', icon: '🌍' },
    { id: 'timestop_rewind', weaponId: 'time_stop', tier: 3, name: '时间倒流', description: '时停结束回复所有 HP', icon: '⏮️' },
    { id: 'timestop_auto', weaponId: 'time_stop', tier: 3, name: '自动时停', description: '受到致命伤害自动触发', icon: '🔮' }
  ],
  'checkmate': [
    // Tier 1
    { id: 'checkmate_count', weaponId: 'checkmate', tier: 1, name: '十六夜飞刀', description: '飞刀数量增加至 16 把', icon: '🗡️' },
    { id: 'checkmate_converge', weaponId: 'checkmate', tier: 1, name: '收束打击', description: '飞刀聚焦一点射出', icon: '🎯' },
    { id: 'checkmate_spiral', weaponId: 'checkmate', tier: 1, name: '螺旋飞刀', description: '飞刀螺旋射出', icon: '🌀' },
    // Tier 2
    { id: 'checkmate_double', weaponId: 'checkmate', tier: 2, name: '双重收束', description: '连续释放两次', icon: '♊' },
    { id: 'checkmate_homing', weaponId: 'checkmate', tier: 2, name: '追踪飞刀', description: '飞刀获得追踪能力', icon: '🧭' },
    { id: 'checkmate_penetrate', weaponId: 'checkmate', tier: 2, name: '穿刺收束', description: '贯穿 +5', icon: '🎯' },
    // Tier 3
    { id: 'checkmate_nova', weaponId: 'checkmate', tier: 3, name: '飞刀新星', description: '32 把飞刀向所有方向射出', icon: '💫' },
    { id: 'checkmate_orbit', weaponId: 'checkmate', tier: 3, name: '环绕收束', description: '飞刀先环绕后射出', icon: '⭕' },
    { id: 'checkmate_rapid', weaponId: 'checkmate', tier: 3, name: '速射收束', description: '冷却时间 -70%', icon: '⚡' }
  ],

  // --- Yuma (饕餮尤魔) Weapons ---
  'spoon': [
    // Tier 1
    { id: 'spoon_size', weaponId: 'spoon', tier: 1, name: '巨大勺子', description: '大小和伤害 +100%', icon: '🥄' },
    { id: 'spoon_speed', weaponId: 'spoon', tier: 1, name: '快速回收', description: '飞行和返回速度 +100%', icon: '💨' },
    { id: 'spoon_multi', weaponId: 'spoon', tier: 1, name: '三重勺子', description: '同时投掷 3 把勺子', icon: '🍴' },
    // Tier 2
    { id: 'spoon_heal', weaponId: 'spoon', tier: 2, name: '吞噬回复', description: '命中回复 3 HP', icon: '💚' },
    { id: 'spoon_pull', weaponId: 'spoon', tier: 2, name: '吸引勺子', description: '飞行时吸引敌人和宝石', icon: '🧲' },
    { id: 'spoon_spin', weaponId: 'spoon', tier: 2, name: '旋转勺子', description: '勺子高速旋转，伤害 +50%', icon: '🌀' },
    // Tier 3
    { id: 'spoon_gluttony', weaponId: 'spoon', tier: 3, name: '暴食之勺', description: '命中吞噬小型敌人', icon: '👹' },
    { id: 'spoon_orbit', weaponId: 'spoon', tier: 3, name: '勺子卫星', description: '勺子环绕身体后返回', icon: '🛸' },
    { id: 'spoon_explosion', weaponId: 'spoon', tier: 3, name: '爆裂回收', description: '返回时产生爆炸伤害', icon: '💥' }
  ],
  'fangs': [
    // Tier 1
    { id: 'fang_size', weaponId: 'fangs', tier: 1, name: '巨口獠牙', description: '范围 +100%', icon: '👄' },
    { id: 'fang_duration', weaponId: 'fangs', tier: 1, name: '持久撕咬', description: '持续时间 +200%', icon: '⏱️' },
    { id: 'fang_rapid', weaponId: 'fangs', tier: 1, name: '连续撕咬', description: '冷却时间 -50%', icon: '⚡' },
    // Tier 2
    { id: 'fang_heal', weaponId: 'fangs', tier: 2, name: '吸血之牙', description: '伤害的 50% 转化为 HP', icon: '💉' },
    { id: 'fang_stun', weaponId: 'fangs', tier: 2, name: '眩晕撕咬', description: '命中眩晕敌人 2 秒', icon: '😵' },
    { id: 'fang_multi', weaponId: 'fangs', tier: 2, name: '多重撕咬', description: '同时攻击 3 个方向', icon: '🦷' },
    // Tier 3
    { id: 'fang_devour', weaponId: 'fangs', tier: 3, name: '吞噬一切', description: '击杀立即恢复 20 HP', icon: '👹' },
    { id: 'fang_chain', weaponId: 'fangs', tier: 3, name: '连环撕咬', description: '攻击链接到附近敌人', icon: '⛓️' },
    { id: 'fang_rampage', weaponId: 'fangs', tier: 3, name: '狂暴撕咬', description: '血量越低伤害越高', icon: '💢' }
  ],
  'black_hole': [
    // Tier 1
    { id: 'hole_size', weaponId: 'black_hole', tier: 1, name: '巨型黑洞', description: '范围 +100%', icon: '⚫' },
    { id: 'hole_duration', weaponId: 'black_hole', tier: 1, name: '持久黑洞', description: '持续时间 +100%', icon: '⏱️' },
    { id: 'hole_damage', weaponId: 'black_hole', tier: 1, name: '伤害黑洞', description: '每秒伤害 +200%', icon: '💥' },
    // Tier 2
    { id: 'hole_pull', weaponId: 'black_hole', tier: 2, name: '强力吸引', description: '吸引力 +200%', icon: '🧲' },
    { id: 'hole_crush', weaponId: 'black_hole', tier: 2, name: '压缩碾碎', description: '中心敌人受到巨额伤害', icon: '💢' },
    { id: 'hole_multi', weaponId: 'black_hole', tier: 2, name: '双子黑洞', description: '同时召唤 2 个黑洞', icon: '♊' },
    // Tier 3
    { id: 'hole_singularity', weaponId: 'black_hole', tier: 3, name: '奇点暴食', description: '黑洞消失时大爆炸', icon: '💫' },
    { id: 'hole_orbit', weaponId: 'black_hole', tier: 3, name: '环绕黑洞', description: '黑洞环绕玩家移动', icon: '🌀' },
    { id: 'hole_consume', weaponId: 'black_hole', tier: 3, name: '吞噬恢复', description: '吸入敌人恢复 HP', icon: '💚' }
  ],

  // --- Koishi (古明地恋) Weapons ---
  'mines': [
    // Tier 1
    { id: 'mine_count', weaponId: 'mines', tier: 1, name: '心灵陷阱', description: '每次放置 5 个地雷', icon: '💚' },
    { id: 'mine_damage', weaponId: 'mines', tier: 1, name: '爆炸之心', description: '爆炸伤害 +150%', icon: '💥' },
    { id: 'mine_range', weaponId: 'mines', tier: 1, name: '扩散地雷', description: '放置范围 +100%', icon: '📐' },
    // Tier 2
    { id: 'mine_chain', weaponId: 'mines', tier: 2, name: '连锁爆炸', description: '爆炸触发附近地雷', icon: '⛓️' },
    { id: 'mine_pull', weaponId: 'mines', tier: 2, name: '吸引地雷', description: '爆炸前吸引敌人', icon: '🧲' },
    { id: 'mine_slow', weaponId: 'mines', tier: 2, name: '减速陷阱', description: '爆炸减速敌人 5 秒', icon: '🐌' },
    // Tier 3
    { id: 'mine_field', weaponId: 'mines', tier: 3, name: '雷区封锁', description: '同时布置 20 个地雷', icon: '☢️' },
    { id: 'mine_stealth', weaponId: 'mines', tier: 3, name: '隐形地雷', description: '敌人无法看见地雷', icon: '👻' },
    { id: 'mine_nuclear', weaponId: 'mines', tier: 3, name: '核心爆炸', description: '超大范围巨额伤害', icon: '☢️' }
  ],
  'whip': [
    // Tier 1
    { id: 'whip_range', weaponId: 'whip', tier: 1, name: '延长蔷薇', description: '攻击距离 +100%', icon: '🌹' },
    { id: 'whip_speed', weaponId: 'whip', tier: 1, name: '快速抽打', description: '冷却时间 -50%', icon: '⚡' },
    { id: 'whip_multi', weaponId: 'whip', tier: 1, name: '多重蔷薇', description: '同时攻击 3 个目标', icon: '🌺' },
    // Tier 2
    { id: 'whip_pull', weaponId: 'whip', tier: 2, name: '拉扯蔷薇', description: '将敌人拉向自己', icon: '🪝' },
    { id: 'whip_crit', weaponId: 'whip', tier: 2, name: '暴击蔷薇', description: '暴击率 +50%，暴击伤害 +100%', icon: '💢' },
    { id: 'whip_poison', weaponId: 'whip', tier: 2, name: '剧毒蔷薇', description: '命中施加持续毒伤', icon: '☠️' },
    // Tier 3
    { id: 'whip_chain', weaponId: 'whip', tier: 3, name: '连锁蔷薇', description: '攻击链接到附近 5 个敌人', icon: '⛓️' },
    { id: 'whip_spiral', weaponId: 'whip', tier: 3, name: '螺旋蔷薇', description: '环绕身体攻击所有方向', icon: '🌀' },
    { id: 'whip_execute', weaponId: 'whip', tier: 3, name: '处刑蔷薇', description: '对低血量敌人秒杀', icon: '💀' }
  ],
  'fire_pillars': [
    // Tier 1
    { id: 'pillar_count', weaponId: 'fire_pillars', tier: 1, name: '火柱之林', description: '每次喷射 8 根火柱', icon: '🔥' },
    { id: 'pillar_size', weaponId: 'fire_pillars', tier: 1, name: '巨型火柱', description: '大小和伤害 +100%', icon: '🔥' },
    { id: 'pillar_duration', weaponId: 'fire_pillars', tier: 1, name: '持久燃烧', description: '持续时间 +100%', icon: '⏱️' },
    // Tier 2
    { id: 'pillar_homing', weaponId: 'fire_pillars', tier: 2, name: '追踪火柱', description: '火柱追踪敌人', icon: '🎯' },
    { id: 'pillar_ring', weaponId: 'fire_pillars', tier: 2, name: '环形火柱', description: '围绕身体形成火环', icon: '⭕' },
    { id: 'pillar_spiral', weaponId: 'fire_pillars', tier: 2, name: '螺旋火柱', description: '火柱螺旋向外扩散', icon: '🌀' },
    // Tier 3
    { id: 'pillar_inferno', weaponId: 'fire_pillars', tier: 3, name: '地狱业火', description: '全屏随机喷射火柱', icon: '🔥' },
    { id: 'pillar_meteor', weaponId: 'fire_pillars', tier: 3, name: '火柱天降', description: '火柱从天而降', icon: '☄️' },
    { id: 'pillar_eruption', weaponId: 'fire_pillars', tier: 3, name: '火山喷发', description: '玩家位置持续喷射火柱', icon: '🌋' }
  ]
};

// --- Boss Configurations ---
export const BOSS_CONFIGS = {
  cirno: {
    name: '琪露诺',
    spawnTime: 120, // 2 minutes
    hp: 3000,
    damage: 15,
    speed: 2.5,
    radius: 50,
    color: '#00bfff',
    expValue: 500,
    type: 'cirno' as const
  },
  youmu: {
    name: '魂魄妖梦',
    spawnTime: 300, // 5 minutes
    hp: 8000,
    damage: 25,
    speed: 3.5,
    radius: 55,
    color: '#90ee90',
    expValue: 1500,
    type: 'youmu' as const
  },
  kaguya: {
    name: '蓬莱山辉夜',
    spawnTime: 600, // 10 minutes
    hp: 20000,
    damage: 40,
    speed: 2.0,
    radius: 60,
    color: '#ff69b4',
    expValue: 5000,
    type: 'kaguya' as const
  }
};
