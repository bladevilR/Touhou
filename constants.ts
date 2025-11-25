
import { CharacterConfig, CharacterId, Weapon, Projectile, Vector2, PlayerStats } from './types';

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
    id: 'kick', name: '凯风快晴飞翔蹴', description: '化身火球向前冲刺。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 180, baseDamage: 50, type: 'dash',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0, y:0}, 50*stats.might, 20, '#e67e22', 30), penetration: 999, knockback: 20 }] // Visual dummy, logic handled in canvas
  },
  'dolls': {
    id: 'dolls', name: '蓬莱人形', description: '旋转的人偶。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 99999, baseDamage: 15, type: 'orbital',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<3; i++) ps.push({ ...createProj(source, {x:0,y:0}, 15*stats.might, 99999, '#fff', 10), orbitRadius: 60, orbitAngle: i*(Math.PI*2/3), orbitSpeed: 0.1, sprite: '🎎' });
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

  // --- Common Weapons ---
  'kappa_missile': {
    id: 'kappa_missile', name: '河童的神秘飞弹', description: '自动攻击最近敌人。',
    maxLevel: 8, cooldownMax: 50, baseDamage: 15, type: 'projectile',
    onFire: (source, target, stats) => {
        if(target) return [{ ...createProj(source, {x: target.x*5, y: target.y*5}, 15*stats.might, 100, '#3498db', 8), homingStrength: 0.05, sprite: '🥒' }];
        return [];
    }
  },
  'fan': {
    id: 'fan', name: '天狗的团扇', description: '前方锥形击退。',
    maxLevel: 8, cooldownMax: 80, baseDamage: 5, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj(source, {x:dir.x*4, y:dir.y*4}, 5*stats.might, 30, '#fff', 40), knockback: 15, penetration: 999, sprite: '🍃' }];
    }
  },
};

export const PASSIVE_DEFS: Record<string, {id: string, name: string, description: string, statBonus: Partial<PlayerStats>}> = {
    'p_glove': { id: 'p_glove', name: 'P点回收手套', description: '拾取范围 +20%', statBonus: { pickupRange: 20 } },
    'grimoire': { id: 'grimoire', name: '高速咏唱经卷', description: '冷却 -10%', statBonus: { cooldown: -0.1 } },
    'mushroom': { id: 'mushroom', name: '巨大化蘑菇', description: '范围 +10%', statBonus: { area: 0.1 } },
    'omamori': { id: 'omamori', name: '硬邦邦的御守', description: '护甲 +1', statBonus: { armor: 1 } },
    'geta': { id: 'geta', name: '天狗的高木屐', description: '速度 +10%', statBonus: { speed: 0.4 } }, 
    'money_box': { id: 'money_box', name: '贪婪的钱箱', description: '幸运 +20%', statBonus: { luck: 0.2 } },
};

export const WAVES = [
    { time: 0, interval: 60, enemyStats: { hp: 10, damage: 5, speed: 1.5, type: 'slime', exp: 1, color: '#a8e6cf' } },
    { time: 0, interval: 180, enemyStats: { hp: 20, damage: 6, speed: 2.0, type: 'elf', exp: 3, color: '#87ceeb' } }, // Elf from start (every 3 seconds)
    { time: 60, interval: 45, enemyStats: { hp: 30, damage: 8, speed: 2.0, type: 'slime', exp: 2, color: '#3b7a57' } },
    { time: 180, interval: 30, enemyStats: { hp: 60, damage: 10, speed: 2.5, type: 'elf', exp: 5, color: '#87ceeb' } },
    { time: 300, interval: 100, enemyStats: { hp: 500, damage: 20, speed: 1.5, type: 'boss', exp: 100, color: '#8e44ad' } },
    { time: 360, interval: 15, enemyStats: { hp: 100, damage: 15, speed: 3.0, type: 'elf', exp: 8, color: '#4682b4' } },
    { time: 600, interval: 10, enemyStats: { hp: 200, damage: 20, speed: 3.5, type: 'ghost', exp: 15, color: '#2c3e50' } },
];

function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}
