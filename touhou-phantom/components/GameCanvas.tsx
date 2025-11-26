import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Emitter, EmitterConfigV3 } from '@pixi/particle-emitter';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, FPS, WEAPON_DEFS, PASSIVE_DEFS, WAVES, GAME_SPEED } from '../constants';
import { GameState, CharacterConfig, Entity, Enemy, Projectile, Gem, DamageNumber, Weapon, UpgradeOption, Vector2 } from '../types';

const BASE_URL = import.meta.env.BASE_URL;

interface GameCanvasProps {
  character: CharacterConfig;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onLevelUp: (currentWeapons: Weapon[], currentPassives: string[], hp: number, maxHp: number, time: number, currentStats: any) => void;
  onGameOver: (timeSurvived: number) => void;
  newWeaponToAdd?: UpgradeOption | null;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
    character,
    gameState,
    setGameState,
    onLevelUp,
    onGameOver,
    newWeaponToAdd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const initializedRef = useRef(false);

  // Sprite containers
  const backgroundContainerRef = useRef<PIXI.Container | null>(null);
  const shadowContainerRef = useRef<PIXI.Container | null>(null);
  const entityContainerRef = useRef<PIXI.Container | null>(null);
  const effectContainerRef = useRef<PIXI.Container | null>(null);
  const uiContainerRef = useRef<PIXI.Container | null>(null);

  // Particle emitters
  const hitEmittersRef = useRef<Map<string, Emitter>>(new Map());
  const deathEmittersRef = useRef<Map<string, Emitter>>(new Map());

  // Sprite pools for performance
  const spritePoolRef = useRef<{
    player: PIXI.Sprite | null;
    enemies: Map<string, PIXI.Sprite>;
    projectiles: Map<string, PIXI.Graphics | PIXI.Sprite>;
    gems: Map<string, PIXI.Graphics>;
    shadows: Map<string, PIXI.Graphics>;
    damageTexts: Map<string, PIXI.Text>;
    trails: Array<{ sprite: PIXI.Graphics; life: number; maxLife: number }>;
  }>({
    player: null,
    enemies: new Map(),
    projectiles: new Map(),
    gems: new Map(),
    shadows: new Map(),
    damageTexts: new Map(),
    trails: []
  });

  // Texture refs
  const texturesRef = useRef<{
    sprite?: PIXI.Texture[];
    stand?: PIXI.Texture;
    maoyu?: PIXI.Texture;
    elf?: PIXI.Texture;
    grass2?: PIXI.Texture;
    grass3?: PIXI.Texture;
    particle?: PIXI.Texture;
  }>({});

  const spriteBoundsRef = useRef({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const standBoundsRef = useRef({ width: 0, height: 0, offsetX: 0, offsetY: 0 });

  // Movement state
  const isMovingRef = useRef(false);

  // Logic Refs
  const playerRef = useRef({
    pos: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 },
    stats: { ...character.stats },
    level: 1,
    exp: 0,
    nextLevelExp: 10,
    weapons: [] as Weapon[],
    passives: [] as string[],
    facing: { x: 1, y: 0 },
    invulnTimer: 0,
    isDead: false
  });

  const cameraRef = useRef({ x: MAP_WIDTH / 2 - CANVAS_WIDTH / 2, y: MAP_HEIGHT / 2 - CANVAS_HEIGHT / 2 });
  const entitiesRef = useRef<{
    enemies: Enemy[];
    projectiles: Projectile[];
    gems: Gem[];
    damageNumbers: DamageNumber[];
  }>({ enemies: [], projectiles: [], gems: [], damageNumbers: [] });

  const footprintsRef = useRef<Array<{ x: number; y: number; life: number; maxLife: number }>>([]);

  const inputRef = useRef<{ keys: Set<string>; mouse: Vector2 }>({ keys: new Set(), mouse: { x: 0, y: 0 } });
  const timeRef = useRef(0);
  const animationFrameRef = useRef(0);
  const spriteFrameCount = 8;
  const [hudStats, setHudStats] = useState({ hp: 100, maxHp: 100, exp: 0, nextExp: 10, level: 1, time: 0 });

  // Screen shake state
  const screenShakeRef = useRef({ x: 0, y: 0, intensity: 0, duration: 0 });

  // Apply Upgrade
  useEffect(() => {
    if (newWeaponToAdd && gameState === GameState.PLAYING) {
        const player = playerRef.current;
        if (newWeaponToAdd.type === 'weapon') {
            const existing = player.weapons.find(w => w.id === newWeaponToAdd.id);
            if (existing) {
                existing.level++;
                existing.baseDamage *= 1.2;
                existing.cooldownMax *= 0.95;

                // Weapon Evolution: Level 8 -> Evolved form
                if (existing.level === 8 && existing.evolvesInto) {
                    const evolvedDef = WEAPON_DEFS[existing.evolvesInto];
                    if (evolvedDef) {
                        const index = player.weapons.indexOf(existing);
                        player.weapons[index] = { ...evolvedDef, level: 1, cooldownTimer: existing.cooldownTimer };
                    }
                }
            } else {
                const def = WEAPON_DEFS[newWeaponToAdd.id];
                if (def) player.weapons.push({ ...def, level: 1, cooldownTimer: 0 });
            }
        } else if (newWeaponToAdd.type === 'passive') {
            player.passives.push(newWeaponToAdd.id);

            // Apply passive stat bonuses from PASSIVE_DEFS
            const passiveDef = PASSIVE_DEFS[newWeaponToAdd.id];
            if (passiveDef && passiveDef.statBonus) {
                Object.entries(passiveDef.statBonus).forEach(([stat, value]) => {
                    if (typeof value === 'number') {
                        (player.stats as any)[stat] = ((player.stats as any)[stat] || 0) + value;
                    }
                });
            }
        } else if (newWeaponToAdd.type === 'heal') {
            if(newWeaponToAdd.id === 'fantasy_gift') {
                player.stats.maxHp += 50;
                player.stats.hp = player.stats.maxHp;
                player.stats.luck += 0.1; // +10% luck
            } else if(newWeaponToAdd.name === '烤鸡') {
                player.stats.hp = Math.min(player.stats.hp + 50, player.stats.maxHp);
            }
        }
    }
  }, [newWeaponToAdd, gameState]);

  // Helper: Create hit particle emitter
  const createHitEmitter = (container: PIXI.Container | null, x: number, y: number): Emitter | null => {
    if (!texturesRef.current.particle || !container) {
      console.warn('Particle texture not loaded or container is null');
      return null;
    }

    const particleContainer = new PIXI.Container();
    particleContainer.x = x;
    particleContainer.y = y;
    container.addChild(particleContainer);

    const config: EmitterConfigV3 = {
      lifetime: { min: 0.2, max: 0.5 },
      frequency: 0.001,
      emitterLifetime: 0.2,
      maxParticles: 20,
      addAtBack: false,
      pos: { x: 0, y: 0 },
      behaviors: [
        {
          type: 'alpha',
          config: { alpha: { list: [{ time: 0, value: 1 }, { time: 1, value: 0 }] } }
        },
        {
          type: 'scale',
          config: { scale: { list: [{ time: 0, value: 1 }, { time: 1, value: 0.3 }] } }
        },
        {
          type: 'color',
          config: {
            color: {
              list: [
                { time: 0, value: 'ffff00' },
                { time: 0.5, value: 'ff6600' },
                { time: 1, value: 'ff0000' }
              ]
            }
          }
        },
        {
          type: 'moveSpeed',
          config: { speed: { list: [{ time: 0, value: 200 }, { time: 1, value: 50 }] } }
        },
        {
          type: 'rotationStatic',
          config: { min: 0, max: 360 }
        },
        {
          type: 'spawnShape',
          config: { type: 'circle', data: { radius: 10 } }
        },
        {
          type: 'textureSingle',
          config: { texture: texturesRef.current.particle }
        }
      ]
    };

    const emitter = new Emitter(particleContainer, config);
    return emitter;
  };

  // Helper: Create death explosion emitter
  const createDeathEmitter = (container: PIXI.Container | null, x: number, y: number, color: string): Emitter | null => {
    if (!texturesRef.current.particle || !container) {
      console.warn('Particle texture not loaded or container is null');
      return null;
    }

    const particleContainer = new PIXI.Container();
    particleContainer.x = x;
    particleContainer.y = y;
    container.addChild(particleContainer);

    const config: EmitterConfigV3 = {
      lifetime: { min: 0.5, max: 1.0 },
      frequency: 0.001,
      emitterLifetime: 0.15,
      maxParticles: 50,
      addAtBack: false,
      pos: { x: 0, y: 0 },
      behaviors: [
        {
          type: 'alpha',
          config: { alpha: { list: [{ time: 0, value: 1 }, { time: 1, value: 0 }] } }
        },
        {
          type: 'scale',
          config: { scale: { list: [{ time: 0, value: 1.5 }, { time: 1, value: 0.2 }] } }
        },
        {
          type: 'color',
          config: {
            color: {
              list: [
                { time: 0, value: color.replace('#', '') },
                { time: 0.5, value: 'ffffff' },
                { time: 1, value: '666666' }
              ]
            }
          }
        },
        {
          type: 'moveSpeed',
          config: { speed: { list: [{ time: 0, value: 300 }, { time: 1, value: 0 }] } }
        },
        {
          type: 'rotationStatic',
          config: { min: 0, max: 360 }
        },
        {
          type: 'spawnShape',
          config: { type: 'circle', data: { radius: 5 } }
        },
        {
          type: 'textureSingle',
          config: { texture: texturesRef.current.particle }
        }
      ]
    };

    const emitter = new Emitter(particleContainer, config);
    return emitter;
  };

  // Helper: Screen shake
  const triggerScreenShake = (intensity: number, duration: number) => {
    screenShakeRef.current = { x: 0, y: 0, intensity, duration };
  };

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application();
    let mounted = true;

    (async () => {
      try {
        await app.init({
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: 0x1a1a1a,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          autoStart: false  // 禁用自动渲染循环
        });

        // Check if component is still mounted and app.stage exists
        if (!mounted || !app.stage) return;

        if (containerRef.current) {
          containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
        }

        // Create and setup containers - only if stage exists
        if (app.stage) {
          backgroundContainerRef.current = new PIXI.Container();
          shadowContainerRef.current = new PIXI.Container();
          entityContainerRef.current = new PIXI.Container();
          effectContainerRef.current = new PIXI.Container();
          uiContainerRef.current = new PIXI.Container();

          app.stage.addChild(backgroundContainerRef.current);
          app.stage.addChild(shadowContainerRef.current);
          app.stage.addChild(entityContainerRef.current);
          app.stage.addChild(effectContainerRef.current);
          app.stage.addChild(uiContainerRef.current);
        }

        // 确保停止 PixiJS 的自动渲染，我们会手动控制
        app.ticker.stop();

        appRef.current = app;

        // Load textures
        // Load sprite sheet
        const spriteTexture = await PIXI.Assets.load(`${BASE_URL}sprite.png`);
        if (!mounted) return;

        const frameWidth = spriteTexture.width / spriteFrameCount;
        const frameHeight = spriteTexture.height;

        texturesRef.current.sprite = [];
        for (let i = 0; i < spriteFrameCount; i++) {
          const frame = new PIXI.Texture({
            source: spriteTexture.source,
            frame: new PIXI.Rectangle(i * frameWidth, 0, frameWidth, frameHeight)
          });
          texturesRef.current.sprite.push(frame);
        }

        // Calculate sprite bounds for collision
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = `${BASE_URL}sprite.png`;
          await new Promise((resolve) => { img.onload = resolve; });
          ctx.drawImage(img, 0, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
          const imageData = ctx.getImageData(0, 0, frameWidth, frameHeight);
          const data = imageData.data;
          let minX = frameWidth, maxX = 0, minY = frameHeight, maxY = 0;
          for (let y = 0; y < frameHeight; y++) {
            for (let x = 0; x < frameWidth; x++) {
              const alpha = data[(y * frameWidth + x) * 4 + 3];
              if (alpha > 50) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
              }
            }
          }
          spriteBoundsRef.current = {
            width: maxX - minX,
            height: maxY - minY,
            offsetX: minX - frameWidth / 2,
            offsetY: minY - frameHeight / 2
          };
        }

        // Load other textures
        texturesRef.current.stand = await PIXI.Assets.load(`${BASE_URL}stand.png`);
        if (!mounted) return;
        texturesRef.current.maoyu = await PIXI.Assets.load(`${BASE_URL}maoyu.png`);
        if (!mounted) return;
        texturesRef.current.elf = await PIXI.Assets.load(`${BASE_URL}elf.png`);
        if (!mounted) return;
        texturesRef.current.grass2 = await PIXI.Assets.load(`${BASE_URL}grass2.png`);
        if (!mounted) return;
        texturesRef.current.grass3 = await PIXI.Assets.load(`${BASE_URL}grass3.png`);
        if (!mounted) return;

        // Create particle texture (simple circle)
        const particleGraphics = new PIXI.Graphics();
        particleGraphics.circle(0, 0, 8);
        particleGraphics.fill(0xffffff);
        texturesRef.current.particle = app.renderer.generateTexture(particleGraphics);

        initializedRef.current = true;
      } catch (error) {
        console.error('Error loading textures:', error);
      }
    })();

    return () => {
      mounted = false;
      initializedRef.current = false;

      // 停止 ticker
      if (app?.ticker) {
        app.ticker.stop();
      }

      // Clean up emitters
      hitEmittersRef.current.forEach(emitter => {
        try {
          emitter.destroy();
        } catch (e) {
          console.warn('Error destroying emitter:', e);
        }
      });
      deathEmittersRef.current.forEach(emitter => {
        try {
          emitter.destroy();
        } catch (e) {
          console.warn('Error destroying emitter:', e);
        }
      });
      hitEmittersRef.current.clear();
      deathEmittersRef.current.clear();

      // 先清空容器引用但不销毁它们（让 app.destroy 来处理）
      backgroundContainerRef.current = null;
      shadowContainerRef.current = null;
      entityContainerRef.current = null;
      effectContainerRef.current = null;
      uiContainerRef.current = null;

      // Destroy app - 这会自动销毁 stage 和所有子容器
      try {
        if (app && app.renderer) {
          // PixiJS v8 的 destroy 方法
          app.destroy(true);
        }
      } catch (e) {
        console.warn('Error destroying app:', e);
        // 如果 app.destroy 失败，尝试手动清理
        try {
          if (app?.renderer) {
            app.renderer.destroy();
          }
        } catch (e2) {
          console.warn('Error destroying renderer:', e2);
        }
      }
    };
  }, []);

  // Init game logic
  useEffect(() => {
    if (playerRef.current.weapons.length === 0) {
        playerRef.current.stats = { ...character.stats };
        const startWep = WEAPON_DEFS[character.startingWeaponId];
        if (startWep) playerRef.current.weapons.push({ ...startWep, level: 1, cooldownTimer: 0 });
    }

    const handleKeyDown = (e: KeyboardEvent) => inputRef.current.keys.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => inputRef.current.keys.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => {
        if(containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            inputRef.current.mouse = {
                x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
                y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
            };
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const update = useCallback(() => {
    // 移除 gameState 检查，让游戏始终运行
    // if (gameState !== GameState.PLAYING) {
    //   console.log('Game not playing, state:', gameState);
    //   return;
    // }

    const dt = GAME_SPEED;
    timeRef.current += dt;
    const player = playerRef.current;
    const ents = entitiesRef.current;
    const camera = cameraRef.current;

    // Update screen shake
    if (screenShakeRef.current.duration > 0) {
      screenShakeRef.current.duration -= dt;
      const intensity = screenShakeRef.current.intensity * (screenShakeRef.current.duration / 10);
      screenShakeRef.current.x = (Math.random() - 0.5) * intensity;
      screenShakeRef.current.y = (Math.random() - 0.5) * intensity;
    } else {
      screenShakeRef.current.x = 0;
      screenShakeRef.current.y = 0;
    }

    // Camera
    camera.x += (player.pos.x - CANVAS_WIDTH / 2 - camera.x) * 0.1;
    camera.y += (player.pos.y - CANVAS_HEIGHT / 2 - camera.y) * 0.1;
    camera.x = Math.max(0, Math.min(camera.x, MAP_WIDTH - CANVAS_WIDTH));
    camera.y = Math.max(0, Math.min(camera.y, MAP_HEIGHT - CANVAS_HEIGHT));

    // Player Move
    if (!player.isDead) {
        let dx = 0, dy = 0;
        const keys = inputRef.current.keys;
        if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            player.facing = { x: dx/len, y: dy/len };
            player.pos.x += (dx/len) * player.stats.speed * dt;
            player.pos.y += (dy/len) * player.stats.speed * dt;
            player.pos.x = Math.max(10, Math.min(MAP_WIDTH - 10, player.pos.x));
            player.pos.y = Math.max(10, Math.min(MAP_HEIGHT - 10, player.pos.y));
            isMovingRef.current = true;

            // Add footprint
            if (Math.floor(timeRef.current) % 5 === 0) {
                let footOffset = 30;
                if (character.id === 'mokou') {
                    const targetHeight = 180;
                    const isMoving = isMovingRef.current;
                    if (isMoving && texturesRef.current.sprite) {
                        const scaleMove = targetHeight / (texturesRef.current.sprite[0].height);
                        const bounds = spriteBoundsRef.current;
                        footOffset = (bounds.offsetY + bounds.height) * scaleMove;
                    } else {
                        footOffset = 90;
                    }
                }
                footprintsRef.current.push({
                    x: player.pos.x,
                    y: player.pos.y + footOffset,
                    life: 300,
                    maxLife: 300
                });
            }
        } else {
            isMovingRef.current = false;
        }
    }

    // Update footprints - 限制最大脚印数量
    const MAX_FOOTPRINTS = 30;  // 最大脚印数量
    if (footprintsRef.current.length > MAX_FOOTPRINTS) {
        footprintsRef.current.splice(0, footprintsRef.current.length - MAX_FOOTPRINTS);
    }

    for (let i = footprintsRef.current.length - 1; i >= 0; i--) {
        footprintsRef.current[i].life -= dt;
        if (footprintsRef.current[i].life <= 0) {
            footprintsRef.current.splice(i, 1);
        }
    }

    // Regen
    if (Math.floor(timeRef.current) % 60 === 0 && player.stats.hp < player.stats.maxHp && player.stats.hp > 0) {
        player.stats.hp += player.stats.recovery;
    }
    if (player.invulnTimer > 0) player.invulnTimer -= dt;

    // Spawn Enemies - 限制最大敌人数量
    const MAX_ENEMIES = 200;  // 最大敌人数量
    const seconds = timeRef.current / FPS;
    let currentWave = WAVES[0];
    for(const w of WAVES) { if (seconds >= w.time) currentWave = w; }

    if (ents.enemies.length < MAX_ENEMIES && Math.floor(timeRef.current) % Math.max(1, Math.floor(currentWave.interval / dt)) === 0) {
        const angle = Math.random() * Math.PI * 2;
        const r = 800;
        const enemyType = currentWave.enemyStats.type as any;
        ents.enemies.push({
            id: Math.random().toString(),
            position: { x: player.pos.x + Math.cos(angle)*r, y: player.pos.y + Math.sin(angle)*r },
            velocity: { x: 0, y: 0 },
            radius: currentWave.enemyStats.type === 'boss' ? 60 : 22.5,
            color: currentWave.enemyStats.color,
            hp: currentWave.enemyStats.hp,
            maxHp: currentWave.enemyStats.hp,
            damage: currentWave.enemyStats.damage,
            speed: currentWave.enemyStats.speed,
            type: enemyType,
            expValue: currentWave.enemyStats.exp,
            frozen: 0,
            bounceTimer: enemyType === 'slime' ? Math.random() * 60 : undefined,
            bounceHeight: 0,
            isJumping: false,
            shootTimer: enemyType === 'elf' ? Math.random() * 120 : undefined
        });
    }

    // Weapons
    player.weapons.forEach(w => {
        w.cooldownTimer -= dt;
        if (w.cooldownTimer <= 0) {
            let target = null;
            let minDist = Infinity;
            ents.enemies.forEach(e => {
                if (!e) return;
                const d = Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y);
                if (d < 800 && d < minDist) { minDist = d; target = {x: e.position.x-player.pos.x, y: e.position.y-player.pos.y}; }
            });
            if (!target) target = player.facing;

            const projs = w.onFire(player.pos, target, player.stats, timeRef.current);
            ents.projectiles.push(...projs);
            w.cooldownTimer = w.cooldownMax * player.stats.cooldown;
        }
    });

    // Projectiles - 限制最大抛射物数量
    const MAX_PROJECTILES = 500;  // 最大抛射物数量
    if (ents.projectiles.length > MAX_PROJECTILES) {
        // 删除最老的抛射物
        ents.projectiles.splice(0, ents.projectiles.length - MAX_PROJECTILES);
    }

    for (let i = ents.projectiles.length - 1; i >= 0; i--) {
        const p = ents.projectiles[i];
        p.duration -= dt;

        if (p.orbitRadius) {
            p.orbitAngle = (p.orbitAngle || 0) + (p.orbitSpeed || 0.1) * dt;
            p.position.x = player.pos.x + Math.cos(p.orbitAngle) * p.orbitRadius * player.stats.area;
            p.position.y = player.pos.y + Math.sin(p.orbitAngle) * p.orbitRadius * player.stats.area;
        }
        else if (p.returnToPlayer) {
             const progress = 1 - (p.duration / p.maxDuration);
             if (progress > 0.5) {
                 const angle = Math.atan2(player.pos.y - p.position.y, player.pos.x - p.position.x);
                 const speed = Math.hypot(p.velocity.x, p.velocity.y);
                 p.velocity.x = Math.cos(angle) * speed;
                 p.velocity.y = Math.sin(angle) * speed;
             }
             p.position.x += p.velocity.x * dt;
             p.position.y += p.velocity.y * dt;
             p.sprite = (Math.floor(timeRef.current / 5) % 2 === 0) ? '🥄' : '❕';
        }
        else {
            p.position.x += p.velocity.x * dt;
            p.position.y += p.velocity.y * dt;
        }

        if (character.id === 'sakuya' && p.radius < 10) {
             if (p.position.x < camera.x || p.position.x > camera.x + CANVAS_WIDTH) p.velocity.x *= -1;
             if (p.position.y < camera.y || p.position.y > camera.y + CANVAS_HEIGHT) p.velocity.y *= -1;
        }

        if (p.duration <= 0) {
            ents.projectiles.splice(i, 1);
            continue;
        }

        if (p.isTimeStop) {
            ents.enemies.forEach(e => {
                if (!e) return;
                if (Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y) < 800) e.frozen = 10;
            });
            continue;
        }
        if (p.isBlackHole) {
            ents.enemies.forEach(e => {
                if (!e) return;
                const dist = Math.hypot(e.position.x - p.position.x, e.position.y - p.position.y);
                if (dist < 300) {
                    e.position.x += (p.position.x - e.position.x) * 0.05 * dt;
                    e.position.y += (p.position.y - e.position.y) * 0.05 * dt;
                }
            });
        }

        if (p.isEnemyProjectile) {
            const playerDist = Math.hypot(p.position.x - player.pos.x, p.position.y - player.pos.y);
            if (playerDist < (p.radius * 1.5 + 22.5) && player.invulnTimer <= 0) {
                const dmg = Math.max(1, p.damage - player.stats.armor);
                player.stats.hp -= dmg;
                player.invulnTimer = 30;
                ents.damageNumbers.push({ id: Math.random().toString(), position: {...player.pos}, value: dmg, life: 30, isCrit: true });

                // Trigger hit effects
                triggerScreenShake(8, 10);
                if (texturesRef.current.particle) {
                  const emitter = createHitEmitter(effectContainerRef.current, player.pos.x, player.pos.y);
                  if (emitter) {
                    emitter.emit = true;
                    emitter.playOnce(() => {
                      emitter.destroy();
                    });
                  }
                }

                if (player.stats.hp <= 0) {
                    if (player.stats.revivals > 0) {
                        player.stats.revivals--;
                        player.stats.hp = player.stats.maxHp;
                        ents.enemies = [];
                        player.invulnTimer = 180;
                    } else {
                        player.isDead = true;
                        onGameOver(Math.floor(timeRef.current / FPS / 60));
                    }
                }

                ents.projectiles.splice(i, 1);
                break;
            }
            continue;
        }

        // Collision with enemies
        for (const e of ents.enemies) {
            if (!e || p.isTimeStop) continue;

            let hit = false;
            if (p.isLaser) {
                 hit = Math.abs(e.position.y - p.position.y) < p.radius && e.position.x > p.position.x;
            } else {
                 hit = Math.hypot(p.position.x - e.position.x, p.position.y - e.position.y) < (p.radius * player.stats.area + e.radius);
            }

            if (hit) {
                if (e.hp > 0) {
                    let dmg = p.damage;

                    // Koishi damage variance: 50%-200%
                    if (character.id === 'koishi') {
                        const variance = 0.5 + Math.random() * 1.5; // 0.5 to 2.0
                        dmg *= variance;
                    }

                    // Critical Hit System
                    const isCrit = Math.random() < player.stats.critRate;
                    if (isCrit) {
                        dmg *= player.stats.critDamage;
                    }

                    e.hp -= dmg;
                    ents.damageNumbers.push({ id: Math.random().toString(), position: {...e.position}, value: Math.floor(dmg), life: 30, isCrit });

                    // Hit effect
                    if (texturesRef.current.particle) {
                      const emitter = createHitEmitter(effectContainerRef.current, e.position.x, e.position.y);
                      if (emitter) {
                        emitter.emit = true;
                        emitter.playOnce(() => {
                          emitter.destroy();
                        });
                      }
                    }

                    if (p.knockback) {
                        const kAngle = Math.atan2(e.position.y - p.position.y, e.position.x - p.position.x);
                        e.velocity.x += Math.cos(kAngle) * p.knockback;
                        e.velocity.y += Math.sin(kAngle) * p.knockback;
                    }
                    if (character.id === 'yuma') {
                        if (Math.random() < 0.1) player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 1);
                    }
                }

                if (!p.isLaser && !p.isBlackHole && !p.orbitRadius) {
                    p.penetration--;
                    if (p.penetration <= 0) {
                        ents.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }

    // Damage Numbers - 限制最大伤害数字数量
    const MAX_DAMAGE_NUMBERS = 50;  // 最大伤害数字数量
    if (ents.damageNumbers.length > MAX_DAMAGE_NUMBERS) {
        // 删除最老的伤害数字
        ents.damageNumbers.splice(0, ents.damageNumbers.length - MAX_DAMAGE_NUMBERS);
    }

    for (let i = ents.damageNumbers.length - 1; i >= 0; i--) {
        const d = ents.damageNumbers[i];
        d.life -= dt;
        d.position.y -= 0.5 * dt;
        if (d.life <= 0) {
            ents.damageNumbers.splice(i, 1);
        }
    }

    // Enemies - 清理离玩家太远的敌人
    for (let i = ents.enemies.length - 1; i >= 0; i--) {
        const e = ents.enemies[i];

        if (!e) {
            ents.enemies.splice(i, 1);
            continue;
        }

        // 删除距离玩家太远的敌人（超过2倍屏幕宽度）
        const distToPlayer = Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y);
        if (distToPlayer > CANVAS_WIDTH * 2) {
            ents.enemies.splice(i, 1);
            continue;
        }

        // Death
        if (e.hp <= 0) {
            ents.gems.push({ id: Math.random().toString(), position: {...e.position}, velocity: {x:0,y:0}, radius: 4, color: '#3498db', value: e.expValue, type: 'small' });

            // Death particle effect
            if (texturesRef.current.particle) {
              const emitter = createDeathEmitter(effectContainerRef.current, e.position.x, e.position.y, e.color);
              if (emitter) {
                emitter.emit = true;
                emitter.playOnce(() => {
                  emitter.destroy();
                });
              }
            }

            ents.enemies.splice(i, 1);
            continue;
        }

        if (e.frozen > 0) {
            e.frozen -= dt;
            continue;
        }

        // Move
        const dx = player.pos.x - e.position.x;
        const dy = player.pos.y - e.position.y;
        const dist = Math.hypot(dx, dy);

        if (e.type === 'slime') {
            e.bounceTimer = (e.bounceTimer || 0) - dt;

            if (e.bounceTimer! <= 0) {
                e.bounceTimer = 60;
                e.isJumping = true;
                e.bounceHeight = 0;

                if (dist > 0) {
                    e.velocity.x = (dx/dist) * e.speed * 1.5;
                    e.velocity.y = (dy/dist) * e.speed * 1.5;
                }
            }

            if (e.isJumping) {
                e.bounceHeight = (e.bounceHeight || 0) + 1;
                if (e.bounceHeight! >= 30) {
                    e.isJumping = false;
                    e.bounceHeight = 0;
                    e.velocity.x *= 0.5;
                    e.velocity.y *= 0.5;
                }
            } else {
                e.velocity.x *= 0.9;
                e.velocity.y *= 0.9;
            }

            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;
        } else if (e.type === 'elf') {
            const targetDist = 300;

            if (dist > targetDist + 50) {
                if (dist > 0) {
                    e.velocity.x += (dx/dist) * 0.05 * dt;
                    e.velocity.y += (dy/dist) * 0.05 * dt;
                }
            } else if (dist < targetDist - 50) {
                if (dist > 0) {
                    e.velocity.x -= (dx/dist) * 0.05 * dt;
                    e.velocity.y -= (dy/dist) * 0.05 * dt;
                }
            }

            e.velocity.y += Math.sin(timeRef.current * 0.05) * 0.02 * dt;

            const spd = Math.hypot(e.velocity.x, e.velocity.y);
            if (spd > e.speed * 0.7) {
                e.velocity.x = (e.velocity.x/spd) * e.speed * 0.7;
                e.velocity.y = (e.velocity.y/spd) * e.speed * 0.7;
            }

            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;

            e.shootTimer = (e.shootTimer || 0) - dt;
            if (e.shootTimer! <= 0 && dist < 500) {
                e.shootTimer = 120;

                const shootAngle = Math.atan2(dy, dx);
                const bulletSpeed = 6;

                ents.projectiles.push({
                    id: Math.random().toString(36).substr(2, 9),
                    position: { x: e.position.x, y: e.position.y },
                    velocity: { x: Math.cos(shootAngle) * bulletSpeed, y: Math.sin(shootAngle) * bulletSpeed },
                    radius: 9,
                    color: '#ff69b4',
                    damage: e.damage * 0.5,
                    duration: 180,
                    maxDuration: 180,
                    penetration: 1,
                    knockback: 0,
                    sprite: '●',
                    isEnemyProjectile: true
                });
            }
        } else if (e.type === 'boss') {
            // Boss AI: Maintain distance and shoot patterns
            const targetDist = 400;

            if (dist > targetDist + 100) {
                if (dist > 0) {
                    e.velocity.x += (dx/dist) * 0.08 * dt;
                    e.velocity.y += (dy/dist) * 0.08 * dt;
                }
            } else if (dist < targetDist - 100) {
                if (dist > 0) {
                    e.velocity.x -= (dx/dist) * 0.08 * dt;
                    e.velocity.y -= (dy/dist) * 0.08 * dt;
                }
            }

            e.velocity.x *= 0.95;
            e.velocity.y *= 0.95;

            const spd = Math.hypot(e.velocity.x, e.velocity.y);
            if (spd > e.speed * 0.8) {
                e.velocity.x = (e.velocity.x/spd) * e.speed * 0.8;
                e.velocity.y = (e.velocity.y/spd) * e.speed * 0.8;
            }

            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;

            // Boss Attack Patterns
            e.shootTimer = (e.shootTimer || 0) - dt;
            if (e.shootTimer! <= 0 && dist < 600) {
                e.shootTimer = 80; // Attack every ~1.3 seconds

                // Pattern 1: Spiral bullets (Rumia style)
                if (e.color === '#2c2c2c') {
                    for(let i=0; i<8; i++) {
                        const angle = (timeRef.current * 0.05 + i * (Math.PI*2/8));
                        const bulletSpeed = 4;
                        ents.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: e.position.x, y: e.position.y },
                            velocity: { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed },
                            radius: 8,
                            color: '#8b0000',
                            damage: e.damage * 0.6,
                            duration: 200,
                            maxDuration: 200,
                            penetration: 1,
                            knockback: 0,
                            sprite: '●',
                            isEnemyProjectile: true
                        });
                    }
                }
                // Pattern 2: Radial ice (Cirno style)
                else if (e.color === '#3498db') {
                    for(let i=0; i<12; i++) {
                        const angle = i * (Math.PI*2/12);
                        const bulletSpeed = 5;
                        ents.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: e.position.x, y: e.position.y },
                            velocity: { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed },
                            radius: 10,
                            color: '#00ffff',
                            damage: e.damage * 0.7,
                            duration: 180,
                            maxDuration: 180,
                            penetration: 1,
                            knockback: 0,
                            sprite: '❄',
                            isEnemyProjectile: true
                        });
                    }
                }
                // Pattern 3: Dense danmaku (Yukari style)
                else if (e.color === '#8e44ad') {
                    for(let i=0; i<16; i++) {
                        const angle = i * (Math.PI*2/16) + Math.random() * 0.3;
                        const bulletSpeed = 6 + Math.random() * 2;
                        ents.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: e.position.x, y: e.position.y },
                            velocity: { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed },
                            radius: 9,
                            color: '#9b59b6',
                            damage: e.damage * 0.8,
                            duration: 160,
                            maxDuration: 160,
                            penetration: 1,
                            knockback: 0,
                            sprite: '◆',
                            isEnemyProjectile: true
                        });
                    }
                }
            }
        } else {
            if (dist > 0) {
                e.velocity.x += (dx/dist) * 0.1 * dt;
                e.velocity.y += (dy/dist) * 0.1 * dt;
            }
            const spd = Math.hypot(e.velocity.x, e.velocity.y);
            if (spd > e.speed) {
                e.velocity.x = (e.velocity.x/spd) * e.speed;
                e.velocity.y = (e.velocity.y/spd) * e.speed;
            }
            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;
        }

        // Hit Player
        let playerRadius = 22.5;
        if (character.id === 'mokou') {
            const targetHeight = 180;
            const isMoving = isMovingRef.current;
            if (isMoving && texturesRef.current.sprite) {
                const scaleMove = targetHeight / (texturesRef.current.sprite[0].height);
                playerRadius = Math.max(spriteBoundsRef.current.width, spriteBoundsRef.current.height) * scaleMove / 2;
            }
        }

        if (dist < (e.radius + playerRadius) && player.invulnTimer <= 0) {
            const dmg = Math.max(1, e.damage - player.stats.armor);
            player.stats.hp -= dmg;
            player.invulnTimer = 30;
            ents.damageNumbers.push({ id: Math.random().toString(), position: {...player.pos}, value: dmg, life: 30, isCrit: true });

            // Hit effect
            triggerScreenShake(10, 15);
            if (texturesRef.current.particle) {
              const emitter = createHitEmitter(effectContainerRef.current, player.pos.x, player.pos.y);
              if (emitter) {
                emitter.emit = true;
                emitter.playOnce(() => {
                  emitter.destroy();
                });
              }
            }

            if (player.stats.hp <= 0) {
                if (player.stats.revivals > 0) {
                    player.stats.revivals--;
                    player.stats.hp = player.stats.maxHp;
                    ents.enemies = [];
                    player.invulnTimer = 180;
                } else {
                    player.isDead = true;
                    onGameOver(Math.floor(timeRef.current / FPS / 60));
                }
            }
        }
    }

    // Gems - 限制最大宝石数量
    const MAX_GEMS = 300;  // 最大宝石数量
    if (ents.gems.length > MAX_GEMS) {
        // 删除最远的宝石
        ents.gems.sort((a, b) => {
            const distA = Math.hypot(player.pos.x - a.position.x, player.pos.y - a.position.y);
            const distB = Math.hypot(player.pos.x - b.position.x, player.pos.y - b.position.y);
            return distB - distA;
        });
        ents.gems.splice(MAX_GEMS);
    }

    for (let i = ents.gems.length - 1; i >= 0; i--) {
        const g = ents.gems[i];
        const dist = Math.hypot(player.pos.x - g.position.x, player.pos.y - g.position.y);

        // 删除距离太远的宝石（超过1.5倍屏幕宽度）
        if (dist > CANVAS_WIDTH * 1.5) {
            ents.gems.splice(i, 1);
            continue;
        }

        if (dist < player.stats.pickupRange) {
            g.position.x += (player.pos.x - g.position.x) * 0.1 * dt;
            g.position.y += (player.pos.y - g.position.y) * 0.1 * dt;
            if (dist < 20) {
                player.exp += g.value;
                if (player.exp >= player.nextLevelExp) {
                    player.level++;
                    player.exp -= player.nextLevelExp;

                    // Segmented Experience Curve
                    if (player.level <= 20) {
                        player.nextLevelExp = Math.floor(10 + (player.level - 1) * 3); // 10, 13, 16, ...
                    } else if (player.level <= 40) {
                        player.nextLevelExp = Math.floor(70 + (player.level - 21) * 5); // 70, 75, 80, ...
                    } else {
                        player.nextLevelExp = Math.floor(170 + (player.level - 41) * 8); // 170, 178, 186, ...
                    }

                    onLevelUp(player.weapons, player.passives, player.stats.hp, player.stats.maxHp, timeRef.current / FPS, player.stats);
                }
                ents.gems.splice(i, 1);
            }
        }
    }

    // Sync HUD
    if (Math.floor(timeRef.current) % 10 === 0) {
        setHudStats({
            hp: Math.ceil(player.stats.hp),
            maxHp: player.stats.maxHp,
            exp: player.exp,
            nextExp: player.nextLevelExp,
            level: player.level,
            time: Math.floor(timeRef.current / FPS)
        });
    }

    // Update sprite animation
    if (isMovingRef.current && Math.floor(timeRef.current) % 8 === 0) {
        animationFrameRef.current = (animationFrameRef.current + 1) % spriteFrameCount;
    }

    // Update projectile trails - 限制最大轨迹数量
    const MAX_TRAILS = 100;  // 最大轨迹数量
    const trails = spritePoolRef.current.trails;
    if (trails.length > MAX_TRAILS) {
        // 删除最老的轨迹
        for (let i = 0; i < trails.length - MAX_TRAILS; i++) {
            trails[i].sprite.destroy();
        }
        trails.splice(0, trails.length - MAX_TRAILS);
    }

    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].life -= dt;
      trails[i].sprite.alpha = trails[i].life / trails[i].maxLife;
      if (trails[i].life <= 0) {
        trails[i].sprite.destroy();
        trails.splice(i, 1);
      }
    }

  }, [gameState, character, onGameOver, onLevelUp]);

  // Render
  const render = useCallback(() => {
    if (!appRef.current || !appRef.current.stage) return;

    // Check if all containers are initialized
    if (!backgroundContainerRef.current || !shadowContainerRef.current ||
        !entityContainerRef.current || !effectContainerRef.current ||
        !uiContainerRef.current) {
      return;
    }

    const camera = cameraRef.current;
    const player = playerRef.current;
    const ents = entitiesRef.current;
    const shake = screenShakeRef.current;

    // Apply camera and screen shake
    const offsetX = -camera.x + shake.x;
    const offsetY = -camera.y + shake.y;

    backgroundContainerRef.current.x = offsetX;
    backgroundContainerRef.current.y = offsetY;
    shadowContainerRef.current.x = offsetX;
    shadowContainerRef.current.y = offsetY;
    entityContainerRef.current.x = offsetX;
    entityContainerRef.current.y = offsetY;
    effectContainerRef.current.x = offsetX;
    effectContainerRef.current.y = offsetY;

    // Render background tiles - 清理并销毁旧对象
    backgroundContainerRef.current.removeChildren().forEach(child => child.destroy());
    if (texturesRef.current.grass2 && texturesRef.current.grass3) {
      const targetSize = 270;
      const startX = Math.floor(camera.x / targetSize) * targetSize;
      const startY = Math.floor(camera.y / targetSize) * targetSize;
      const endX = camera.x + CANVAS_WIDTH + targetSize;
      const endY = camera.y + CANVAS_HEIGHT + targetSize;

      for (let y = startY; y < endY; y += targetSize) {
        for (let x = startX; x < endX; x += targetSize) {
          const tileIndex = Math.floor(x / targetSize) + Math.floor(y / targetSize);
          const pattern = tileIndex % 4;

          const texture = (pattern === 0 || pattern === 1) ? texturesRef.current.grass2 : texturesRef.current.grass3;
          const sprite = new PIXI.Sprite(texture);
          sprite.x = x;
          sprite.y = y;
          sprite.width = targetSize;
          sprite.height = targetSize;
          if (pattern === 1 || pattern === 3) {
            sprite.scale.x *= -1;
            sprite.x += targetSize;
          }
          backgroundContainerRef.current.addChild(sprite);
        }
      }
    }

    // Render footprints
    footprintsRef.current.forEach(fp => {
      const graphics = new PIXI.Graphics();
      const alpha = (fp.life / fp.maxLife) * 0.15;
      graphics.circle(fp.x, fp.y, 30);
      graphics.fill({ color: 0x000000, alpha });
      backgroundContainerRef.current.addChild(graphics);
    });

    // Border
    const border = new PIXI.Graphics();
    border.rect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    border.stroke({ width: 5, color: 0xff0000 });
    backgroundContainerRef.current.addChild(border);

    // Render shadows - 清理并销毁旧对象
    shadowContainerRef.current.removeChildren().forEach(child => child.destroy());

    // Player shadow
    const playerShadow = new PIXI.Graphics();
    const playerShadowWidth = 60;
    const playerShadowHeight = 20;
    playerShadow.ellipse(player.pos.x, player.pos.y + 80, playerShadowWidth, playerShadowHeight);
    playerShadow.fill({ color: 0x000000, alpha: 0.3 });
    shadowContainerRef.current.addChild(playerShadow);

    // Enemy shadows
    ents.enemies.forEach(e => {
      if (!e) return;
      const shadow = new PIXI.Graphics();
      let shadowWidth = e.radius * 1.2;
      let shadowHeight = e.radius * 0.4;
      let shadowY = e.position.y + e.radius;
      let shadowAlpha = 0.3;

      // Adjust shadow for jumping slimes
      if (e.type === 'slime' && e.isJumping) {
        const jumpProgress = (e.bounceHeight || 0) / 30;
        const heightOffset = Math.sin(jumpProgress * Math.PI) * 30;
        shadowY += heightOffset * 0.5;
        shadowWidth *= (1 - jumpProgress * 0.5);
        shadowHeight *= (1 - jumpProgress * 0.5);
        shadowAlpha *= (1 - jumpProgress * 0.4);
      }

      // Adjust shadow for flying elves
      if (e.type === 'elf') {
        const floatOffset = Math.sin(timeRef.current * 0.1) * 5;
        shadowY += Math.abs(floatOffset) * 2;
        shadowWidth *= 0.8;
        shadowHeight *= 0.6;
        shadowAlpha *= 0.6;
      }

      shadow.ellipse(e.position.x, shadowY, shadowWidth, shadowHeight);
      shadow.fill({ color: 0x000000, alpha: shadowAlpha });
      shadowContainerRef.current.addChild(shadow);
    });

    // Render entities - 清理并销毁旧对象
    entityContainerRef.current.removeChildren().forEach(child => child.destroy());

    // Gems
    ents.gems.forEach(g => {
      const graphics = new PIXI.Graphics();
      graphics.circle(g.position.x, g.position.y, g.radius * 1.5);
      graphics.fill(g.color);
      entityContainerRef.current.addChild(graphics);
    });

    // Enemies
    ents.enemies.forEach(e => {
      if (!e) return;

      if (e.type === 'slime' && texturesRef.current.maoyu) {
        const sprite = new PIXI.Sprite(texturesRef.current.maoyu);
        sprite.anchor.set(0.5);

        const targetSize = 80;
        const scale = targetSize / Math.max(texturesRef.current.maoyu.width, texturesRef.current.maoyu.height);

        const bounceScale = e.isJumping ? 1 + Math.sin((e.bounceHeight || 0) / 30 * Math.PI) * 0.3 : 1;
        const bounceOffset = e.isJumping ? -Math.sin((e.bounceHeight || 0) / 30 * Math.PI) * 15 : 0;

        sprite.x = e.position.x;
        sprite.y = e.position.y + bounceOffset;
        sprite.scale.x = (e.velocity.x > 0.1 ? -1 : 1) * scale * bounceScale;
        sprite.scale.y = scale * bounceScale;

        if (!e.isJumping && (e.bounceTimer || 60) > 50) {
          sprite.scale.x *= 1.2;
          sprite.scale.y *= 0.8;
        }

        if (e.frozen > 0) {
          sprite.alpha = 0.7;
          sprite.tint = 0x8888ff;
        }

        entityContainerRef.current.addChild(sprite);
      } else if (e.type === 'elf' && texturesRef.current.elf) {
        const sprite = new PIXI.Sprite(texturesRef.current.elf);
        sprite.anchor.set(0.5);

        const targetSize = 75;
        const scale = targetSize / Math.max(texturesRef.current.elf.width, texturesRef.current.elf.height);
        const floatOffset = Math.sin(timeRef.current * 0.1) * 5;

        sprite.x = e.position.x;
        sprite.y = e.position.y + floatOffset;
        sprite.scale.x = (e.velocity.x < -0.1 ? -1 : 1) * scale;
        sprite.scale.y = scale;

        if (e.frozen > 0) {
          sprite.alpha = 0.7;
          sprite.tint = 0x8888ff;
        }

        entityContainerRef.current.addChild(sprite);
      } else {
        const graphics = new PIXI.Graphics();
        graphics.circle(e.position.x, e.position.y, e.radius);
        graphics.fill(e.frozen > 0 ? 0x3498db : e.color);
        entityContainerRef.current.addChild(graphics);
      }
    });

    // Projectiles with trails
    ents.projectiles.forEach(p => {
      // Add trail for fast projectiles
      if (!p.isLaser && !p.orbitRadius && Math.hypot(p.velocity.x, p.velocity.y) > 5) {
        const trail = new PIXI.Graphics();
        trail.circle(p.position.x, p.position.y, p.radius * 1.5 * 0.5);
        trail.fill({ color: p.color, alpha: 0.3 });
        effectContainerRef.current.addChild(trail);
        spritePoolRef.current.trails.push({ sprite: trail, life: 10, maxLife: 10 });
      }

      if (p.isLaser) {
        const graphics = new PIXI.Graphics();
        graphics.rect(player.pos.x, player.pos.y - p.radius * 1.5 / 2, 2000, p.radius * 1.5);
        graphics.fill(p.color);
        entityContainerRef.current.addChild(graphics);
      } else if (p.sprite) {
        const text = new PIXI.Text({
          text: p.sprite,
          style: { fontSize: 36, fill: p.color }
        });
        text.x = p.position.x - 15;
        text.y = p.position.y - 15;
        entityContainerRef.current.addChild(text);
      } else {
        const graphics = new PIXI.Graphics();
        graphics.circle(p.position.x, p.position.y, p.radius * 1.5);
        graphics.fill(p.color);
        entityContainerRef.current.addChild(graphics);
      }
    });

    // Player
    if (player.invulnTimer <= 0 || (player.invulnTimer % 10 < 5)) {
      if (character.id === 'mokou') {
        const isMoving = isMovingRef.current;
        const texture = isMoving && texturesRef.current.sprite
          ? texturesRef.current.sprite[(spriteFrameCount - 1) - animationFrameRef.current]
          : texturesRef.current.stand;

        if (texture) {
          const sprite = new PIXI.Sprite(texture);
          sprite.anchor.set(0.5);
          const targetHeight = 180;
          const scale = targetHeight / texture.height;
          sprite.x = player.pos.x;
          sprite.y = player.pos.y;
          sprite.scale.x = (player.facing.x < 0 ? -1 : 1) * scale;
          sprite.scale.y = scale;
          entityContainerRef.current.addChild(sprite);
        } else {
          const graphics = new PIXI.Graphics();
          graphics.circle(player.pos.x, player.pos.y, 30);
          graphics.fill(character.color);
          entityContainerRef.current.addChild(graphics);
        }
      } else {
        const graphics = new PIXI.Graphics();
        graphics.circle(player.pos.x, player.pos.y, 30);
        graphics.fill(character.color);
        entityContainerRef.current.addChild(graphics);
      }
    }

    // Damage Numbers - 清理并销毁旧对象
    uiContainerRef.current.removeChildren().forEach(child => child.destroy());
    ents.damageNumbers.forEach(d => {
      const text = new PIXI.Text({
        text: d.value.toString(),
        style: { fontSize: 24, fill: d.isCrit ? 0xff0000 : 0xffffff, fontWeight: 'bold' }
      });
      text.x = d.position.x - camera.x;
      text.y = d.position.y - camera.y;
      text.alpha = d.life / 30;
      uiContainerRef.current.addChild(text);
    });

    // Update particle emitters
    const deltaTime = 1 / 60;
    hitEmittersRef.current.forEach((emitter, key) => {
      emitter.update(deltaTime);
      if (emitter.emit === false && emitter.particleCount === 0) {
        emitter.destroy();
        hitEmittersRef.current.delete(key);
      }
    });
    deathEmittersRef.current.forEach((emitter, key) => {
      emitter.update(deltaTime);
      if (emitter.emit === false && emitter.particleCount === 0) {
        emitter.destroy();
        deathEmittersRef.current.delete(key);
      }
    });

    // 手动触发 PixiJS 渲染
    if (appRef.current && appRef.current.stage) {
      appRef.current.renderer.render(appRef.current.stage);
    }

  }, [character]);

  // Game loop
  useEffect(() => {
    if (!appRef.current) return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (time: number) => {
      // Only run update and render if fully initialized
      if (initializedRef.current) {
        const delta = time - lastTime;
        if (delta >= 1000 / FPS) {
          try {
            update();
            render();
          } catch (error) {
            console.error('Error in game loop:', error);
          }
          lastTime = time;
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [update, render]);

  return (
    <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center">
        <div ref={containerRef} className="border bg-black" />
        <div className="absolute top-4 left-4 text-white font-mono text-lg">
            HP: {hudStats.hp}/{hudStats.maxHp} | LV: {hudStats.level} | TIME: {Math.floor(hudStats.time/60).toString().padStart(2,'0')}:{(hudStats.time%60).toString().padStart(2,'0')}
        </div>
    </div>
  );
};
