import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Emitter, EmitterConfigV3 } from '@pixi/particle-emitter';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, FPS, WEAPON_DEFS, WAVES, GAME_SPEED, BOSS_CONFIGS } from '../constants';
import { GameState, CharacterConfig, Entity, Enemy, Projectile, Gem, DamageNumber, Weapon, UpgradeOption, Vector2 } from '../types';

interface GameCanvasProps {
  character: CharacterConfig;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onLevelUp: (currentWeapons: Weapon[], currentPassives: string[], hp: number, maxHp: number, time: number) => void;
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
    isDead: false,
    // 主动技能状态
    activeSkill: null as Weapon | null,
    activeSkillCooldown: 0,
    isDashing: false,
    dashTarget: { x: 0, y: 0 },
    dashProgress: 0
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Boss spawn tracking
  const bossSpawnedRef = useRef({ cirno: false, youmu: false, kaguya: false });

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
            } else {
                const def = WEAPON_DEFS[newWeaponToAdd.id];
                if (def) player.weapons.push({ ...def, level: 1, cooldownTimer: 0, upgrades: [] });
            }
        } else if (newWeaponToAdd.type === 'weapon_upgrade') {
            // Handle weapon upgrade tree choices
            const weaponToUpgrade = player.weapons.find(w => w.id === newWeaponToAdd.weaponId);
            if (weaponToUpgrade) {
                if (!weaponToUpgrade.upgrades) weaponToUpgrade.upgrades = [];
                weaponToUpgrade.upgrades.push(newWeaponToAdd.id);

                // Add the upgrade ID to player's passives so we can check it in weapon logic
                player.passives.push(newWeaponToAdd.id);
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
        const spriteTexture = await PIXI.Assets.load(`${import.meta.env.BASE_URL}sprite.png`);
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
          img.src = `${import.meta.env.BASE_URL}sprite.png`;
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
        texturesRef.current.stand = await PIXI.Assets.load(`${import.meta.env.BASE_URL}stand.png`);
        if (!mounted) return;
        texturesRef.current.maoyu = await PIXI.Assets.load(`${import.meta.env.BASE_URL}maoyu.png`);
        if (!mounted) return;
        texturesRef.current.elf = await PIXI.Assets.load(`${import.meta.env.BASE_URL}elf.png`);
        if (!mounted) return;
        texturesRef.current.grass2 = await PIXI.Assets.load(`${import.meta.env.BASE_URL}grass2.png`);
        if (!mounted) return;
        texturesRef.current.grass3 = await PIXI.Assets.load(`${import.meta.env.BASE_URL}grass3.png`);
        if (!mounted) return;

        // Create particle texture (simple circle)
        const particleGraphics = new PIXI.Graphics();
        particleGraphics.circle(0, 0, 8);
        particleGraphics.fill(0xffffff);
        texturesRef.current.particle = app.renderer.generateTexture(particleGraphics);

        console.log('All textures loaded');
        console.log('Setting initializedRef to true, gameState:', gameState);
        initializedRef.current = true;
        setIsInitialized(true); // Trigger useEffect
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
        if (startWep) playerRef.current.weapons.push({ ...startWep, level: 1, cooldownTimer: 0, upgrades: [] });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        inputRef.current.keys.add(e.code);

        // 空格键触发主动技能
        if (e.code === 'Space' && gameState === GameState.PLAYING) {
            e.preventDefault();
            const player = playerRef.current;

            // 查找主动技能（type === 'dash'）
            const activeSkill = player.weapons.find(w => w.type === 'dash');
            if (activeSkill && player.activeSkillCooldown <= 0 && !player.isDashing) {
                // 计算目标位置（鼠标位置）
                const mouseWorld = {
                    x: inputRef.current.mouse.x + cameraRef.current.x,
                    y: inputRef.current.mouse.y + cameraRef.current.y
                };

                player.isDashing = true;
                player.dashTarget = mouseWorld;
                player.dashProgress = 0;
                player.activeSkill = activeSkill;
                player.activeSkillCooldown = activeSkill.cooldownMax;
            }
        }
    };
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
  }, [gameState]);

  const update = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

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
                let footOffset = 20; // Reduced from 30 to 20
                if (character.id === 'mokou') {
                    const targetHeight = 100; // Reduced from 180 to 100
                    const isMoving = isMovingRef.current;
                    if (isMoving && texturesRef.current.sprite) {
                        const scaleMove = targetHeight / (texturesRef.current.sprite[0].height);
                        const bounds = spriteBoundsRef.current;
                        footOffset = (bounds.offsetY + bounds.height) * scaleMove;
                    } else {
                        footOffset = 50; // Reduced from 90 to 50
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

    // 主动技能冷却
    if (player.activeSkillCooldown > 0) {
        player.activeSkillCooldown -= dt;
    }

    // Dash 技能处理
    if (player.isDashing && player.activeSkill) {
        // kick_speed: 飞行速度 +200%，伤害 +100%
        let dashSpeed = 20;
        let damageMultiplier = 1.0;
        if (player.passives.includes('kick_speed')) {
            dashSpeed *= 3; // +200%
            damageMultiplier = 2.0; // +100%
        }

        const dx = player.dashTarget.x - player.pos.x;
        const dy = player.dashTarget.y - player.pos.y;
        const dist = Math.hypot(dx, dy);

        // 根据速度动态调整停止阈值，避免卡顿
        const stopThreshold = dashSpeed * dt * 2;
        if (dist > stopThreshold) {
            // 继续冲刺
            const moveX = (dx / dist) * dashSpeed * dt;
            const moveY = (dy / dist) * dashSpeed * dt;
            player.pos.x += moveX;
            player.pos.y += moveY;
            player.pos.x = Math.max(10, Math.min(MAP_WIDTH - 10, player.pos.x));
            player.pos.y = Math.max(10, Math.min(MAP_HEIGHT - 10, player.pos.y));

            // kick_trail: 业火之路 - 飞行轨迹留下持续伤害的火焰
            if (player.passives.includes('kick_trail') && Math.floor(timeRef.current) % 3 === 0) {
                ents.projectiles.push({
                    id: Math.random().toString(36).substr(2, 9),
                    position: { x: player.pos.x, y: player.pos.y },
                    velocity: { x: 0, y: 0 },
                    radius: 30,
                    color: '#ff4500',
                    damage: player.activeSkill!.baseDamage * player.stats.might * 0.3,
                    duration: 60,
                    maxDuration: 60,
                    penetration: 999,
                    knockback: 0,
                    sprite: '🔥'
                });
            }

            // 冲刺过程中造成伤害
            let killedCount = 0;
            ents.enemies.forEach(e => {
                if (!e) return;
                const eDist = Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y);
                if (eDist < 60 && e.hp > 0) {
                    const dmg = player.activeSkill!.baseDamage * player.stats.might * damageMultiplier;
                    const wasAlive = e.hp > 0;
                    e.hp -= dmg;

                    // kick_burn: 永恒之火 - 命中的敌人持续燃烧
                    if (player.passives.includes('kick_burn')) {
                        // Mark enemy for burning (we'll handle this in enemy update)
                        e.burnDuration = 180; // 3 seconds
                        e.burnDamage = dmg * 0.1; // 10% per tick
                    }

                    ents.damageNumbers.push({
                        id: Math.random().toString(),
                        position: {...e.position},
                        value: Math.floor(dmg),
                        life: 30,
                        isCrit: false
                    });

                    // kick_reset: 死神之舞 - 击杀敌人立即刷新冷却时间
                    if (player.passives.includes('kick_reset') && wasAlive && e.hp <= 0) {
                        killedCount++;
                    }

                    // 击退
                    const kAngle = Math.atan2(e.position.y - player.pos.y, e.position.x - player.pos.x);
                    e.velocity.x += Math.cos(kAngle) * 15;
                    e.velocity.y += Math.sin(kAngle) * 15;
                }
            });

            // 如果击杀了敌人，刷新CD
            if (killedCount > 0 && player.passives.includes('kick_reset')) {
                player.activeSkillCooldown = 0;
            }

            // kick_invuln: 不死之身 - 飞行过程中获得无敌时间
            if (player.passives.includes('kick_invuln')) {
                player.invulnTimer = Math.max(player.invulnTimer, 5);
            }
        } else {
            // 到达目标，结束冲刺
            player.isDashing = false;

            // kick_explosion: 燃尽一切 - 着陆时产生火焰爆炸
            if (player.passives.includes('kick_explosion')) {
                ents.enemies.forEach(e => {
                    if (!e) return;
                    const eDist = Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y);
                    if (eDist < 150 && e.hp > 0) {
                        const dmg = player.activeSkill!.baseDamage * player.stats.might * 0.5;
                        e.hp -= dmg;
                        ents.damageNumbers.push({
                            id: Math.random().toString(),
                            position: {...e.position},
                            value: Math.floor(dmg),
                            life: 30,
                            isCrit: true
                        });
                    }
                });
                triggerScreenShake(15, 20);
            }
        }
    }

    // Spawn Enemies - 限制最大敌人数量
    const MAX_ENEMIES = 200;  // 最大敌人数量
    const seconds = timeRef.current / FPS;
    let currentWave = WAVES[0];
    for(const w of WAVES) { if (seconds >= w.time) currentWave = w; }

    // Spawn Bosses at specific times
    if (seconds >= BOSS_CONFIGS.cirno.spawnTime && !bossSpawnedRef.current.cirno) {
        const angle = Math.random() * Math.PI * 2;
        const r = 600;
        ents.enemies.push({
            id: 'boss_cirno',
            position: { x: player.pos.x + Math.cos(angle)*r, y: player.pos.y + Math.sin(angle)*r },
            velocity: { x: 0, y: 0 },
            radius: BOSS_CONFIGS.cirno.radius,
            color: BOSS_CONFIGS.cirno.color,
            hp: BOSS_CONFIGS.cirno.hp,
            maxHp: BOSS_CONFIGS.cirno.hp,
            damage: BOSS_CONFIGS.cirno.damage,
            speed: BOSS_CONFIGS.cirno.speed,
            type: 'boss',
            expValue: BOSS_CONFIGS.cirno.expValue,
            frozen: 0,
            isBoss: true,
            bossName: BOSS_CONFIGS.cirno.name,
            bossType: 'cirno',
            attackPattern: 0,
            patternTimer: 0
        });
        bossSpawnedRef.current.cirno = true;
        triggerScreenShake(20, 30);
    }

    if (seconds >= BOSS_CONFIGS.youmu.spawnTime && !bossSpawnedRef.current.youmu) {
        const angle = Math.random() * Math.PI * 2;
        const r = 600;
        ents.enemies.push({
            id: 'boss_youmu',
            position: { x: player.pos.x + Math.cos(angle)*r, y: player.pos.y + Math.sin(angle)*r },
            velocity: { x: 0, y: 0 },
            radius: BOSS_CONFIGS.youmu.radius,
            color: BOSS_CONFIGS.youmu.color,
            hp: BOSS_CONFIGS.youmu.hp,
            maxHp: BOSS_CONFIGS.youmu.hp,
            damage: BOSS_CONFIGS.youmu.damage,
            speed: BOSS_CONFIGS.youmu.speed,
            type: 'boss',
            expValue: BOSS_CONFIGS.youmu.expValue,
            frozen: 0,
            isBoss: true,
            bossName: BOSS_CONFIGS.youmu.name,
            bossType: 'youmu',
            attackPattern: 0,
            patternTimer: 0
        });
        bossSpawnedRef.current.youmu = true;
        triggerScreenShake(25, 40);
    }

    if (seconds >= BOSS_CONFIGS.kaguya.spawnTime && !bossSpawnedRef.current.kaguya) {
        const angle = Math.random() * Math.PI * 2;
        const r = 600;
        ents.enemies.push({
            id: 'boss_kaguya',
            position: { x: player.pos.x + Math.cos(angle)*r, y: player.pos.y + Math.sin(angle)*r },
            velocity: { x: 0, y: 0 },
            radius: BOSS_CONFIGS.kaguya.radius,
            color: BOSS_CONFIGS.kaguya.color,
            hp: BOSS_CONFIGS.kaguya.hp,
            maxHp: BOSS_CONFIGS.kaguya.hp,
            damage: BOSS_CONFIGS.kaguya.damage,
            speed: BOSS_CONFIGS.kaguya.speed,
            type: 'boss',
            expValue: BOSS_CONFIGS.kaguya.expValue,
            frozen: 0,
            isBoss: true,
            bossName: BOSS_CONFIGS.kaguya.name,
            bossType: 'kaguya',
            attackPattern: 0,
            patternTimer: 0
        });
        bossSpawnedRef.current.kaguya = true;
        triggerScreenShake(30, 50);
    }

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

            let projs = w.onFire(player.pos, target, player.stats, timeRef.current);

            // Apply weapon-specific upgrades based on w.id and player.passives
            const weaponUpgrades = (w.upgrades || []);

            // Fire Bird upgrades
            if (w.id === 'fire_bird') {
                if (weaponUpgrades.includes('bird_pierce')) {
                    projs.forEach(p => p.penetration += 3);
                }
                if (weaponUpgrades.includes('bird_homing')) {
                    projs.forEach(p => p.homingStrength = 0.15);
                }
                if (weaponUpgrades.includes('bird_split')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'split';
                        p.splitCount = 3;
                        p.splitAngleSpread = Math.PI * 0.8;
                    });
                }
                if (weaponUpgrades.includes('bird_count')) {
                    const extraProjs = [];
                    projs.forEach(p => {
                        for (let i = 0; i < 2; i++) {
                            const offset = (i + 1) * 0.3 * (Math.random() > 0.5 ? 1 : -1);
                            const angle = Math.atan2(p.velocity.y, p.velocity.x) + offset;
                            const speed = Math.hypot(p.velocity.x, p.velocity.y);
                            extraProjs.push({
                                ...p,
                                id: Math.random().toString(36).substr(2, 9),
                                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
                            });
                        }
                    });
                    projs.push(...extraProjs);
                }
                if (weaponUpgrades.includes('bird_size')) {
                    projs.forEach(p => {
                        p.radius *= 2;
                        p.damage *= 2;
                    });
                }
                if (weaponUpgrades.includes('bird_bounce')) {
                    projs.forEach(p => {
                        p.bounceCount = 3;
                    });
                }
                if (weaponUpgrades.includes('bird_rapid')) {
                    w.cooldownMax *= 0.3; // -70%
                }
                if (weaponUpgrades.includes('bird_nova')) {
                    projs.forEach(p => {
                        p.explosionRadius = 120;
                        p.explosionDamage = p.damage * 0.8;
                    });
                }
            }

            // Phoenix Wings upgrades
            if (w.id === 'phoenix_wings') {
                if (weaponUpgrades.includes('wings_count')) {
                    // Add 2 more wings (total 6)
                    if (projs.length === 4) {
                        for (let i = 0; i < 2; i++) {
                            const angle = (i + 4) * (Math.PI / 3); // 6 wings evenly distributed
                            projs.push({
                                ...projs[0],
                                id: Math.random().toString(36).substr(2, 9),
                                orbitAngle: angle
                            });
                        }
                    }
                }
                if (weaponUpgrades.includes('wings_damage')) {
                    projs.forEach(p => p.damage *= 1.5);
                }
                if (weaponUpgrades.includes('wings_range')) {
                    projs.forEach(p => {
                        if (p.orbitRadius) p.orbitRadius *= 1.5;
                    });
                }
            }

            // Homing Amulet upgrades (Reimu)
            if (w.id === 'homing_amulet') {
                if (weaponUpgrades.includes('amulet_count')) {
                    const extraProjs = [];
                    for (let i = 0; i < 2; i++) {
                        projs.forEach(p => {
                            extraProjs.push({
                                ...p,
                                id: Math.random().toString(36).substr(2, 9),
                                velocity: { x: p.velocity.x + (Math.random() - 0.5) * 2, y: p.velocity.y + (Math.random() - 0.5) * 2 }
                            });
                        });
                    }
                    projs.push(...extraProjs);
                }
                if (weaponUpgrades.includes('amulet_homing')) {
                    projs.forEach(p => {
                        if (p.homingStrength) p.homingStrength *= 2;
                    });
                }
                if (weaponUpgrades.includes('amulet_bounce')) {
                    projs.forEach(p => {
                        p.bounceCount = 3;
                    });
                }
                if (weaponUpgrades.includes('amulet_split')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'split';
                        p.splitCount = 2;
                        p.splitAngleSpread = Math.PI * 0.6;
                    });
                }
                if (weaponUpgrades.includes('amulet_pierce')) {
                    projs.forEach(p => {
                        p.penetration += 5;
                        p.damage *= 1.3;
                    });
                }
                if (weaponUpgrades.includes('amulet_heal')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'heal';
                        p.healAmount = 1;
                    });
                }
                if (weaponUpgrades.includes('amulet_explosion')) {
                    projs.forEach(p => {
                        p.explosionRadius = 60;
                        p.explosionDamage = p.damage * 0.5;
                    });
                }
            }

            // Yin Yang Orb upgrades (Reimu)
            if (w.id === 'yin_yang_orb') {
                if (weaponUpgrades.includes('orb_size')) {
                    projs.forEach(p => {
                        p.radius *= 2;
                        p.damage *= 2;
                    });
                }
                if (weaponUpgrades.includes('orb_multi')) {
                    const extra = {
                        ...projs[0],
                        id: Math.random().toString(36).substr(2, 9),
                        velocity: { x: projs[0].velocity.x * -0.5, y: projs[0].velocity.y }
                    };
                    projs.push(extra);
                }
            }

            // Boundary upgrades (Reimu)
            if (w.id === 'boundary') {
                if (weaponUpgrades.includes('boundary_size')) {
                    projs.forEach(p => p.radius *= 1.5);
                }
                if (weaponUpgrades.includes('boundary_damage')) {
                    projs.forEach(p => p.damage *= 2);
                }
                if (weaponUpgrades.includes('boundary_duration')) {
                    projs.forEach(p => p.duration *= 2);
                }
            }

            // Star Dust upgrades (Marisa)
            if (w.id === 'star_dust') {
                if (weaponUpgrades.includes('star_speed')) {
                    projs.forEach(p => {
                        p.velocity.x *= 2;
                        p.velocity.y *= 2;
                        p.damage *= 1.3;
                    });
                }
                if (weaponUpgrades.includes('star_pierce')) {
                    projs.forEach(p => p.penetration += 3);
                }
                if (weaponUpgrades.includes('star_homing')) {
                    projs.forEach(p => p.homingStrength = 0.1);
                }
                if (weaponUpgrades.includes('star_rapid')) {
                    w.cooldownMax *= 0.5;
                }
                if (weaponUpgrades.includes('star_explode')) {
                    projs.forEach(p => {
                        p.explosionRadius = 60;
                        p.explosionDamage = p.damage * 0.5;
                    });
                }
            }

            // Laser upgrades (Marisa)
            if (w.id === 'laser') {
                if (weaponUpgrades.includes('laser_width')) {
                    projs.forEach(p => p.radius *= 2);
                }
                if (weaponUpgrades.includes('laser_duration')) {
                    projs.forEach(p => p.duration *= 2);
                }
                if (weaponUpgrades.includes('laser_damage')) {
                    projs.forEach(p => p.damage *= 3);
                }
                if (weaponUpgrades.includes('laser_multi')) {
                    const extras = [];
                    for (let i = -1; i <= 1; i += 2) {
                        extras.push({
                            ...projs[0],
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: projs[0].position.x, y: projs[0].position.y + i * 60 }
                        });
                    }
                    projs.push(...extras);
                }
                if (weaponUpgrades.includes('laser_burn')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'burn';
                        p.burnDuration = 150;
                        p.burnDamage = p.damage * 0.1;
                    });
                }
            }

            // Orreries upgrades (Marisa)
            if (w.id === 'orreries') {
                if (weaponUpgrades.includes('orrery_count')) {
                    if (projs.length === 4) {
                        for (let i = 0; i < 4; i++) {
                            const angle = (i + 4) * (Math.PI / 4);
                            projs.push({
                                ...projs[0],
                                id: Math.random().toString(36).substr(2, 9),
                                orbitAngle: angle
                            });
                        }
                    }
                }
                if (weaponUpgrades.includes('orrery_speed')) {
                    projs.forEach(p => {
                        if (p.orbitSpeed) p.orbitSpeed *= 2;
                    });
                }
                if (weaponUpgrades.includes('orrery_size')) {
                    projs.forEach(p => {
                        p.radius *= 2;
                        p.damage *= 2;
                    });
                }
            }

            // Knives upgrades (Sakuya)
            if (w.id === 'knives') {
                if (weaponUpgrades.includes('knife_count')) {
                    const extras = [];
                    for (let i = 0; i < 2; i++) {
                        projs.forEach(p => {
                            extras.push({
                                ...p,
                                id: Math.random().toString(36).substr(2, 9),
                                velocity: { x: p.velocity.x * 0.8, y: p.velocity.y + (i - 0.5) * 3 }
                            });
                        });
                    }
                    projs.push(...extras);
                }
                if (weaponUpgrades.includes('knife_bounce')) {
                    projs.forEach(p => {
                        p.penetration += 3;
                    });
                }
                if (weaponUpgrades.includes('knife_speed')) {
                    projs.forEach(p => {
                        p.velocity.x *= 2.5;
                        p.velocity.y *= 2.5;
                    });
                }
                if (weaponUpgrades.includes('knife_explode')) {
                    projs.forEach(p => {
                        p.explosionRadius = 50;
                        p.explosionDamage = p.damage * 0.4;
                    });
                }
                if (weaponUpgrades.includes('knife_poison')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'poison';
                        p.poisonDuration = 180;
                        p.poisonDamage = p.damage * 0.1;
                    });
                }
                if (weaponUpgrades.includes('knife_freeze')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'freeze';
                    });
                }
            }

            // Time Stop upgrades (Sakuya)
            if (w.id === 'time_stop') {
                if (weaponUpgrades.includes('timestop_duration')) {
                    projs.forEach(p => p.duration += 180); // +3 seconds
                }
                if (weaponUpgrades.includes('timestop_cooldown')) {
                    w.cooldownMax *= 0.6;
                }
            }

            // Checkmate upgrades (Sakuya)
            if (w.id === 'checkmate') {
                if (weaponUpgrades.includes('checkmate_count')) {
                    if (projs.length === 8) {
                        for (let i = 0; i < 8; i++) {
                            const angle = (i + 8) * (Math.PI * 2 / 16);
                            projs.push({
                                ...projs[0],
                                id: Math.random().toString(36).substr(2, 9),
                                velocity: {
                                    x: Math.cos(angle) * 8,
                                    y: Math.sin(angle) * 8
                                }
                            });
                        }
                    }
                }
                if (weaponUpgrades.includes('checkmate_homing')) {
                    projs.forEach(p => p.homingStrength = 0.12);
                }
                if (weaponUpgrades.includes('checkmate_penetrate')) {
                    projs.forEach(p => p.penetration += 5);
                }
                if (weaponUpgrades.includes('checkmate_rapid')) {
                    w.cooldownMax *= 0.3;
                }
            }

            // Spoon upgrades (Yuma)
            if (w.id === 'spoon') {
                if (weaponUpgrades.includes('spoon_size')) {
                    projs.forEach(p => {
                        p.radius *= 2;
                        p.damage *= 2;
                    });
                }
                if (weaponUpgrades.includes('spoon_speed')) {
                    projs.forEach(p => {
                        p.velocity.x *= 2;
                        p.velocity.y *= 2;
                    });
                }
                if (weaponUpgrades.includes('spoon_multi')) {
                    const extras = [];
                    for (let i = 0; i < 2; i++) {
                        const angle = Math.atan2(projs[0].velocity.y, projs[0].velocity.x) + (i + 1) * 0.3 * (Math.random() > 0.5 ? 1 : -1);
                        const speed = Math.hypot(projs[0].velocity.x, projs[0].velocity.y);
                        extras.push({
                            ...projs[0],
                            id: Math.random().toString(36).substr(2, 9),
                            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
                        });
                    }
                    projs.push(...extras);
                }
                if (weaponUpgrades.includes('spoon_heal')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'heal';
                        p.healAmount = 3;
                    });
                }
                if (weaponUpgrades.includes('spoon_explosion')) {
                    projs.forEach(p => {
                        p.explosionRadius = 80;
                        p.explosionDamage = p.damage * 0.6;
                    });
                }
            }

            // Fangs upgrades (Yuma)
            if (w.id === 'fangs') {
                if (weaponUpgrades.includes('fang_size')) {
                    projs.forEach(p => p.radius *= 2);
                }
                if (weaponUpgrades.includes('fang_duration')) {
                    projs.forEach(p => p.duration *= 3);
                }
                if (weaponUpgrades.includes('fang_rapid')) {
                    w.cooldownMax *= 0.5;
                }
                if (weaponUpgrades.includes('fang_heal')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'heal';
                        p.healAmount = Math.floor(p.damage * 0.5);
                    });
                }
                if (weaponUpgrades.includes('fang_stun')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'stun';
                        p.stunDuration = 120;
                    });
                }
                if (weaponUpgrades.includes('fang_chain')) {
                    projs.forEach(p => {
                        p.chainCount = 3;
                        p.chainRange = 200;
                    });
                }
            }

            // Black Hole upgrades (Yuma)
            if (w.id === 'black_hole') {
                if (weaponUpgrades.includes('hole_size')) {
                    projs.forEach(p => p.radius *= 2);
                }
                if (weaponUpgrades.includes('hole_duration')) {
                    projs.forEach(p => p.duration *= 2);
                }
                if (weaponUpgrades.includes('hole_damage')) {
                    projs.forEach(p => p.damage *= 3);
                }
                if (weaponUpgrades.includes('hole_multi')) {
                    const extra = {
                        ...projs[0],
                        id: Math.random().toString(36).substr(2, 9),
                        position: {
                            x: projs[0].position.x + (Math.random() - 0.5) * 400,
                            y: projs[0].position.y + (Math.random() - 0.5) * 400
                        }
                    };
                    projs.push(extra);
                }
            }

            // Mines upgrades (Koishi)
            if (w.id === 'mines') {
                if (weaponUpgrades.includes('mine_count')) {
                    const extras = [];
                    for (let i = 0; i < 2; i++) {
                        projs.forEach(p => {
                            extras.push({
                                ...p,
                                id: Math.random().toString(36).substr(2, 9),
                                position: {
                                    x: p.position.x + (Math.random() - 0.5) * 100,
                                    y: p.position.y + (Math.random() - 0.5) * 100
                                }
                            });
                        });
                    }
                    projs.push(...extras);
                }
                if (weaponUpgrades.includes('mine_damage')) {
                    projs.forEach(p => p.damage *= 2.5);
                }
                if (weaponUpgrades.includes('mine_range')) {
                    projs.forEach(p => p.radius *= 2);
                }
            }

            // Whip upgrades (Koishi)
            if (w.id === 'whip') {
                if (weaponUpgrades.includes('whip_speed')) {
                    w.cooldownMax *= 0.5;
                }
                if (weaponUpgrades.includes('whip_multi')) {
                    // Find 3 targets instead of 1
                    const targets = [];
                    ents.enemies.forEach(e => {
                        if (!e) return;
                        const d = Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y);
                        if (d < 500) targets.push(e);
                    });
                    targets.sort((a, b) => {
                        const dA = Math.hypot(a.position.x - player.pos.x, a.position.y - player.pos.y);
                        const dB = Math.hypot(b.position.x - player.pos.x, b.position.y - player.pos.y);
                        return dA - dB;
                    });
                    const extras = [];
                    for (let i = 1; i < Math.min(3, targets.length); i++) {
                        const t = targets[i];
                        const dir = { x: t.position.x - player.pos.x, y: t.position.y - player.pos.y };
                        const len = Math.hypot(dir.x, dir.y);
                        if (len > 0) {
                            extras.push({
                                ...projs[0],
                                id: Math.random().toString(36).substr(2, 9),
                                velocity: { x: dir.x / len * 15, y: dir.y / len * 15 }
                            });
                        }
                    }
                    projs.push(...extras);
                }
                if (weaponUpgrades.includes('whip_poison')) {
                    projs.forEach(p => {
                        p.onHitEffect = 'poison';
                        p.poisonDuration = 200;
                        p.poisonDamage = p.damage * 0.15;
                    });
                }
                if (weaponUpgrades.includes('whip_chain')) {
                    projs.forEach(p => {
                        p.chainCount = 5;
                        p.chainRange = 250;
                    });
                }
            }

            // Fire Pillars upgrades (Koishi)
            if (w.id === 'fire_pillars') {
                if (weaponUpgrades.includes('pillar_count')) {
                    const extras = [];
                    for (let i = 0; i < 4; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        extras.push({
                            ...projs[0],
                            id: Math.random().toString(36).substr(2, 9),
                            velocity: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 }
                        });
                    }
                    projs.push(...extras);
                }
                if (weaponUpgrades.includes('pillar_size')) {
                    projs.forEach(p => {
                        p.radius *= 2;
                        p.damage *= 2;
                    });
                }
                if (weaponUpgrades.includes('pillar_duration')) {
                    projs.forEach(p => p.duration *= 2);
                }
            }

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
                    const dmg = p.damage;
                    const wasAlive = e.hp > 0;
                    e.hp -= dmg;
                    ents.damageNumbers.push({ id: Math.random().toString(), position: {...e.position}, value: Math.floor(dmg), life: 30, isCrit: false });

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

                    // Apply status effects
                    if (p.onHitEffect === 'burn' || p.burnDuration) {
                        e.burnDuration = p.burnDuration || 120;
                        e.burnDamage = p.burnDamage || dmg * 0.1;
                    }
                    if (p.onHitEffect === 'poison' || p.poisonDuration) {
                        e.poisonDuration = p.poisonDuration || 180;
                        e.poisonDamage = p.poisonDamage || dmg * 0.05;
                    }
                    if (p.onHitEffect === 'stun' || p.stunDuration) {
                        e.stunDuration = p.stunDuration || 60;
                    }
                    if (p.onHitEffect === 'freeze') {
                        e.frozen = 120;
                    }
                    if (p.onHitEffect === 'heal' || p.healAmount) {
                        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + (p.healAmount || 1));
                    }

                    // Handle split projectiles
                    if (p.onHitEffect === 'split' && p.splitCount) {
                        const angleStep = (p.splitAngleSpread || Math.PI) / p.splitCount;
                        const baseAngle = Math.atan2(p.velocity.y, p.velocity.x);
                        for (let j = 0; j < p.splitCount; j++) {
                            const angle = baseAngle + (j - p.splitCount / 2) * angleStep;
                            const speed = Math.hypot(p.velocity.x, p.velocity.y) * 0.7;
                            ents.projectiles.push({
                                ...p,
                                id: Math.random().toString(36).substr(2, 9),
                                position: { ...e.position },
                                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                                duration: p.duration * 0.7,
                                damage: p.damage * 0.6,
                                onHitEffect: undefined, // Don't chain splits
                                splitCount: undefined
                            });
                        }
                    }

                    // Handle bounce projectiles
                    if (p.bounceCount && p.bounceCount > 0) {
                        if (!p.bouncedEnemies) p.bouncedEnemies = new Set();
                        p.bouncedEnemies.add(e.id);

                        // Find nearest enemy not yet bounced to
                        let nearestDist = Infinity;
                        let nearestEnemy = null;
                        ents.enemies.forEach(ne => {
                            if (!ne || ne.id === e.id || p.bouncedEnemies!.has(ne.id)) return;
                            const dist = Math.hypot(ne.position.x - e.position.x, ne.position.y - e.position.y);
                            if (dist < 300 && dist < nearestDist) {
                                nearestDist = dist;
                                nearestEnemy = ne;
                            }
                        });

                        if (nearestEnemy) {
                            const dx = nearestEnemy.position.x - e.position.x;
                            const dy = nearestEnemy.position.y - e.position.y;
                            const len = Math.hypot(dx, dy);
                            const speed = Math.hypot(p.velocity.x, p.velocity.y);
                            p.velocity.x = (dx / len) * speed;
                            p.velocity.y = (dy / len) * speed;
                            p.position.x = e.position.x;
                            p.position.y = e.position.y;
                            p.bounceCount--;
                        } else {
                            p.bounceCount = 0;
                        }
                    }

                    // Handle chain lightning
                    if (p.chainCount && p.chainCount > 0) {
                        if (!p.chainedEnemies) p.chainedEnemies = new Set();
                        p.chainedEnemies.add(e.id);

                        const chainRange = p.chainRange || 200;
                        let nearestDist = Infinity;
                        let nearestEnemy = null;
                        ents.enemies.forEach(ne => {
                            if (!ne || ne.id === e.id || p.chainedEnemies!.has(ne.id)) return;
                            const dist = Math.hypot(ne.position.x - e.position.x, ne.position.y - e.position.y);
                            if (dist < chainRange && dist < nearestDist) {
                                nearestDist = dist;
                                nearestEnemy = ne;
                            }
                        });

                        if (nearestEnemy) {
                            nearestEnemy.hp -= p.damage * 0.8;
                            ents.damageNumbers.push({
                                id: Math.random().toString(),
                                position: {...nearestEnemy.position},
                                value: Math.floor(p.damage * 0.8),
                                life: 30,
                                isCrit: false
                            });
                            p.chainCount--;
                            p.position.x = nearestEnemy.position.x;
                            p.position.y = nearestEnemy.position.y;
                        } else {
                            p.chainCount = 0;
                        }
                    }

                    // Handle explosion on hit
                    if (p.onHitEffect === 'explode' || p.explosionRadius) {
                        const explRadius = p.explosionRadius || 80;
                        const explDamage = p.explosionDamage || p.damage * 0.5;
                        ents.enemies.forEach(ne => {
                            if (!ne) return;
                            const dist = Math.hypot(ne.position.x - e.position.x, ne.position.y - e.position.y);
                            if (dist < explRadius) {
                                ne.hp -= explDamage;
                                ents.damageNumbers.push({
                                    id: Math.random().toString(),
                                    position: {...ne.position},
                                    value: Math.floor(explDamage),
                                    life: 30,
                                    isCrit: true
                                });
                            }
                        });
                        triggerScreenShake(8, 12);
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
                    // Don't consume penetration for bounce/chain projectiles until they're done
                    if ((!p.bounceCount || p.bounceCount <= 0) && (!p.chainCount || p.chainCount <= 0)) {
                        p.penetration--;
                        if (p.penetration <= 0) {
                            ents.projectiles.splice(i, 1);
                            break;
                        }
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

    // Enemies
    for (let i = ents.enemies.length - 1; i >= 0; i--) {
        const e = ents.enemies[i];

        if (!e) {
            ents.enemies.splice(i, 1);
            continue;
        }

        const distToPlayer = Math.hypot(e.position.x - player.pos.x, e.position.y - player.pos.y);

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

        // Handle status effects
        if (e.frozen > 0) {
            e.frozen -= dt;
            continue;
        }

        if (e.stunDuration && e.stunDuration > 0) {
            e.stunDuration -= dt;
            continue; // Stunned enemies can't move
        }

        // Apply burn damage
        if (e.burnDuration && e.burnDuration > 0) {
            e.burnDuration -= dt;
            if (Math.floor(timeRef.current) % 20 === 0) { // Every ~0.33 seconds
                e.hp -= e.burnDamage || 0;
                ents.damageNumbers.push({
                    id: Math.random().toString(),
                    position: {...e.position},
                    value: Math.floor(e.burnDamage || 0),
                    life: 20,
                    isCrit: false
                });
            }
        }

        // Apply poison damage
        if (e.poisonDuration && e.poisonDuration > 0) {
            e.poisonDuration -= dt;
            if (Math.floor(timeRef.current) % 30 === 0) { // Every ~0.5 seconds
                e.hp -= e.poisonDamage || 0;
                ents.damageNumbers.push({
                    id: Math.random().toString(),
                    position: {...e.position},
                    value: Math.floor(e.poisonDamage || 0),
                    life: 20,
                    isCrit: false
                });
            }
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
        } else if (e.isBoss && e.bossType) {
            // Boss AI and Danmaku patterns
            e.patternTimer = (e.patternTimer || 0) + dt;

            // Boss movement - circle around player at medium distance
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
            } else {
                // Circle around player
                const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
                e.velocity.x += Math.cos(perpAngle) * 0.05 * dt;
                e.velocity.y += Math.sin(perpAngle) * 0.05 * dt;
            }

            const spd = Math.hypot(e.velocity.x, e.velocity.y);
            if (spd > e.speed) {
                e.velocity.x = (e.velocity.x/spd) * e.speed;
                e.velocity.y = (e.velocity.y/spd) * e.speed;
            }

            e.position.x += e.velocity.x * dt;
            e.position.y += e.velocity.y * dt;

            // Boss attack patterns
            if (e.bossType === 'cirno') {
                // 琪露诺 - 冰弹幕
                // Pattern 1: 环形冰弹
                if (e.patternTimer! >= 90 && e.attackPattern === 0) {
                    const bulletCount = 16;
                    for (let i = 0; i < bulletCount; i++) {
                        const angle = (i / bulletCount) * Math.PI * 2;
                        ents.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: e.position.x, y: e.position.y },
                            velocity: { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 },
                            radius: 10,
                            color: '#00ffff',
                            damage: e.damage * 0.6,
                            duration: 200,
                            maxDuration: 200,
                            penetration: 1,
                            knockback: 0,
                            sprite: '❄️',
                            isEnemyProjectile: true
                        });
                    }
                    e.attackPattern = 1;
                    e.patternTimer = 0;
                }
                // Pattern 2: 螺旋冰弹
                else if (e.patternTimer! >= 60 && e.attackPattern === 1) {
                    const spiralCount = 3;
                    const baseAngle = (timeRef.current * 0.05) % (Math.PI * 2);
                    for (let i = 0; i < spiralCount; i++) {
                        const angle = baseAngle + (i / spiralCount) * Math.PI * 2;
                        ents.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: e.position.x, y: e.position.y },
                            velocity: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 },
                            radius: 12,
                            color: '#87ceeb',
                            damage: e.damage * 0.7,
                            duration: 180,
                            maxDuration: 180,
                            penetration: 1,
                            knockback: 0,
                            sprite: '❅',
                            isEnemyProjectile: true
                        });
                    }
                    e.attackPattern = 0;
                    e.patternTimer = 0;
                }
            } else if (e.bossType === 'youmu') {
                // 魂魄妖梦 - 剑气弹幕
                // Pattern 1: 扇形剑气
                if (e.patternTimer! >= 100 && e.attackPattern === 0) {
                    const fanCount = 9;
                    const shootAngle = Math.atan2(dy, dx);
                    for (let i = 0; i < fanCount; i++) {
                        const spreadAngle = shootAngle + ((i - (fanCount - 1) / 2) * 0.2);
                        ents.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            position: { x: e.position.x, y: e.position.y },
                            velocity: { x: Math.cos(spreadAngle) * 7, y: Math.sin(spreadAngle) * 7 },
                            radius: 8,
                            color: '#90ee90',
                            damage: e.damage * 0.8,
                            duration: 150,
                            maxDuration: 150,
                            penetration: 1,
                            knockback: 0,
                            sprite: '⚔️',
                            isEnemyProjectile: true
                        });
                    }
                    e.attackPattern = 1;
                    e.patternTimer = 0;
                }
                // Pattern 2: 十字斩
                else if (e.patternTimer! >= 80 && e.attackPattern === 1) {
                    const directions = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
                    directions.forEach(angle => {
                        for (let j = 0; j < 5; j++) {
                            setTimeout(() => {
                                ents.projectiles.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    position: { x: e.position.x, y: e.position.y },
                                    velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                                    radius: 15,
                                    color: '#98fb98',
                                    damage: e.damage * 0.9,
                                    duration: 120,
                                    maxDuration: 120,
                                    penetration: 1,
                                    knockback: 5,
                                    sprite: '🗡️',
                                    isEnemyProjectile: true
                                });
                            }, j * 50);
                        }
                    });
                    e.attackPattern = 0;
                    e.patternTimer = 0;
                }
            } else if (e.bossType === 'kaguya') {
                // 蓬莱山辉夜 - 五彩弹幕
                // Pattern 1: 五色环形弹
                if (e.patternTimer! >= 120 && e.attackPattern === 0) {
                    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
                    const rings = 5;
                    const bulletsPerRing = 20;
                    for (let ring = 0; ring < rings; ring++) {
                        setTimeout(() => {
                            for (let i = 0; i < bulletsPerRing; i++) {
                                const angle = (i / bulletsPerRing) * Math.PI * 2 + (ring * 0.3);
                                ents.projectiles.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    position: { x: e.position.x, y: e.position.y },
                                    velocity: { x: Math.cos(angle) * (3 + ring * 0.5), y: Math.sin(angle) * (3 + ring * 0.5) },
                                    radius: 11,
                                    color: colors[ring % colors.length],
                                    damage: e.damage * 0.7,
                                    duration: 250,
                                    maxDuration: 250,
                                    penetration: 1,
                                    knockback: 0,
                                    sprite: '●',
                                    isEnemyProjectile: true
                                });
                            }
                        }, ring * 100);
                    }
                    e.attackPattern = 1;
                    e.patternTimer = 0;
                }
                // Pattern 2: 随机彩色弹幕雨
                else if (e.patternTimer! >= 5 && e.attackPattern === 1) {
                    const colors = ['#ff69b4', '#ffd700', '#00ced1', '#ff1493', '#7b68ee'];
                    const randomAngle = Math.random() * Math.PI * 2;
                    ents.projectiles.push({
                        id: Math.random().toString(36).substr(2, 9),
                        position: { x: e.position.x, y: e.position.y },
                        velocity: { x: Math.cos(randomAngle) * 6, y: Math.sin(randomAngle) * 6 },
                        radius: 10,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        damage: e.damage * 0.5,
                        duration: 200,
                        maxDuration: 200,
                        penetration: 1,
                        knockback: 0,
                        sprite: '◆',
                        isEnemyProjectile: true
                    });
                    e.patternTimer = 0;
                    // Switch back to pattern 0 after some time
                    if (Math.random() < 0.02) {
                        e.attackPattern = 0;
                    }
                }
            }
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
        let playerRadius = 15; // Reduced from 22.5 to 15
        if (character.id === 'mokou') {
            const targetHeight = 100; // Reduced from 180 to 100
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
    const MAX_GEMS = 500;  // 最大宝石数量（提高上限）
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

        if (dist < player.stats.pickupRange) {
            g.position.x += (player.pos.x - g.position.x) * 0.1 * dt;
            g.position.y += (player.pos.y - g.position.y) * 0.1 * dt;
            if (dist < 20) {
                player.exp += g.value;
                if (player.exp >= player.nextLevelExp) {
                    player.level++;
                    player.exp -= player.nextLevelExp;
                    player.nextLevelExp = Math.floor(player.nextLevelExp * 1.5);
                    onLevelUp(player.weapons, player.passives, player.stats.hp, player.stats.maxHp, timeRef.current / FPS);
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
    try {
      if (!appRef.current || !appRef.current.stage) {
        console.log('Render blocked: app or stage not ready');
        return;
      }

      // Check if all containers are initialized
      if (!backgroundContainerRef.current || !shadowContainerRef.current ||
          !entityContainerRef.current || !effectContainerRef.current ||
          !uiContainerRef.current) {
        console.log('Render blocked: containers not ready');
        return;
      }

      // Debug: log first render
      if (Math.random() < 0.001) {
        console.log('Rendering frame...');
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
          // 调暗地图颜色
          sprite.tint = 0x808080; // 50% 灰度，使颜色变暗
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
    const playerShadowWidth = 40; // Reduced from 60 to 40
    const playerShadowHeight = 15; // Reduced from 20 to 15
    playerShadow.ellipse(player.pos.x, player.pos.y + 45, playerShadowWidth, playerShadowHeight); // Reduced offset from 80 to 45
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

        // Boss glow effect
        if (e.isBoss) {
          const glowIntensity = 0.3 + Math.sin(timeRef.current * 0.1) * 0.2;
          const glow = new PIXI.Graphics();
          glow.circle(e.position.x, e.position.y, e.radius * 1.5);
          glow.fill({ color: e.color, alpha: glowIntensity });
          entityContainerRef.current.addChild(glow);
        }

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
          const targetHeight = 100; // Reduced from 140 to 100
          const scale = targetHeight / texture.height;
          sprite.x = player.pos.x;
          sprite.y = player.pos.y;
          sprite.scale.x = (player.facing.x < 0 ? -1 : 1) * scale;
          sprite.scale.y = scale;
          entityContainerRef.current.addChild(sprite);
        } else {
          const graphics = new PIXI.Graphics();
          graphics.circle(player.pos.x, player.pos.y, 15); // Reduced from 22 to 15
          graphics.fill(character.color);
          entityContainerRef.current.addChild(graphics);
        }
      } else {
        const graphics = new PIXI.Graphics();
        graphics.circle(player.pos.x, player.pos.y, 15); // Reduced from 22 to 15
        graphics.fill(character.color);
        entityContainerRef.current.addChild(graphics);
      }
    }

    // Damage Numbers - 清理并销毁旧对象
    uiContainerRef.current.removeChildren().forEach(child => child.destroy());

    // Boss HP bars in UI (top of screen)
    const activeBosses = ents.enemies.filter(e => e.isBoss && e.bossName);
    activeBosses.forEach((boss, index) => {
      const barWidth = 800;
      const barHeight = 40;
      const barX = (CANVAS_WIDTH - barWidth) / 2;
      const barY = 60 + index * 80;

      // Background
      const bgBar = new PIXI.Graphics();
      bgBar.rect(barX, barY, barWidth, barHeight);
      bgBar.fill({ color: 0x000000, alpha: 0.8 });
      bgBar.stroke({ width: 3, color: 0xffffff });
      uiContainerRef.current.addChild(bgBar);

      // HP fill
      const hpPercent = Math.max(0, boss.hp / boss.maxHp);
      const fillWidth = barWidth * hpPercent;
      const hpBar = new PIXI.Graphics();
      hpBar.rect(barX, barY, fillWidth, barHeight);

      let barColor = 0x00ff00;
      if (hpPercent < 0.3) barColor = 0xff0000;
      else if (hpPercent < 0.6) barColor = 0xffaa00;

      hpBar.fill({ color: barColor, alpha: 0.9 });
      uiContainerRef.current.addChild(hpBar);

      // Boss name
      const nameText = new PIXI.Text({
        text: boss.bossName,
        style: {
          fontSize: 32,
          fill: 0xffffff,
          fontWeight: 'bold',
          stroke: { color: 0x000000, width: 5 }
        }
      });
      nameText.anchor.set(0.5);
      nameText.x = CANVAS_WIDTH / 2;
      nameText.y = barY - 30;
      uiContainerRef.current.addChild(nameText);

      // HP text
      const hpText = new PIXI.Text({
        text: `${Math.ceil(boss.hp)} / ${boss.maxHp}`,
        style: {
          fontSize: 22,
          fill: 0xffffff,
          fontWeight: 'bold',
          stroke: { color: 0x000000, width: 4 }
        }
      });
      hpText.anchor.set(0.5);
      hpText.x = CANVAS_WIDTH / 2;
      hpText.y = barY + barHeight / 2;
      uiContainerRef.current.addChild(hpText);
    });

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
    } catch (error) {
      console.error('Render error:', error);
    }
  }, [character]);

  // Game loop - only start after app is initialized
  useEffect(() => {
    // Wait for app to be fully initialized
    if (!isInitialized) {
      console.log('Game loop waiting for initialization');
      return;
    }

    console.log('Starting game loop...');
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (time: number) => {
      const delta = time - lastTime;
      if (delta >= 1000 / FPS) {
        update();
        render();
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      console.log('Stopping game loop');
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [update, render, isInitialized]);

  return (
    <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center">
        <div ref={containerRef} className="border bg-black" />
        <div className="absolute top-4 left-4 text-white font-mono text-lg">
            HP: {hudStats.hp}/{hudStats.maxHp} | LV: {hudStats.level} | TIME: {Math.floor(hudStats.time/60).toString().padStart(2,'0')}:{(hudStats.time%60).toString().padStart(2,'0')}
        </div>
    </div>
  );
};
