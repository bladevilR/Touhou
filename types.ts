
export enum GameState {
  MENU,
  PLAYING,
  PAUSED_LEVEL_UP,
  GAME_OVER,
  VICTORY
}

export enum CharacterId {
  REIMU = 'reimu',
  MOKOU = 'mokou',
  MARISA = 'marisa',
  SAKUYA = 'sakuya',
  YUMA = 'yuma',
  KOISHI = 'koishi'
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  color: string;
  stats: PlayerStats;
  startingWeaponId: string;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  might: number;        // Damage multiplier
  area: number;         // Size multiplier
  cooldown: number;     // 0.0 to 1.0 (multiplier)
  pickupRange: number;
  luck: number;
  armor: number;
  recovery: number;     // HP regen per sec
  revivals: number;     // Lives
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  sprite?: string; 
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  type: 'fairy' | 'ghost' | 'boss' | 'slime' | 'elf';
  expValue: number;
  frozen: number; // Frames frozen
  // Bouncing properties for slime-type enemies
  bounceTimer?: number;
  bounceHeight?: number;
  isJumping?: boolean;
  // Shooting properties for elf-type enemies
  shootTimer?: number;
  // Boss properties
  isBoss?: boolean;
  bossName?: string;
  bossType?: 'cirno' | 'youmu' | 'kaguya';
  attackPattern?: number;
  patternTimer?: number;
  // Status effects
  burnDuration?: number; // Frames of burn remaining
  burnDamage?: number; // Burn damage per tick
  poisonDuration?: number; // Frames of poison remaining
  poisonDamage?: number; // Poison damage per tick
  stunDuration?: number; // Frames of stun remaining
}

export interface Gem extends Entity {
  value: number;
  type: 'small' | 'medium' | 'large';
}

export interface DamageNumber {
  id: string;
  position: Vector2;
  value: number;
  life: number; // frames
  isCrit: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cooldownTimer: number;
  cooldownMax: number; // in frames (60fps)
  baseDamage: number;
  exclusiveTo?: CharacterId; // If set, only this char can find it
  type: 'projectile' | 'aura' | 'orbital' | 'laser' | 'dash' | 'special';
  onFire: (source: Vector2, target: Vector2 | null, stats: PlayerStats, time: number) => Projectile[];
  // 技能升级选项
  upgrades?: string[]; // 已选择的升级ID列表（3/5/7级的特殊升级）
  // 通用升级统计
  damageBonus?: number; // 伤害加成倍数
  cooldownBonus?: number; // 冷却减少倍数
  areaBonus?: number; // 范围加成倍数
  countBonus?: number; // 数量加成
  speedBonus?: number; // 速度加成倍数
}

// 技能升级选项
export interface WeaponUpgradeChoice {
  id: string;
  weaponId: string;
  name: string;
  description: string;
  icon: string;
  tier: number; // 1, 2, 3 对应三次升级
}

export interface Projectile extends Entity {
  damage: number;
  duration: number; // frames
  maxDuration: number;
  penetration: number;
  knockback: number;
  homingStrength?: number; // 0 to 1
  returnToPlayer?: boolean; // Boomerang
  orbitSpeed?: number; // Orbital
  orbitRadius?: number;
  orbitAngle?: number;
  isLaser?: boolean; // Raycast
  isBlackHole?: boolean; // Pulls enemies
  isTimeStop?: boolean; // Freezes enemies
  onHitEffect?: 'freeze' | 'explode' | 'split' | 'heal' | 'burn' | 'poison' | 'stun';
  isEnemyProjectile?: boolean; // True for enemy bullets
  // Special mechanics
  splitCount?: number; // Number of projectiles to split into
  splitAngleSpread?: number; // Angle spread for split projectiles
  bounceCount?: number; // Number of times to bounce between enemies
  chainCount?: number; // Number of enemies to chain to
  chainRange?: number; // Range for chain lightning
  burnDuration?: number; // Frames of burn effect
  burnDamage?: number; // Burn damage per tick
  poisonDuration?: number; // Frames of poison effect
  poisonDamage?: number; // Poison damage per tick
  stunDuration?: number; // Frames of stun effect
  healAmount?: number; // HP to heal on hit
  explosionRadius?: number; // Radius of explosion on hit/expiry
  explosionDamage?: number; // Damage of explosion
  bouncedEnemies?: Set<string>; // Track which enemies were already bounced to
  chainedEnemies?: Set<string>; // Track which enemies were already chained to
  weaponId?: string; // Track which weapon spawned this (for upgrade checks)
}

export interface UpgradeOption {
  id: string;
  type: 'weapon' | 'passive' | 'heal' | 'weapon_upgrade' | 'weapon_stat';
  name: string;
  description: string;
  icon: string;
  level: number;
  isNew: boolean;
  rarity: 'common' | 'rare' | 'legendary';
  weaponId?: string; // For weapon_upgrade/weapon_stat type, which weapon this upgrade belongs to
  statType?: 'damage' | 'cooldown' | 'area' | 'count' | 'speed'; // For weapon_stat type
}
