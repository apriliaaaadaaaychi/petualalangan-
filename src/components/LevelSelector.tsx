import { motion } from 'motion/react';
import { ArrowLeft, Lock, Trophy, Play, Star, Sparkles, AlertCircle } from 'lucide-react';
import { LevelConfig, GameScreen } from '../types';
import { sound } from '../utils/sound';

interface LevelSelectorProps {
  levels: LevelConfig[];
  onSelectLevel: (levelId: number) => void;
  onNavigate: (screen: GameScreen) => void;
  bananasCount: number;
}

export default function LevelSelector({ levels, onSelectLevel, onNavigate, bananasCount }: LevelSelectorProps) {
  const handleLevelClick = (lvl: LevelConfig) => {
    if (!lvl.unlocked) {
      sound.playHurt(); // sound of failure
      return;
    }
    sound.playPowerUp();
    onSelectLevel(lvl.id);
  };

  const handleBack = () => {
    sound.playBanana();
    onNavigate(GameScreen.MAIN_MENU);
  };

  // Group levels by world
  const worlds = {
    1: {
      name: 'Dunia 1: Rimba Purba (Ancient Jungle)',
      description: 'Lembah hijau berselimut lumut purbakala, diselimuti hewan liar berbahaya.',
      levels: levels.filter(l => l.world === 1),
      bg: 'from-emerald-950/40 via-teal-950/20 to-slate-900',
    },
    2: {
      name: 'Dunia 2: Puncak Gunung Berapi (Volcano Crater)',
      description: 'Gua berselimut obsidian cair tempat bersemayam takhta sang naga kegelapan.',
      levels: levels.filter(l => l.world === 2),
      bg: 'from-amber-950/40 via-red-950/20 to-slate-900',
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-900 text-white overflow-y-auto flex flex-col p-4 md:p-8">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900 z-0 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95 group flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-amber-400 to-yellow-200 bg-clip-text text-transparent">
              Peta Petualangan Miko
            </h1>
            <p className="text-sm text-gray-400">Taklukkan setiap level, kumpulkan pisang emas, dan tantang Raja Rimba!</p>
          </div>
        </div>

        {/* Banana display in levels selector */}
        <div className="flex items-center space-x-3 px-5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-md">
          <span className="text-2xl">🍌</span>
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-mono leading-none mb-1">Total Tabungan</div>
            <div className="text-lg font-black text-yellow-400 font-mono leading-none">{bananasCount} <span className="text-xs text-white">Pisang</span></div>
          </div>
        </div>
      </div>

      {/* Worlds and Map layout */}
      <div className="relative z-10 max-w-5xl w-full mx-auto space-y-12 pb-12">
        {Object.entries(worlds).map(([worldId, world]) => (
          <div key={worldId} className={`rounded-3xl p-6 md:p-8 border border-slate-800/80 bg-gradient-to-br ${world.bg} shadow-xl relative overflow-hidden`}>
            {/* World title area */}
            <div className="mb-6 relative z-10">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold uppercase rounded-lg">
                  DUNIA {worldId}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">{world.name}</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 max-w-2xl">{world.description}</p>
            </div>

            {/* Path mapping blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {world.levels.map((lvl) => {
                const difficultyColors = {
                  'Mudah': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
                  'Sedang': 'text-blue-400 border-blue-500/30 bg-blue-500/5',
                  'Sulit': 'text-amber-400 border-amber-500/30 bg-amber-500/5',
                  'Sangat Sulit': 'text-orange-400 border-orange-500/30 bg-orange-500/5',
                  'BOS': 'text-red-400 border-red-500/30 bg-red-500/10 animate-pulse'
                };

                return (
                  <motion.div
                    key={lvl.id}
                    whileHover={lvl.unlocked ? { scale: 1.02, y: -4 } : {}}
                    whileTap={lvl.unlocked ? { scale: 0.98 } : {}}
                    onClick={() => handleLevelClick(lvl)}
                    className={`relative rounded-2xl p-5 border cursor-pointer select-none flex flex-col justify-between h-48 transition-all ${
                      lvl.unlocked
                        ? 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 shadow-md flex-col text-left'
                        : 'bg-slate-900/80 border-slate-800 text-gray-500 cursor-not-allowed text-left opacity-60'
                    }`}
                  >
                    {!lvl.unlocked && (
                      <div className="absolute inset-0 bg-slate-950/40 rounded-2xl flex items-center justify-center backdrop-blur-[1px] z-20">
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-lg flex items-center space-x-2">
                          <Lock className="w-4 h-4 text-red-400" />
                          <span className="text-xs font-mono uppercase text-gray-400">Terkunci</span>
                        </div>
                      </div>
                    )}

                    {/* Level Badge Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-gray-400">
                          TAHAP {lvl.id}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wide font-black px-2 py-0.5 rounded-md border ${difficultyColors[lvl.difficulty]}`}>
                          {lvl.difficulty}
                        </span>
                      </div>

                      <h3 className={`text-base font-black ${lvl.unlocked ? 'text-white' : 'text-gray-500'}`}>
                        {lvl.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {lvl.description}
                      </p>
                    </div>

                    {/* Level Card Footer */}
                    <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-mono">Target Minimal</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-yellow-400">{lvl.targetBananas} 🍌</span>
                        </div>
                      </div>

                      {lvl.unlocked && (
                        <div className="flex items-center space-x-2">
                          {lvl.highScore > 0 && (
                            <div className="flex items-center space-x-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20" title={`Skor Tertinggi: ${lvl.highScore}`}>
                              <Trophy className="w-3.5 h-3.5" />
                              <span className="text-xs font-mono font-bold">{lvl.highScore}</span>
                            </div>
                          )}
                          <div className="p-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 rounded-lg shadow-sm">
                            <Play className="w-4 h-4 fill-slate-9500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Warnings & Advice */}
      <div className="relative z-10 max-w-5xl w-full mx-auto p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start space-x-4">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-300 leading-relaxed">
          <p className="font-bold mb-1">🔥 Mengalahkan Bos di Akhir Dunia:</p>
          <p>Dunia 1 dipimpin oleh **Raja Gorila Hitam** di Tahap 4. Kalahkan dia untuk membuka akses ke dunia pegunungan api (World 2)! Sebelum memasuki Tahap Bos, disarankan untuk mengupgrade lemparan sDamage dan memperbanyak Jantung Hidup di <strong>Toko Upgrade</strong> agar serangan tempurung Anda berdaya hancur tinggi.</p>
        </div>
      </div>
    </div>
  );
}
