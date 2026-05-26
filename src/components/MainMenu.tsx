import { motion } from 'motion/react';
import { Play, ShoppingBag, Trophy, Keyboard, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { GameScreen } from '../types';
import { sound } from '../utils/sound';
import { useState } from 'react';

interface MainMenuProps {
  onNavigate: (screen: GameScreen) => void;
  bananasCount: number;
}

export default function MainMenu({ onNavigate, bananasCount }: MainMenuProps) {
  const [isMuted, setIsMuted] = useState(sound.muted);

  const toggleMute = () => {
    sound.muted = !sound.muted;
    setIsMuted(sound.muted);
  };

  const handlePlaySound = (screen: GameScreen) => {
    sound.playBanana();
    onNavigate(screen);
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Decorative jungle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-slate-950 to-amber-950 opacity-80 z-0" />

      {/* Retro scanlines overlay for arcade feeling */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_100%)] z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 pointer-events-none" />

      {/* Floating animated fruits */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-5xl select-none"
            initial={{ 
              x: Math.random() * window.innerWidth - 100, 
              y: window.innerHeight + 100,
              rotate: Math.random() * 360
            }}
            animate={{ 
              y: -100,
              rotate: Math.random() * 360 + 360,
              x: `calc(${Math.random() * 200 - 100}px + ${Math.random() * 100}%)`
            }}
            transition={{ 
              duration: 10 + Math.random() * 15,
              repeat: Infinity,
              ease: "linear",
              delay: i * 2
            }}
          >
            🍌
          </motion.div>
        ))}
        {/* Sparkles / leaves */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`leaf-${i}`}
            className="absolute text-emerald-500 opacity-20 text-3xl"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: -50,
              rotate: Math.random() * 360
            }}
            animate={{ 
              y: window.innerHeight + 50,
              rotate: Math.random() * 720,
              x: `calc(${Math.random() * 100 - 50}px + ${Math.random() * 100}%)`
            }}
            transition={{ 
              duration: 12 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            🍃
          </motion.div>
        ))}
      </div>

      {/* UI Controls Header */}
      <div className="absolute top-4 right-4 z-20 flex space-x-2">
        <button
          onClick={toggleMute}
          className="p-3 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full border border-slate-700 backdrop-blur-sm shadow-md transition-all active:scale-95"
          title={isMuted ? "Aktifkan Suara" : "Bisukan Suara"}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* Main Content Card Container */}
      <div className="relative z-20 max-w-lg w-full flex flex-col items-center">
        {/* Top Mini Tag */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-sans tracking-widest text-xs px-4 py-1.5 rounded-full mb-4 shadow-sm flex items-center space-x-1.5 font-bold uppercase"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Game Petualangan 2D Retro</span>
        </motion.div>

        {/* Brand / Title Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="text-center mb-8 relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-2xl blur-lg opacity-30 animate-pulse" />
          <h1 className="relative text-5xl md:text-6xl font-black tracking-tight text-white select-none drop-shadow-lg leading-tight">
            PETUALANGAN<br />
            <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-sm font-sans">
              SI MIKO 🍌
            </span>
          </h1>
          <p className="mt-2 text-emerald-300/90 font-mono text-sm tracking-wide">
            LEGENDA PISANG EMAS & PREDATOR LIAR
          </p>
        </motion.div>

        {/* Bananas Currency Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 px-5 py-2.5 bg-slate-800/90 border border-amber-500/40 rounded-full flex items-center space-x-3 shadow-lg max-w-max"
        >
          <span className="text-2xl animate-bounce">🍌</span>
          <div className="text-left font-sans">
            <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Tabungan Pisang Anda</div>
            <div className="text-lg font-black text-yellow-400 font-mono">{bananasCount} <span className="text-xs text-gray-300">Pisang</span></div>
          </div>
        </motion.div>

        {/* Interactive Menu Buttons Grid */}
        <div className="w-full flex flex-col space-y-3 px-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlaySound(GameScreen.LEVEL_SELECTOR)}
            className="w-full py-4.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 rounded-2xl font-sans font-black text-xl tracking-wide shadow-[0_4px_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center space-x-3 cursor-pointer border-b-4 border-amber-700"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>MULAI BERKELANA</span>
          </motion.button>

          <div className="grid grid-cols-2 gap-3 w-full">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlaySound(GameScreen.UPGRADE_SHOP)}
              className="py-4 bg-slate-800/95 hover:bg-slate-700/95 text-white rounded-2xl font-sans font-bold text-sm tracking-wide border border-slate-700 shadow-md hover:border-amber-500/50 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span>Toko Upgrade</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlaySound(GameScreen.HIGHSCORES)}
              className="py-4 bg-slate-800/95 hover:bg-slate-700/95 text-white rounded-2xl font-sans font-bold text-sm tracking-wide border border-slate-700 shadow-md hover:border-amber-500/50 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span>Papan Skor</span>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlaySound(GameScreen.CONTROLS)}
            className="w-full py-3 bg-slate-800/40 hover:bg-slate-800/70 text-slate-300 hover:text-white rounded-xl font-sans font-medium text-xs tracking-wide border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span>Panduan Bermain & Musuh</span>
          </motion.button>
        </div>

        {/* Small footer lore */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1 }}
          className="mt-12 text-[11px] text-gray-500 font-mono text-center select-none"
        >
          Petualangan Miko v1.2 • Dibuat khusus dengan Peningkatan Karakter & Pertarungan Bos
        </motion.p>
      </div>
    </div>
  );
}
