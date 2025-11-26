import React from 'react';
import { UpgradeOption, CharacterConfig } from '../types';

interface LevelUpScreenProps {
  options: UpgradeOption[];
  onSelect: (option: UpgradeOption) => void;
  character: CharacterConfig;
}

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({ options, onSelect, character }) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center backdrop-blur-sm font-sans">
      <div className="w-full max-w-6xl flex flex-row h-[70vh]">
        
        {/* Left: Character "Source" View */}
        <div className="w-1/3 p-8 flex flex-col items-center justify-center border-r border-gray-800 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/50 pointer-events-none"></div>
          <div 
            className="w-48 h-48 rounded-full border-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-pulse flex items-center justify-center mb-8"
            style={{ borderColor: character.color, boxShadow: `0 0 30px ${character.color}` }}
          >
             {/* Abstract Spirit Orb */}
             <div className="w-32 h-32 rounded-full blur-xl opacity-80" style={{ backgroundColor: character.color }}></div>
          </div>
          <h2 className="text-4xl text-white font-bold mb-2">等级提升！</h2>
          <p className="text-gray-400 text-center">灵力共鸣 (P-Link) 已激活</p>
        </div>

        {/* Right: The 3 Choices */}
        <div className="w-2/3 p-12 flex flex-col justify-center">
            <h3 className="text-2xl text-white mb-8 text-center uppercase tracking-widest border-b border-gray-800 pb-4">
                选择一项强化
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
                {options.map((opt, idx) => (
                    <button
                        key={opt.id}
                        onClick={() => onSelect(opt)}
                        className={`
                            group relative overflow-hidden text-left p-6 rounded-lg border-2 transition-all duration-300 transform hover:scale-[1.02]
                            ${opt.rarity === 'legendary' ? 'border-yellow-500 bg-yellow-900/20' : 
                              opt.rarity === 'rare' ? 'border-purple-500 bg-purple-900/20' : 
                              'border-gray-600 bg-gray-800 hover:border-gray-400'}
                        `}
                    >
                        {/* Shining effect on hover */}
                        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-shine" />

                        <div className="flex items-center">
                            <div className={`
                                w-16 h-16 rounded flex items-center justify-center text-3xl mr-6 shadow-lg
                                ${opt.rarity === 'legendary' ? 'bg-yellow-600 text-yellow-100' : 'bg-gray-700 text-white'}
                            `}>
                                {opt.type === 'weapon_upgrade' ? opt.icon : (opt.type === 'weapon' ? '⚔️' : opt.type === 'heal' ? '🍗' : '📘')}
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className={`text-xl font-bold ${opt.rarity === 'legendary' ? 'text-yellow-400' : 'text-white'}`}>
                                        {opt.name}
                                    </h4>
                                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-1 rounded bg-black/50 text-gray-400">
                                        {opt.isNew ? '新获取!' : `等级 ${opt.level + 1}`}
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm">{opt.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
      </div>

        <style>{`
            @keyframes shine {
                0% { left: -50%; }
                100% { left: 150%; }
            }
            .animate-shine {
                animation: shine 1s;
            }
        `}</style>
    </div>
  );
};