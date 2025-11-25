
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
  onHitEffect?: 'freeze' | 'explode';
  isEnemyProjectile?: boolean; // True for enemy bullets
}

export interface UpgradeOption {
  id: string;
  type: 'weapon' | 'passive' | 'heal';
  name: string;
  description: string;
  icon: string;
  level: number;
  isNew: boolean;
  rarity: 'common' | 'rare' | 'legendary';
}
