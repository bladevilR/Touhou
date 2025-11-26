import React from 'react';
import { CHARACTERS } from '../constants';
import { CharacterId } from '../types';

interface MainMenuProps {
  onSelectCharacter: (id: CharacterId) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectCharacter }) => {
  return (
    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://picsum.photos/1920/1080')] bg-cover filter blur-sm"></div>

      <div className="relative z-10 text-center mb-12">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 mb-2 filter drop-shadow-lg">
          东方幻灵乱舞
        </h1>
        <p className="text-xl text-gray-300 tracking-widest">Touhou Phantom Spirit Dance</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full px-8">
        {Object.values(CHARACTERS).map((char) => (
          <div
            key={char.id}
            onClick={() => onSelectCharacter(char.id)}
            className="group relative h-96 bg-gray-800 border-2 border-gray-700 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:border-white hover:shadow-2xl hover:shadow-purple-500/20"
          >
            {/* Color accent */}
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: char.color }}
            />
            
            <div className="p-6 h-full flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Placeholder for Character Art */}
                <div 
                    className="w-32 h-32 rounded-full mb-6 flex items-center justify-center text-4xl shadow-inner bg-opacity-20 bg-black border-4"
                    style={{ borderColor: char.color, color: char.color }}
                >
                    <i className="fas fa-user-astronaut"></i>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">{char.name}</h2>
                <p className="text-sm text-gray-400 mb-4 italic">{char.title}</p>
                
                <p className="text-gray-300 text-sm text-center leading-relaxed">
                  {char.description}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                 <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>生命值 (HP)</span>
                    <span style={{width: `${char.stats.maxHp/2}%`}} className="h-1 bg-red-500 block rounded"></span>
                 </div>
                 <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>速度 (SPD)</span>
                    <span style={{width: `${char.stats.speed * 20}%`}} className="h-1 bg-green-500 block rounded"></span>
                 </div>
                 <div className="flex justify-between text-xs text-gray-400">
                    <span>攻击力 (ATK)</span>
                    <span style={{width: `${char.stats.might * 80}%`}} className="h-1 bg-blue-500 block rounded"></span>
                 </div>
              </div>
            </div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 pointer-events-none"></div>
          </div>
        ))}
      </div>
      
      <p className="relative z-10 mt-12 text-gray-500 text-sm">WASD 移动 • 自动攻击 • 存活下去</p>
    </div>
  );
};