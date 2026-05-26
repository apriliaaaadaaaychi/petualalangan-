import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Heart, Sword, Magnet, Zap, ShieldCheck } from 'lucide-react';
import { Upgrades, GameScreen } from '../types';
import { sound } from '../utils/sound';

interface UpgradeShopProps {
  upgrades: Upgrades;
  bananasCount: number;
  onUpgrade: (stat: keyof Upgrades, cost: number) => void;
  onNavigate: (screen: GameScreen) => void;
}

export default function UpgradeShop({ upgrades, bananasCount, onUpgrade, onNavigate }: UpgradeShopProps) {
  // Constants for costs and specs
  const upgradeDefinitions = {
    maxHealthLevel: {
      title: 'Kesehatan Maksimal (Darah)',
      description: 'Menambah jumlah jantung hidup Miko agar bisa bertahan dari gigitan predator.',
      icon: <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />,
      costs: [30, 75, 150, 300, 500],
      max: 5,
      getBonus: (lvl: number) => `Maks. Hidup: ${3 + lvl} Jantung`,
    },
    damageLevel: {
      title: 'Kekuatan Tempurung Kelapa',
      description: 'Meningkatkan daya hancur lemparan kelapa Miko untuk meluluhlantakkan predator raksasa & Bos.',
      icon: <Sword className="w-6 h-6 text-amber-500" />,
      costs: [40, 90, 180, 320, 550],
      max: 5,
      getBonus: (lvl: number) => `Kekuatan Serang: ${1 + lvl} DMG`,
    },
    magnetLevel: {
      title: 'Sensor Magnetik Pisang',
      description: 'Menarik pisang di sekitar Miko secara otomatis. Level tinggi memiliki jangkauan tarikan lebih luas!',
      icon: <Magnet className="w-6 h-6 text-blue-400" />,
      costs: [50, 100, 200, 350, 500],
      max: 5,
      getBonus: (lvl: number) => lvl === 0 ? 'Belum aktif' : `Radius Tarik: ${lvl * 40} Piksel`,
    },
    speedLevel: {
      title: 'Kelincahan & Stamina Miko',
      description: 'Meningkatkan kelajuan lari dan gaya lompatan Miko untuk memanjat & menghindar dengan gesit.',
      icon: <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400" />,
      costs: [25, 60, 120, 240, 400],
      max: 5,
      getBonus: (lvl: number) => `Kelajuan Miko: +${lvl * 10}% Kecepatan`,
    },
  };

  const handleBuy = (key: keyof Upgrades, cost: number) => {
    if (bananasCount >= cost) {
      onUpgrade(key, cost);
      sound.playPowerUp();
    } else {
      sound.playHurt(); // buzzer sound
    }
  };

  const handleBack = () => {
    sound.playBanana();
    onNavigate(GameScreen.MAIN_MENU);
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-900 text-white overflow-y-auto flex flex-col p-4 md:p-8">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-indigo-950/40 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.05)_0%,rgba(0,0,0,0)_60%)] z-0 pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 max-w-4xl w-full mx-auto flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95 group flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100 bg-clip-text text-transparent">
              Toko Upgrade Si Miko
            </h1>
            <p className="text-sm text-gray-400">Tingkatkan kekuatan Miko untuk melumpuhkan predator liar &amp; menaklukkan Bos!</p>
          </div>
        </div>

        {/* Currency badge */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="flex items-center space-x-3 px-5 py-3 bg-slate-800 border-2 border-amber-500/40 rounded-2xl shadow-lg"
        >
          <span className="text-3xl">🍌</span>
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-mono">Dompet Pisang Anda</div>
            <div className="text-xl font-black text-yellow-400 font-mono">{bananasCount} <span className="text-xs text-white">Pisang</span></div>
          </div>
        </motion.div>
      </div>

      {/* Grid Content */}
      <div className="relative z-10 max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(upgradeDefinitions).map(([key, def]) => {
          const currentLevel = upgrades[key as keyof Upgrades];
          const isMax = currentLevel >= def.max;
          const currentCost = def.costs[currentLevel];
          const canAfford = bananasCount >= currentCost;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-600 transition-all shadow-md relative overflow-hidden group"
            >
              {isMax && (
                <div className="absolute top-0 right-0 bg-yellow-500/10 border-l border-b border-yellow-500/30 text-yellow-400 text-[10px] font-mono uppercase px-2 py-1 rounded-bl-lg flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>MAKSIMAL</span>
                </div>
              )}

              {/* Icon and Titles */}
              <div>
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 group-hover:bg-slate-900/40 transition-colors">
                    {def.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-black font-sans leading-tight text-white">{def.title}</h2>
                    <span className="text-xs text-amber-400 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">
                      Tier {currentLevel} / {def.max}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  {def.description}
                </p>

                {/* Level indicators */}
                <div className="flex space-x-1.5 mb-4">
                  {[...Array(def.max)].map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 flex-grow rounded-sm transition-all ${
                        index < currentLevel
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                          : 'bg-slate-900'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer and purchase action */}
              <div className="pt-4 border-t border-slate-700/60 mt-auto flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase">Statistik Sekarang</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">{def.getBonus(currentLevel)}</div>
                </div>

                {!isMax ? (
                  <button
                    onClick={() => handleBuy(key as keyof Upgrades, currentCost)}
                    disabled={!canAfford}
                    className={`px-4 py-2.5 rounded-xl font-bold font-sans text-xs flex items-center space-x-2 border transition-all active:scale-95 cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 border-yellow-400 hover:brightness-110 shadow-[0_2px_10px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-700/50 text-gray-400 border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <span>Upgrade:</span>
                    <span className="font-mono text-sm underline decoration-amber-600 font-black">{currentCost} 🍌</span>
                  </button>
                ) : (
                  <div className="text-xs font-mono text-yellow-400 flex items-center space-x-1 bg-yellow-500/5 px-3 py-2 rounded-xl border border-yellow-500/20">
                    <span>🔥 Sudah Level Max</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Extra helper tip */}
      <div className="relative z-10 max-w-4xl w-full mx-auto mt-8 p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl flex items-center space-x-4">
        <div className="text-2xl animate-spin select-none" style={{ animationDuration: '6s' }}>🌀</div>
        <p className="text-xs text-emerald-300 leading-relaxed">
          <strong>Tip Petualang:</strong> Peningkatan kekuatan ini bersifat <strong>abadi</strong>! Sekalipun Miko kehabisan nyawa dan Game Over dalam level, semua upgrade yang telah dibeli akan tetap tersimpan aman di profil Miko. Kumpulkan pisang sebanyak-banyaknya di level mudah untuk melatih kekuatan Miko!
        </p>
      </div>
    </div>
  );
}
