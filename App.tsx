
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

    // 收集所有可用的武器升级树选项
    const allUpgradeChoices: Array<{weaponId: string, upgrade: any}> = [];

    currentWeapons.forEach(weapon => {
      const upgradeTree = WEAPON_UPGRADE_TREES[weapon.id];
      if (!upgradeTree) return;

      const currentUpgrades = weapon.upgrades || [];

      // 每个武器有3个tier，每次只能从当前tier选择
      let currentTier = 1;
      if (currentUpgrades.length >= 2) currentTier = 3;
      else if (currentUpgrades.length >= 1) currentTier = 2;

      // 获取该tier下还未选择的升级
      const tierUpgrades = upgradeTree.filter(u => u.tier === currentTier);
      tierUpgrades.forEach(upgrade => {
        if (!currentUpgrades.includes(upgrade.id)) {
          allUpgradeChoices.push({ weaponId: weapon.id, upgrade });
        }
      });
    });

    // 随机选择3个不同的升级选项
    const shuffled = allUpgradeChoices.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(maxOptions, shuffled.length); i++) {
      const choice = shuffled[i];
      options.push({
        id: choice.upgrade.id,
        type: 'weapon_upgrade' as any,
        name: choice.upgrade.name,
        description: choice.upgrade.description,
        icon: choice.upgrade.icon,
        level: choice.upgrade.tier,
        isNew: true,
        rarity: choice.upgrade.tier === 3 ? 'legendary' : (choice.upgrade.tier === 2 ? 'rare' : 'common'),
        weaponId: choice.weaponId
      } as any);
    }

    // 如果升级选项不足3个，添加新武器选项
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

    // 如果还是不足3个选项，填充"跳过"
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
