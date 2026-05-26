import { motion } from 'motion/react';
import { ArrowLeft, Gamepad2, Shield, Flame, Sword, Sparkles } from 'lucide-react';
import { GameScreen } from '../types';
import { sound } from '../utils/sound';

interface ControlsPopupProps {
  onNavigate: (screen: GameScreen) => void;
}

export default function ControlsPopup({ onNavigate }: ControlsPopupProps) {
  const handleBack = () => {
    sound.playBanana();
    onNavigate(GameScreen.MAIN_MENU);
  };

  const keys = [
    { key: '← / A', action: 'Lari ke Kiri' },
    { key: '→ / D', action: 'Lari ke Kanan' },
    { key: '↑ / W / SPACE', action: 'Melompat Tinggi / Naik Tangga' },
    { key: '↓ / S', action: 'Turun Tangga / Tunduk' },
    { key: 'Z / J / F', action: 'Lempar Kelapa (Butuh Power-Up Cabai / Upgrade)' },
  ];

  const enemies = [
    {
      name: 'Ular Hijau (Snake)',
      desc: 'Merayap perlahan di dahan pohon dan platform. Bisa diatasi dengan dilompat gila-gilaan dari atas kepala, atau ditembak kelapa.',
      weakness: 'Lompat atas kepala / Tembak 1 Kelapa',
      avatar: '🐍'
    },
    {
      name: 'Celeng Liar (Wild Boar)',
      desc: 'Berlari seruduk tangguh di atas pasir datar. Kecepatannya tinggi. Berhati-hatilah saat melompatinya!',
      weakness: 'Lompat tinggi pas / Tembak 2 Kelapa',
      avatar: '🐗'
    },
    {
      name: 'Elang Pengintai (Eagle)',
      desc: 'Terbang mengepak di langit berawan. Akan langsung menukik menyerang jika Miko berada tepat di radius pemantauannya.',
      weakness: 'Merunduk / Tembak dengan Kelapa',
      avatar: '🦅'
    },
    {
      name: 'Kobra Peludah (Spit Cobra)',
      desc: 'Diam berjaga di tanah kuil kuno. Secara periodik memuntahkan bola bisa beracun yang mematikan miko.',
      weakness: 'Lompati bulatan racun / Tembak 2 Kelapa',
      avatar: '🐍'
    },
    {
      name: 'Raja Gorila Hitam (World 1 BOSS)',
      desc: 'Bos besar penjaga kuil emas. Menghentak tanah yang merontokkan reruntuhan batu, melempar batu besar purba.',
      weakness: 'Hindari batu jatuh + Tembak Kelapa Berkali-kali!',
      avatar: '🦍'
    },
    {
      name: 'Naga Kawah Membara (World 2 BOSS)',
      desc: 'Bos legenda gunung berapi super sulit. Menyemburkan bola api lava mematikan dan memanggil pilar magma.',
      weakness: 'Lompati lava pijar + Tembak kelapa ke kepala naga!',
      avatar: '🐉'
    }
  ];

  return (
    <div className="relative w-full min-h-screen bg-slate-900 text-white overflow-y-auto flex flex-col p-4 md:p-8">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-950/20 via-slate-950 to-amber-950/20 z-0 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-4xl w-full mx-auto flex items-center space-x-4 mb-8 border-b border-slate-800 pb-6">
        <button
          onClick={handleBack}
          className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95 group flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Panduan Bermain & Musuh
          </h1>
          <p className="text-sm text-gray-400">Pahami skema kontrol keyboard &amp; kelemahan para predator liar di Rimba Purba!</p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="relative z-10 max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
        {/* Left Side: Controls & Mechanics */}
        <div className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-black flex items-center space-x-2 text-yellow-400 mb-4 font-sans">
              <Gamepad2 className="w-5 h-5" />
              <span>Tombol Kendali Keyboard</span>
            </h2>

            <div className="space-y-3">
              {keys.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <span className="text-xs text-slate-400">{item.action}</span>
                  <kbd className="px-3 py-1 bg-slate-900/90 border border-slate-750 text-yellow-400 font-mono text-xs rounded-md shadow-sm">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-5 text-[11px] text-gray-500 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              💡 <strong>Catatan:</strong> Untuk perangkat Touchscreen / Tablet, game akan memunculkan <strong>D-Pad Joystick Virtual</strong> di layar secara otomatis! Anda dapat lari, memanjat tangga, melompat, dan menembak kelapa menggunakan jempol tangan.
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md">
            <h2 className="text-lg font-black flex items-center space-x-2 text-emerald-400 mb-4 font-sans">
              <Sparkles className="w-5 h-5" />
              <span>Bantuan Barang &amp; Power-Up</span>
            </h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl select-none">🌶️</span>
                <div>
                  <h3 className="text-xs font-black text-white">Cabai Rawit (Hot Chili)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Miko membara merah membakar! Melejitkan kelajuan lari serta memberi miko kekuatan <strong>melempar kelapa pembakar</strong> dalam waktu singkat tanpa butuh peluru!</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl select-none">🛡️</span>
                <div>
                  <h3 className="text-xs font-black text-white">Perisai Bintang Emas (Golden Shield)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Membuat Miko bercahaya magis pelangi, menjadi <strong>kebal dari segala gigitan predator</strong>. Berlari ke arah predator dalam mode ini akan otomatis membasmi mereka!</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl select-none">🧲</span>
                <div>
                  <h3 className="text-xs font-black text-white">Magnet Pisang (Banana Magnet)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Menarik semua buah pisang yang mengambang di sekitar platform langsung menuju genggaman Miko secara otomatis.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Predator Database */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md flex flex-col h-full">
          <h2 className="text-lg font-black flex items-center space-x-2 text-red-400 mb-4 font-sans">
            <Sword className="w-5 h-5 animate-pulse" />
            <span>Katalog Predator &amp; Kelemahan</span>
          </h2>

          <div className="space-y-4 overflow-y-auto max-h-[460px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {enemies.map((enemy, idx) => (
              <div key={idx} className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-750 rounded-xl transition-all flex items-start space-x-3">
                <span className="text-3xl select-none bg-slate-800/80 p-2 rounded-lg border border-slate-700">{enemy.avatar}</span>
                <div className="flex-grow">
                  <span className="text-xs font-black text-white block">{enemy.name}</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{enemy.desc}</p>
                  <span className="inline-block mt-2 text-[10px] bg-red-400/10 border border-red-500/20 text-red-400 font-mono px-2 py-0.5 rounded-full">
                    Kelemahan: {enemy.weakness}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
