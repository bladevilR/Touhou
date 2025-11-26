
import React, { useState, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { LevelUpScreen } from './components/LevelUpScreen';
import { GameState, CharacterId, UpgradeOption, Weapon, CharacterConfig } from './types';
import { CHARACTERS, WEAPON_DEFS, PASSIVE_DEFS, WEAPON_UPGRADE_TREES } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig>(CHARACTERS[CharacterId.REIMU]);
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([]);
  const [lastSelectedUpgrade, setLastSelectedUpgrade] = useState<UpgradeOption | null>(null);
  const gameTimeRef = useRef(0); // Track total game time for heal logic

  const handleStartGame = (charId: CharacterId) => {
    setSelectedCharacter(CHARACTERS[charId]);
    setGameState(GameState.PLAYING);
    gameTimeRef.current = 0;
  };

  const generateUpgradeOptions = useCallback((currentWeapons: Weapon[], currentPassives: string[], currentHp: number, maxHp: number): UpgradeOption[] => {
    const options: UpgradeOption[] = [];
    const maxOptions = 3;

    // Check for Weapon Upgrade Tree choices (Tier深化升级)
    // Trigger at levels 3, 5, 7 for each weapon
    const weaponsNeedingUpgrade = currentWeapons.filter(w => {
      const level = w.level;
      const upgrades = w.upgrades || [];

      // Tier 1: level 3, Tier 2: level 5, Tier 3: level 7
      if (level === 3 && upgrades.length === 0) return true;
      if (level === 5 && upgrades.length === 1) return true;
      if (level === 7 && upgrades.length === 2) return true;
      return false;
    });

    // If a weapon needs upgrade tree choice, force show those options
    if (weaponsNeedingUpgrade.length > 0) {
      const weaponToUpgrade = weaponsNeedingUpgrade[0]; // Take first weapon needing upgrade
      const upgradeTree = WEAPON_UPGRADE_TREES[weaponToUpgrade.id];

      if (upgradeTree) {
        const currentTier = (weaponToUpgrade.upgrades || []).length + 1; // 1, 2, or 3
        const availableUpgrades = upgradeTree.filter(u => u.tier === currentTier);

        // Return 3 choices for this weapon upgrade
        return availableUpgrades.slice(0, 3).map(upgrade => ({
          id: upgrade.id,
          type: 'weapon_upgrade' as any, // New type for weapon upgrades
          name: upgrade.name,
          description: upgrade.description,
          icon: upgrade.icon,
          level: currentTier,
          isNew: true,
          rarity: currentTier === 3 ? 'legendary' : (currentTier === 2 ? 'rare' : 'common'),
          weaponId: weaponToUpgrade.id // Store which weapon this upgrade is for
        } as any));
      }
    }

    // Pools
    const existingWeaponPool = currentWeapons.filter(w => w.level < w.maxLevel);

    // Filter New Weapons: Must NOT be exclusive to another character
    const newWeaponPool = Object.values(WEAPON_DEFS).filter(def => {
        const hasIt = currentWeapons.some(cw => cw.id === def.id);
        if (hasIt) return false;
        if (def.exclusiveTo && def.exclusiveTo !== selectedCharacter.id) return false;
        return true;
    });

    const passivePool = Object.values(PASSIVE_DEFS).filter(p => !currentPassives.includes(p.id)); 
    
    // HEAL Logic: Only if < 100% HP AND Game Time > 3 min (180s)
    const canHeal = currentHp < maxHp && gameTimeRef.current > 180;

    let safetyCounter = 0;
    while(options.length < maxOptions && safetyCounter < 50) {
        safetyCounter++;
        const rand = Math.random();
        let candidate: UpgradeOption | null = null;

        // 1. Fantasy Gift (1%)
        if (rand < 0.01) {
             candidate = {
                id: 'fantasy_gift', type: 'heal', name: '幻想乡的馈赠', description: '全额回血 + 生命上限提升',
                icon: '🎁', level: 1, isNew: true, rarity: 'legendary'
             };
        }
        // 2. Existing Upgrade (60%)
        else if (rand < 0.61 && existingWeaponPool.length > 0) {
            const w = existingWeaponPool[Math.floor(Math.random() * existingWeaponPool.length)];
            if (!options.find(o => o.id === w.id)) {
                candidate = {
                    id: w.id, type: 'weapon', name: w.name, description: `升级至等级 ${w.level + 1}.`,
                    icon: '⚔️', level: w.level, isNew: false, rarity: 'common'
                };
            }
        }
        // 3. New Item (30%)
        else if (rand < 0.91) {
            const pools = [
                { pool: newWeaponPool, weight: newWeaponPool.length > 0 ? 0.6 : 0 },
                { pool: passivePool, weight: passivePool.length > 0 ? 0.4 : 0 }
            ];
            const totalWeight = pools.reduce((sum, p) => sum + p.weight, 0);

            if (totalWeight > 0) {
                const roll = Math.random() * totalWeight;
                let cumulative = 0;

                for (const poolData of pools) {
                    cumulative += poolData.weight;
                    if (roll <= cumulative) {
                        if (poolData.pool === newWeaponPool && newWeaponPool.length > 0) {
                            const w = newWeaponPool[Math.floor(Math.random() * newWeaponPool.length)];
                            if (!options.find(o => o.id === w.id)) {
                                candidate = {
                                    id: w.id, type: 'weapon', name: w.name, description: w.description,
                                    icon: '⚔️', level: 0, isNew: true, rarity: 'rare'
                                };
                            }
                        } else if (poolData.pool === passivePool && passivePool.length > 0) {
                            const p = passivePool[Math.floor(Math.random() * passivePool.length)];
                            if (!options.find(o => o.id === p.id)) {
                                candidate = {
                                    id: p.id, type: 'passive', name: p.name, description: p.description,
                                    icon: '📘', level: 0, isNew: true, rarity: 'common'
                                };
                            }
                        }
                        break;
                    }
                }
            }
        }
        // 4. Heal / Gold (10%)
        else if (canHeal) {
             if (!options.find(o => o.type === 'heal')) {
                candidate = {
                    id: 'chicken_' + Math.random(), type: 'heal', name: '烤鸡', description: '恢复 50 HP',
                    icon: '🍗', level: 0, isNew: false, rarity: 'common'
                };
             }
        }
        
        // Fallback: If nothing picked (e.g. pools empty, no heal needed), force Gold
        if (!candidate && options.length < maxOptions && safetyCounter > 10) {
            candidate = {
                id: 'gold_' + Math.random(), type: 'heal', name: '金币', description: '获得 100 金币',
                icon: '💰', level: 0, isNew: false, rarity: 'common'
            };
        }

        if (candidate) options.push(candidate);
    }
    
    return options;
  }, [selectedCharacter]);

  const handleLevelUp = (currentWeapons: Weapon[], currentPassives: string[], hp: number, maxHp: number, time: number) => {
      gameTimeRef.current = time;
      setGameState(GameState.PAUSED_LEVEL_UP);
      const options = generateUpgradeOptions(currentWeapons, currentPassives, hp, maxHp);
      setLevelUpOptions(options);
  };

  const handleSelectUpgrade = (option: UpgradeOption) => {
      setLastSelectedUpgrade(option);
      setGameState(GameState.PLAYING);
  };

  const handleGameOver = (timeSurvived: number) => {
      setGameState(GameState.GAME_OVER); // Switch to Game Over UI (could be menu for now)
      setTimeout(() => {
          alert(`游戏结束! 存活时间: ${timeSurvived} 分钟`);
          setGameState(GameState.MENU);
      }, 100);
  };

  return (
    <div className="w-full h-full">
      {gameState === GameState.MENU && (
        <MainMenu onSelectCharacter={handleStartGame} />
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED_LEVEL_UP || gameState === GameState.GAME_OVER) && (
        <>
            <GameCanvas 
                character={selectedCharacter} 
                gameState={gameState} 
                setGameState={setGameState}
                onLevelUp={handleLevelUp}
                onGameOver={handleGameOver}
                newWeaponToAdd={lastSelectedUpgrade}
            />
            
            {gameState === GameState.PAUSED_LEVEL_UP && (
                <LevelUpScreen 
                    character={selectedCharacter}
                    options={levelUpOptions}
                    onSelect={handleSelectUpgrade}
                />
            )}
        </>
      )}
    </div>
  );
};

export default App;
