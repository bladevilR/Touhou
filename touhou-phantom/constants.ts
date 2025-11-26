
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
      pickupRange: 130, luck: 1.2, armor: 1, recovery: 0, revivals: 0,
      critRate: 0.05, critDamage: 1.5, weaponSlots: 6, passiveSlots: 6
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
      pickupRange: 100, luck: 1.0, armor: 0, recovery: -0.5, revivals: 1,
      critRate: 0.05, critDamage: 1.5, weaponSlots: 6, passiveSlots: 6
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
      pickupRange: 150, luck: 1.0, armor: 0, recovery: 0, revivals: 0,
      critRate: 0.05, critDamage: 1.5, weaponSlots: 6, passiveSlots: 6
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
      pickupRange: 120, luck: 1.0, armor: 0, recovery: 0, revivals: 0,
      critRate: 0.15, critDamage: 1.5, weaponSlots: 6, passiveSlots: 6
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
      pickupRange: 100, luck: 1.0, armor: 3, recovery: 1, revivals: 0,
      critRate: 0.05, critDamage: 1.5, weaponSlots: 6, passiveSlots: 6
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
      pickupRange: 100, luck: 1.5, armor: 0, recovery: 0, revivals: 0,
      critRate: 0.05, critDamage: 1.5, weaponSlots: 6, passiveSlots: 6
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
    },
    evolvesInto: 'homing_amulet_evolved'
  },
  'homing_amulet_evolved': {
    id: 'homing_amulet_evolved', name: '梦想封印·集', description: '发射5枚强力追踪灵符。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 99, cooldownMax: 50, baseDamage: 20, type: 'projectile',
    onFire: (source, target, stats) => {
      const ps = [];
      for (let i = -2; i <= 2; i++) ps.push({ ...createProj(source, {x: i*2.5, y: -6}, 20*stats.might, 150, '#ff0000', 10), homingStrength: 0.15, penetration: 2 });
      return ps;
    }
  },
  'yin_yang_orb': {
    id: 'yin_yang_orb', name: '阴阳玉大弹', description: '投掷受重力影响的巨大阴阳玉。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 8, cooldownMax: 100, baseDamage: 40, type: 'projectile',
    onFire: (source, target, stats) => [{ ...createProj(source, {x: (Math.random()-0.5)*8, y: -8}, 40*stats.might, 200, '#fff', 20), penetration: 100, knockback: 10, sprite: '☯️' }],
    evolvesInto: 'yin_yang_orb_evolved'
  },
  'yin_yang_orb_evolved': {
    id: 'yin_yang_orb_evolved', name: '阴阳玉炮击', description: '双向投掷巨大阴阳玉。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 99, cooldownMax: 80, baseDamage: 60, type: 'projectile',
    onFire: (source, target, stats) => [
      { ...createProj(source, {x: -6, y: -8}, 60*stats.might, 220, '#fff', 25), penetration: 999, knockback: 15, sprite: '☯️' },
      { ...createProj(source, {x: 6, y: -8}, 60*stats.might, 220, '#fff', 25), penetration: 999, knockback: 15, sprite: '☯️' }
    ]
  },
  'boundary': {
    id: 'boundary', name: '二重结界', description: '生成击退敌人的护盾。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 8, cooldownMax: 120, baseDamage: 5, type: 'aura',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0,y:0}, 5*stats.might, 60, 'rgba(231, 76, 60, 0.3)', 80), penetration: 999, knockback: 15 }],
    evolvesInto: 'boundary_evolved'
  },
  'boundary_evolved': {
    id: 'boundary_evolved', name: '梦想天生', description: '更大范围结界，附带回血效果。',
    exclusiveTo: CharacterId.REIMU, maxLevel: 99, cooldownMax: 100, baseDamage: 10, type: 'aura',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0,y:0}, 10*stats.might, 90, 'rgba(255, 0, 0, 0.4)', 120), penetration: 999, knockback: 20, special: 'heal_on_hit' }]
  },

  // --- Mokou Weapons ---
  'fire_bird': {
    id: 'fire_bird', name: '火鸟风月', description: '发射穿透火鸟。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 80, baseDamage: 20, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj(source, {x:dir.x*8, y:dir.y*8}, 20*stats.might, 100, '#e67e22', 15), penetration: 5, sprite: '🦅' }];
    },
    evolvesInto: 'fire_bird_evolved'
  },
  'fire_bird_evolved': {
    id: 'fire_bird_evolved', name: '蓬莱人形·焰', description: '发射强力火凤凰，留下燃烧轨迹。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 99, cooldownMax: 60, baseDamage: 35, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj(source, {x:dir.x*10, y:dir.y*10}, 35*stats.might, 150, '#ff4500', 20), penetration: 999, sprite: '🔥', special: 'burn_trail' }];
    }
  },
  'kick': {
    id: 'kick', name: '凯风快晴飞翔蹴', description: '化身火球向前冲刺。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 180, baseDamage: 50, type: 'dash',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0, y:0}, 50*stats.might, 20, '#e67e22', 30), penetration: 999, knockback: 20 }],
    evolvesInto: 'kick_evolved'
  },
  'kick_evolved': {
    id: 'kick_evolved', name: '不死之炎', description: '全屏炎爆冲刺。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 99, cooldownMax: 150, baseDamage: 80, type: 'dash',
    onFire: (source, target, stats) => [{ ...createProj(source, {x:0, y:0}, 80*stats.might, 30, '#ff0000', 60), penetration: 999, knockback: 30, special: 'fullscreen_burn' }]
  },
  'dolls': {
    id: 'dolls', name: '蓬莱人形', description: '旋转的人偶。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 8, cooldownMax: 99999, baseDamage: 15, type: 'orbital',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<3; i++) ps.push({ ...createProj(source, {x:0,y:0}, 15*stats.might, 99999, '#fff', 10), orbitRadius: 60, orbitAngle: i*(Math.PI*2/3), orbitSpeed: 0.1, sprite: '🎎' });
        return ps;
    },
    evolvesInto: 'dolls_evolved'
  },
  'dolls_evolved': {
    id: 'dolls_evolved', name: '永夜四重奏', description: '4个快速旋转的强力人偶。',
    exclusiveTo: CharacterId.MOKOU, maxLevel: 99, cooldownMax: 99999, baseDamage: 25, type: 'orbital',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<4; i++) ps.push({ ...createProj(source, {x:0,y:0}, 25*stats.might, 99999, '#ff0000', 15), orbitRadius: 80, orbitAngle: i*(Math.PI/2), orbitSpeed: 0.15, sprite: '🔥', penetration: 2 });
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
         const vel = { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 };
         ps.push({ ...createProj(source, vel, 10 * stats.might, 60, '#f1c40f', 8), sprite: '⭐' });
       }
       return ps;
    },
    evolvesInto: 'star_dust_evolved'
  },
  'star_dust_evolved': {
    id: 'star_dust_evolved', name: '恋符·Master Spark', description: '更广角度发射大量星星。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 99, cooldownMax: 25, baseDamage: 15, type: 'projectile',
    onFire: (source, target, stats) => {
       const ps = [];
       for (let i = -4; i <= 4; i++) {
         const angle = (i * 12) * (Math.PI / 180);
         const vel = { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 };
         ps.push({ ...createProj(source, vel, 15 * stats.might, 80, '#ffff00', 10), sprite: '✨', penetration: 2 });
       }
       return ps;
    }
  },
  'laser': {
    id: 'laser', name: '极限火花', description: '毁灭性的直线激光。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 8, cooldownMax: 300, baseDamage: 100, type: 'laser',
    onFire: (source, target, stats) => {
        return [{ ...createProj(source, {x:1, y:0}, 100*stats.might, 30, '#f1c40f', 50), isLaser: true, penetration: 999 }];
    },
    evolvesInto: 'laser_evolved'
  },
  'laser_evolved': {
    id: 'laser_evolved', name: '最终火花', description: '持续时间更长的超级激光。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 99, cooldownMax: 250, baseDamage: 150, type: 'laser',
    onFire: (source, target, stats) => {
        return [{ ...createProj(source, {x:1, y:0}, 150*stats.might, 60, '#ffff00', 60), isLaser: true, penetration: 999 }];
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
    },
    evolvesInto: 'orreries_evolved'
  },
  'orreries_evolved': {
    id: 'orreries_evolved', name: '深星的回忆', description: '6个元素球环绕并发射小弹幕。',
    exclusiveTo: CharacterId.MARISA, maxLevel: 99, cooldownMax: 99999, baseDamage: 18, type: 'orbital',
    onFire: (source, target, stats) => {
        const ps = [];
        const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'];
        for(let i=0; i<6; i++) ps.push({ ...createProj(source, {x:0,y:0}, 18*stats.might, 99999, colors[i], 15), orbitRadius: 100, orbitAngle: i*(Math.PI/3), orbitSpeed: 0.1, special: 'shoot_bullets' });
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
    },
    evolvesInto: 'knives_evolved'
  },
  'knives_evolved': {
    id: 'knives_evolved', name: '完美潇洒的世界', description: '四方向同时发射飞刀。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 99, cooldownMax: 30, baseDamage: 25, type: 'projectile',
    onFire: (source, target, stats) => {
        return [
            { ...createProj(source, {x: 12, y: 0}, 25*stats.might, 200, '#95a5a6', 6), sprite: '🔪', penetration: 3 },
            { ...createProj(source, {x: -12, y: 0}, 25*stats.might, 200, '#95a5a6', 6), sprite: '🔪', penetration: 3 },
            { ...createProj(source, {x: 0, y: 12}, 25*stats.might, 200, '#95a5a6', 6), sprite: '🔪', penetration: 3 },
            { ...createProj(source, {x: 0, y: -12}, 25*stats.might, 200, '#95a5a6', 6), sprite: '🔪', penetration: 3 }
        ];
    }
  },
  'time_stop': {
    id: 'time_stop', name: '完美潇洒的世界', description: '冻结全屏敌人。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 8, cooldownMax: 600, baseDamage: 0, type: 'special',
    onFire: (source) => [{ ...createProj(source, {x:0,y:0}, 0, 180, '', 0), isTimeStop: true }],
    evolvesInto: 'time_stop_evolved'
  },
  'time_stop_evolved': {
    id: 'time_stop_evolved', name: '时之迷局', description: '更长时间的时停效果（5秒）。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 99, cooldownMax: 500, baseDamage: 0, type: 'special',
    onFire: (source) => [{ ...createProj(source, {x:0,y:0}, 0, 300, '', 0), isTimeStop: true }] // 5s stop (300 frames)
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
    },
    evolvesInto: 'checkmate_evolved'
  },
  'checkmate_evolved': {
    id: 'checkmate_evolved', name: '飞刀的迷宫', description: '16把飞刀向中心收束。',
    exclusiveTo: CharacterId.SAKUYA, maxLevel: 99, cooldownMax: 100, baseDamage: 30, type: 'projectile',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<16; i++) {
            const angle = i * (Math.PI*2/16);
            ps.push({ ...createProj(source, {x: Math.cos(angle)*10, y: Math.sin(angle)*10}, 30*stats.might, 120, '#2980b9', 6), sprite: '⚔️', penetration: 2 });
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
    },
    evolvesInto: 'spoon_evolved'
  },
  'spoon_evolved': {
    id: 'spoon_evolved', name: '暴食的巨勺', description: '巨型勺子，附带吸血效果。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 99, cooldownMax: 70, baseDamage: 50, type: 'projectile',
    onFire: (source, target, stats) => {
         const dir = target ? normalize(target) : {x:1, y:0};
         return [{ ...createProj(source, {x:dir.x*7, y:dir.y*7}, 50*stats.might, 150, '#6c3483', 30), returnToPlayer: true, penetration: 999, sprite: '🍴', special: 'lifesteal' }];
    }
  },
  'fangs': {
    id: 'fangs', name: '刚欲之牙', description: '近距离咬合攻击。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 8, cooldownMax: 50, baseDamage: 50, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj({x: source.x+dir.x*40, y: source.y+dir.y*40}, {x:0,y:0}, 50*stats.might, 10, '#8e44ad', 40), penetration: 999 }];
    },
    evolvesInto: 'fangs_evolved'
  },
  'fangs_evolved': {
    id: 'fangs_evolved', name: '饕餮之牙', description: '更大范围的咬合攻击。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 99, cooldownMax: 40, baseDamage: 80, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj({x: source.x+dir.x*50, y: source.y+dir.y*50}, {x:0,y:0}, 80*stats.might, 15, '#6c3483', 60), penetration: 999, special: 'lifesteal' }];
    }
  },
  'black_hole': {
    id: 'black_hole', name: '暴食黑洞', description: '吸附周围敌人并造成伤害。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 8, cooldownMax: 300, baseDamage: 5, type: 'special',
    onFire: (source, target, stats) => {
        const pos = { x: source.x + (Math.random()-0.5)*400, y: source.y + (Math.random()-0.5)*400 };
        return [{ ...createProj(pos, {x:0,y:0}, 5*stats.might, 180, '#000', 100), isBlackHole: true, penetration: 999 }];
    },
    evolvesInto: 'black_hole_evolved'
  },
  'black_hole_evolved': {
    id: 'black_hole_evolved', name: '极致虚无', description: '超强吸引力的巨型黑洞。',
    exclusiveTo: CharacterId.YUMA, maxLevel: 99, cooldownMax: 250, baseDamage: 10, type: 'special',
    onFire: (source, target, stats) => {
        const pos = { x: source.x + (Math.random()-0.5)*300, y: source.y + (Math.random()-0.5)*300 };
        return [{ ...createProj(pos, {x:0,y:0}, 10*stats.might, 240, '#000', 150), isBlackHole: true, penetration: 999, special: 'enhanced_pull' }];
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
    },
    evolvesInto: 'mines_evolved'
  },
  'mines_evolved': {
    id: 'mines_evolved', name: '被压抑的本能', description: '5个爱心雷，爆炸范围更大。',
    exclusiveTo: CharacterId.KOISHI, maxLevel: 99, cooldownMax: 50, baseDamage: 60, type: 'projectile',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<5; i++) {
             const pos = { x: source.x + (Math.random()-0.5)*350, y: source.y + (Math.random()-0.5)*350 };
             ps.push({ ...createProj(pos, {x:0,y:0}, 60*stats.might, 360, '#27ae60', 20), onHitEffect: 'explode', sprite: '💚', special: 'large_explosion' });
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
    },
    evolvesInto: 'whip_evolved'
  },
  'whip_evolved': {
    id: 'whip_evolved', name: '无意识的鞭笞', description: '快速连续鞭打，伤害更高。',
    exclusiveTo: CharacterId.KOISHI, maxLevel: 99, cooldownMax: 25, baseDamage: 40, type: 'projectile',
    onFire: (source, target, stats) => {
        if(target) return [
          { ...createProj(source, {x:target.x*18, y:target.y*18}, 40*stats.might, 12, '#922b21', 12), sprite: '🥀', penetration: 3 },
          { ...createProj(source, {x:target.x*20, y:target.y*20}, 40*stats.might, 15, '#922b21', 12), sprite: '🥀', penetration: 3 }
        ];
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
    },
    evolvesInto: 'fire_pillars_evolved'
  },
  'fire_pillars_evolved': {
    id: 'fire_pillars_evolved', name: '嫉妒之火', description: '6根追踪敌人的火柱。',
    exclusiveTo: CharacterId.KOISHI, maxLevel: 99, cooldownMax: 80, baseDamage: 90, type: 'projectile',
    onFire: (source, target, stats) => {
        const ps = [];
        for(let i=0; i<6; i++) {
            const angle = Math.random() * Math.PI * 2;
            ps.push({ ...createProj(source, {x:Math.cos(angle)*6, y:Math.sin(angle)*6}, 90*stats.might, 80, '#c0392b', 25), sprite: '🔥', penetration: 999, homingStrength: 0.05 });
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
    },
    evolvesInto: 'kappa_missile_evolved'
  },
  'kappa_missile_evolved': {
    id: 'kappa_missile_evolved', name: '河童的科技炮台', description: '双向发射追踪导弹。',
    maxLevel: 99, cooldownMax: 40, baseDamage: 25, type: 'projectile',
    onFire: (source, target, stats) => {
        if(target) return [
          { ...createProj(source, {x: target.x*6, y: target.y*6}, 25*stats.might, 120, '#2980b9', 10), homingStrength: 0.08, sprite: '🚀', penetration: 2 },
          { ...createProj(source, {x: -target.x*6, y: -target.y*6}, 25*stats.might, 120, '#2980b9', 10), homingStrength: 0.08, sprite: '🚀', penetration: 2 }
        ];
        return [];
    }
  },
  'fan': {
    id: 'fan', name: '天狗的团扇', description: '前方锥形击退。',
    maxLevel: 8, cooldownMax: 80, baseDamage: 5, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj(source, {x:dir.x*4, y:dir.y*4}, 5*stats.might, 30, '#fff', 40), knockback: 15, penetration: 999, sprite: '🍃' }];
    },
    evolvesInto: 'fan_evolved'
  },
  'fan_evolved': {
    id: 'fan_evolved', name: '天狗的暴风', description: '更强的击退范围与伤害。',
    maxLevel: 99, cooldownMax: 60, baseDamage: 15, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj(source, {x:dir.x*5, y:dir.y*5}, 15*stats.might, 40, '#ecf0f1', 60), knockback: 25, penetration: 999, sprite: '💨' }];
    }
  },
  'punch': {
    id: 'punch', name: '友情破颜拳', description: '近距离拳击攻击，距离很短但伤害高。',
    maxLevel: 8, cooldownMax: 25, baseDamage: 35, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        return [{ ...createProj({x: source.x+dir.x*30, y: source.y+dir.y*30}, {x:0,y:0}, 35*stats.might, 8, '#e67e22', 35), penetration: 3, sprite: '👊' }];
    },
    evolvesInto: 'punch_evolved'
  },
  'punch_evolved': {
    id: 'punch_evolved', name: '闪光流星拳', description: '快速连续拳击。',
    maxLevel: 99, cooldownMax: 20, baseDamage: 50, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        const ps = [];
        for(let i=0; i<3; i++) {
            ps.push({ ...createProj({x: source.x+dir.x*(30+i*10), y: source.y+dir.y*(30+i*10)}, {x:0,y:0}, 50*stats.might, 10, '#d35400', 40), penetration: 5, sprite: '💥' });
        }
        return ps;
    }
  },
  'mine': {
    id: 'mine', name: '妖精坚果雷', description: '在前方布置地雷，触碰后爆炸。',
    maxLevel: 8, cooldownMax: 70, baseDamage: 50, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        const pos = { x: source.x + dir.x*80, y: source.y + dir.y*80 };
        return [{ ...createProj(pos, {x:0,y:0}, 50*stats.might, 240, '#f39c12', 18), sprite: '💣', onHitEffect: 'explode' }];
    },
    evolvesInto: 'mine_evolved'
  },
  'mine_evolved': {
    id: 'mine_evolved', name: '妖精诱导雷阵', description: '布置3个威力更强的地雷。',
    maxLevel: 99, cooldownMax: 60, baseDamage: 70, type: 'projectile',
    onFire: (source, target, stats) => {
        const dir = target ? normalize(target) : {x:1, y:0};
        const ps = [];
        for(let i=0; i<3; i++) {
            const angle = Math.atan2(dir.y, dir.x) + (i-1) * 0.3;
            const pos = { x: source.x + Math.cos(angle)*90, y: source.y + Math.sin(angle)*90 };
            ps.push({ ...createProj(pos, {x:0,y:0}, 70*stats.might, 300, '#e67e22', 22), sprite: '💣', onHitEffect: 'explode', special: 'large_explosion' });
        }
        return ps;
    }
  },
};

export const PASSIVE_DEFS: Record<string, {id: string, name: string, description: string, statBonus: Partial<PlayerStats>, exclusiveTo?: CharacterId, special?: string}> = {
    // --- Generic Passives ---
    'p_glove': { id: 'p_glove', name: 'P点回收手套', description: '拾取范围 +20%', statBonus: { pickupRange: 20 } },
    'grimoire': { id: 'grimoire', name: '高速咏唱经卷', description: '冷却 -10%', statBonus: { cooldown: -0.1 } },
    'mushroom': { id: 'mushroom', name: '巨大化蘑菇', description: '范围 +10%', statBonus: { area: 0.1 } },
    'omamori': { id: 'omamori', name: '硬邦邦的御守', description: '护甲 +1', statBonus: { armor: 1 } },
    'geta': { id: 'geta', name: '天狗的高木屐', description: '速度 +10%', statBonus: { speed: 0.4 } },
    'money_box': { id: 'money_box', name: '贪婪的钱箱', description: '幸运 +20%', statBonus: { luck: 0.2 } },

    // --- Reimu Passives ---
    'gohei_blessing': {
        id: 'gohei_blessing', name: '御币的祝福', description: 'P点范围+30%，恢复+0.5/s',
        exclusiveTo: CharacterId.REIMU, statBonus: { pickupRange: 30, recovery: 0.5 }
    },
    'musou_seal': {
        id: 'musou_seal', name: '无想封印', description: '子弹持续时间+30%，贯穿+1',
        exclusiveTo: CharacterId.REIMU, statBonus: {}, special: 'projectile_duration_penetration'
    },
    'dream_born': {
        id: 'dream_born', name: '梦想天生', description: '获得1条命，护甲+1',
        exclusiveTo: CharacterId.REIMU, statBonus: { revivals: 1, armor: 1 }
    },

    // --- Mokou Passives ---
    'undying_flame': {
        id: 'undying_flame', name: '不死之炎', description: '复活后3秒无敌+全屏灼烧',
        exclusiveTo: CharacterId.MOKOU, statBonus: {}, special: 'revive_invuln_burn'
    },
    'flame_berserker': {
        id: 'flame_berserker', name: '炎发狂', description: 'HP<50%时伤害+50%，移速+20%',
        exclusiveTo: CharacterId.MOKOU, statBonus: {}, special: 'low_hp_boost'
    },
    'phoenix_wings': {
        id: 'phoenix_wings', name: '凤翼天翔', description: '每5秒获得1秒20%移速buff',
        exclusiveTo: CharacterId.MOKOU, statBonus: {}, special: 'periodic_speed_boost'
    },

    // --- Marisa Passives ---
    'magic_grimoire': {
        id: 'magic_grimoire', name: '魔法导书', description: '冷却-20%，但HP上限-10%',
        exclusiveTo: CharacterId.MARISA, statBonus: { cooldown: -0.2, maxHp: -8 }
    },
    'stardust_burst': {
        id: 'stardust_burst', name: '星屑爆发', description: '击中敌人产生小范围爆炸',
        exclusiveTo: CharacterId.MARISA, statBonus: {}, special: 'projectile_explosion'
    },
    'mini_hakkero': {
        id: 'mini_hakkero', name: '迷你八卦炉', description: '激光冷却缩短至2秒',
        exclusiveTo: CharacterId.MARISA, statBonus: {}, special: 'laser_cooldown_reduce'
    },

    // --- Sakuya Passives ---
    'silver_blade': {
        id: 'silver_blade', name: '银色迅刃', description: '暴击率+10%，暴击伤害+50%',
        exclusiveTo: CharacterId.SAKUYA, statBonus: { critRate: 0.1, critDamage: 0.5 }
    },
    'private_time': {
        id: 'private_time', name: '私人时间', description: '时停效果增强至5秒',
        exclusiveTo: CharacterId.SAKUYA, statBonus: {}, special: 'timestop_enhance'
    },
    'blink': {
        id: 'blink', name: '瞬影', description: '每3秒可短距离闪现',
        exclusiveTo: CharacterId.SAKUYA, statBonus: {}, special: 'periodic_dash'
    },

    // --- Yuma Passives ---
    'gluttony_privilege': {
        id: 'gluttony_privilege', name: '暴食特权', description: '吸血+5%，护甲+2',
        exclusiveTo: CharacterId.YUMA, statBonus: { armor: 2 }, special: 'lifesteal_5'
    },
    'black_hole_enhance': {
        id: 'black_hole_enhance', name: '黑洞强化', description: '黑洞半径+50%，伤害+100%',
        exclusiveTo: CharacterId.YUMA, statBonus: {}, special: 'blackhole_boost'
    },
    'reverse_scale': {
        id: 'reverse_scale', name: '逆鳞', description: 'HP<30%时获得3秒无敌+全屏震荡',
        exclusiveTo: CharacterId.YUMA, statBonus: {}, special: 'low_hp_invuln_shockwave'
    },

    // --- Koishi Passives ---
    'unconscious_operation': {
        id: 'unconscious_operation', name: '无意识操作', description: '武器位置完全随机但伤害+50%',
        exclusiveTo: CharacterId.KOISHI, statBonus: { might: 0.5 }, special: 'random_position'
    },
    'closed_heart': {
        id: 'closed_heart', name: '闭锁之心', description: '5%概率完全闪避攻击',
        exclusiveTo: CharacterId.KOISHI, statBonus: {}, special: 'dodge_5'
    },
    'third_eye': {
        id: 'third_eye', name: '第三只眼', description: '幸运+50%，经验获取+20%',
        exclusiveTo: CharacterId.KOISHI, statBonus: { luck: 0.5 }, special: 'exp_boost_20'
    },
};

export const WAVES = [
    // Phase 1: 0-3min (Early Game)
    { time: 0, interval: 60, enemyStats: { hp: 10, damage: 5, speed: 1.5, type: 'slime', exp: 1, color: '#a8e6cf' } },
    { time: 0, interval: 150, enemyStats: { hp: 20, damage: 6, speed: 2.0, type: 'elf', exp: 3, color: '#87ceeb' } },
    { time: 60, interval: 40, enemyStats: { hp: 25, damage: 7, speed: 1.8, type: 'slime', exp: 2, color: '#7fb069' } },

    // Boss 1: Rumia (3min = 180s)
    { time: 180, interval: 9999, enemyStats: { hp: 800, damage: 15, speed: 1.8, type: 'boss', exp: 150, color: '#2c2c2c', name: 'Rumia' } },

    // Phase 2: 3-6min (Mid Game)
    { time: 180, interval: 30, enemyStats: { hp: 50, damage: 10, speed: 2.2, type: 'slime', exp: 4, color: '#3b7a57' } },
    { time: 180, interval: 80, enemyStats: { hp: 60, damage: 12, speed: 2.5, type: 'elf', exp: 5, color: '#4682b4' } },
    { time: 240, interval: 20, enemyStats: { hp: 80, damage: 12, speed: 2.5, type: 'ghost', exp: 6, color: '#5a6c7d' } },

    // Boss 2: Cirno (6min = 360s)
    { time: 360, interval: 9999, enemyStats: { hp: 1500, damage: 20, speed: 2.0, type: 'boss', exp: 250, color: '#3498db', name: 'Cirno' } },

    // Phase 3: 6-9min (Late Game)
    { time: 360, interval: 20, enemyStats: { hp: 120, damage: 18, speed: 2.8, type: 'slime', exp: 8, color: '#2d5016' } },
    { time: 360, interval: 50, enemyStats: { hp: 140, damage: 20, speed: 3.0, type: 'elf', exp: 10, color: '#1e5a8e' } },
    { time: 420, interval: 15, enemyStats: { hp: 180, damage: 22, speed: 3.2, type: 'ghost', exp: 12, color: '#2c3e50' } },

    // Boss 3: Yukari (9min = 540s)
    { time: 540, interval: 9999, enemyStats: { hp: 3000, damage: 30, speed: 2.2, type: 'boss', exp: 500, color: '#8e44ad', name: 'Yukari' } },

    // Phase 4: 9-10min (Endgame Survival)
    { time: 540, interval: 12, enemyStats: { hp: 250, damage: 25, speed: 3.5, type: 'slime', exp: 15, color: '#641e16' } },
    { time: 540, interval: 35, enemyStats: { hp: 300, damage: 28, speed: 3.8, type: 'elf', exp: 18, color: '#154360' } },
    { time: 540, interval: 10, enemyStats: { hp: 350, damage: 30, speed: 4.0, type: 'ghost', exp: 20, color: '#17202a' } },
];

function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
}
