
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
    const options: UpgradeOption[] = [];

    // 检查是否有武器在3/5/7级需要选择特殊升级
    const weaponsNeedingSpecialUpgrade = currentWeapons.filter(w => {
      const upgrades = w.upgrades || [];
      if (w.level === 3 && upgrades.length === 0) return true;
      if (w.level === 5 && upgrades.length === 1) return true;
      if (w.level === 7 && upgrades.length === 2) return true;
      return false;
    });

    // 如果有武器需要特殊升级，显示该武器的升级树选项
    if (weaponsNeedingSpecialUpgrade.length > 0) {
      const weapon = weaponsNeedingSpecialUpgrade[0];
      const upgradeTree = WEAPON_UPGRADE_TREES[weapon.id];

      if (upgradeTree) {
        const currentTier = (weapon.upgrades || []).length + 1;
        const tierUpgrades = upgradeTree.filter(u => u.tier === currentTier);

        return tierUpgrades.slice(0, 3).map(upgrade => ({
          id: upgrade.id,
          type: 'weapon_upgrade' as any,
          name: upgrade.name,
          description: upgrade.description,
          icon: upgrade.icon,
          level: currentTier,
          isNew: true,
          rarity: currentTier === 3 ? 'legendary' : (currentTier === 2 ? 'rare' : 'common'),
          weaponId: weapon.id
        } as any));
      }
    }

    // 否则显示普通升级：3个武器的通用属性升级
    const upgradableWeapons = currentWeapons.filter(w => w.level < w.maxLevel);

    if (upgradableWeapons.length > 0) {
      // 随机选3个武器
      const shuffled = upgradableWeapons.sort(() => Math.random() - 0.5);
      const selectedWeapons = shuffled.slice(0, Math.min(3, shuffled.length));

      selectedWeapons.forEach(weapon => {
        // 为每个武器随机选择一个通用属性升级
        const statTypes: Array<{type: 'damage' | 'cooldown' | 'area' | 'count' | 'speed', name: string, icon: string}> = [
          { type: 'damage', name: '伤害', icon: '⚔️' },
          { type: 'cooldown', name: '冷却', icon: '⏱️' },
          { type: 'area', name: '范围', icon: '📐' },
          { type: 'count', name: '数量', icon: '🔢' },
          { type: 'speed', name: '速度', icon: '💨' }
        ];

        const randomStat = statTypes[Math.floor(Math.random() * statTypes.length)];

        options.push({
          id: `${weapon.id}_${randomStat.type}`,
          type: 'weapon_stat',
          name: `${weapon.name} - ${randomStat.name}`,
          description: `提升${weapon.name}的${randomStat.name}`,
          icon: randomStat.icon,
          level: weapon.level,
          isNew: false,
          rarity: 'common',
          weaponId: weapon.id,
          statType: randomStat.type
        });
      });
    }

    // 如果武器不足3个，补充新武器
    if (options.length < maxOptions) {
      const newWeaponPool = Object.values(WEAPON_DEFS).filter(def => {
        const hasIt = currentWeapons.some(cw => cw.id === def.id);
        if (hasIt) return false;
        if (def.exclusiveTo && def.exclusiveTo !== selectedCharacter.id) return false;
        return true;
      });

      const shuffledWeapons = newWeaponPool.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(maxOptions - options.length, shuffledWeapons.length); i++) {
        const w = shuffledWeapons[i];
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

    // 如果还不足3个，填充跳过
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
