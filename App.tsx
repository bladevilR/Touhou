
import React, { useState, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { LevelUpScreen } from './components/LevelUpScreen';
import { GameState, CharacterId, UpgradeOption, Weapon, CharacterConfig } from './types';
import { CHARACTERS, WEAPON_DEFS, WEAPON_UPGRADE_TREES } from './constants';

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
    const maxOptions = 3;

    // 1. 优先检查：是否有武器需要深化升级树选择
    // 在等级 3, 5, 7 时触发升级树选择
    const weaponsNeedingTreeUpgrade = currentWeapons.filter(w => {
      const level = w.level;
      const upgrades = w.upgrades || [];

      // Tier 1: level 3, Tier 2: level 5, Tier 3: level 7
      if (level === 3 && upgrades.length === 0) return true;
      if (level === 5 && upgrades.length === 1) return true;
      if (level === 7 && upgrades.length === 2) return true;
      return false;
    });

    // 如果有武器需要升级树选择，强制显示该武器的升级树选项
    if (weaponsNeedingTreeUpgrade.length > 0) {
      const weaponToUpgrade = weaponsNeedingTreeUpgrade[0];
      const upgradeTree = WEAPON_UPGRADE_TREES[weaponToUpgrade.id];

      if (upgradeTree) {
        const currentTier = (weaponToUpgrade.upgrades || []).length + 1;
        const availableUpgrades = upgradeTree.filter(u => u.tier === currentTier);

        return availableUpgrades.slice(0, 3).map(upgrade => ({
          id: upgrade.id,
          type: 'weapon_upgrade' as any,
          name: upgrade.name,
          description: upgrade.description,
          icon: upgrade.icon,
          level: currentTier,
          isNew: true,
          rarity: currentTier === 3 ? 'legendary' : (currentTier === 2 ? 'rare' : 'common'),
          weaponId: weaponToUpgrade.id
        } as any));
      }
    }

    // 2. 否则，显示武器升级或新武器选项
    const options: UpgradeOption[] = [];

    // 可升级的现有武器
    const upgradableWeapons = currentWeapons.filter(w => w.level < w.maxLevel);

    // 可获取的新武器
    const newWeaponPool = Object.values(WEAPON_DEFS).filter(def => {
      const hasIt = currentWeapons.some(cw => cw.id === def.id);
      if (hasIt) return false;
      if (def.exclusiveTo && def.exclusiveTo !== selectedCharacter.id) return false;
      return true;
    });

    // 生成3个选项
    let safetyCounter = 0;
    while (options.length < maxOptions && safetyCounter < 50) {
      safetyCounter++;

      // 70% 武器升级，30% 新武器
      const rand = Math.random();

      if (rand < 0.7 && upgradableWeapons.length > 0) {
        // 武器升级
        const w = upgradableWeapons[Math.floor(Math.random() * upgradableWeapons.length)];
        if (!options.find(o => o.id === w.id)) {
          options.push({
            id: w.id,
            type: 'weapon',
            name: w.name,
            description: `提升至 LV.${w.level + 1}`,
            icon: '⚔️',
            level: w.level,
            isNew: false,
            rarity: 'common'
          });
        }
      } else if (newWeaponPool.length > 0) {
        // 新武器
        const w = newWeaponPool[Math.floor(Math.random() * newWeaponPool.length)];
        if (!options.find(o => o.id === w.id)) {
          options.push({
            id: w.id,
            type: 'weapon',
            name: w.name,
            description: w.description,
            icon: '⚔️',
            level: 0,
            isNew: true,
            rarity: 'rare'
          });
        }
      }
    }

    // 如果没有足够选项（所有武器都满级且没有新武器），填充空选项
    while (options.length < maxOptions) {
      options.push({
        id: 'skip_' + Math.random(),
        type: 'passive' as any,
        name: '跳过',
        description: '什么都不做',
        icon: '⏭️',
        level: 0,
        isNew: false,
        rarity: 'common'
      });
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
