import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Calendar, Star, Trash2 } from 'lucide-react';
import { GameScreen, HighScoreEntry } from '../types';
import { sound } from '../utils/sound';

interface HighscoresProps {
  highscores: HighScoreEntry[];
  onClearHighscores: () => void;
  onNavigate: (screen: GameScreen) => void;
}

export default function Highscores({ highscores, onClearHighscores, onNavigate }: HighscoresProps) {
  const handleBack = () => {
    sound.playBanana();
    onNavigate(GameScreen.MAIN_MENU);
  };

  const clearScores = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua catatan papan skor?')) {
      onClearHighscores();
      sound.playHurt();
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-900 text-white overflow-y-auto flex flex-col p-4 md:p-8">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-950/20 via-slate-950 to-emerald-950/20 z-0 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95 group flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-105 bg-clip-text text-transparent">
              Papan Skor Legenda
            </h1>
            <p className="text-sm text-gray-400">Peringkat petelan kera terbaik yang berhasil megatasi predator purbakala.</p>
          </div>
        </div>

        {highscores.length > 3 && (
          <button
            onClick={clearScores}
            className="p-2.5 bg-red-950/20 hover:bg-red-950/60 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl transition-all active:scale-95 text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Skor</span>
          </button>
        )}
      </div>

      {/* Leaderboard Podium Top 3 */}
      <div className="relative z-10 max-w-4xl w-full mx-auto mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highscores.slice(0, 3).map((entry, index) => {
            const positions = [
              { color: 'from-yellow-400 to-amber-500', label: '1ST GOLD', ring: 'border-yellow-400 shadow-[0_4px_15px_rgba(245,158,11,0.3)]', scale: 'md:scale-105 border-t-4' },
              { color: 'from-slate-300 to-slate-400', label: '2ND SILVER', ring: 'border-slate-300 shadow-[0_4px_15px_rgba(156,163,175,0.2)]', scale: 'border-t-4' },
              { color: 'from-amber-600 to-amber-800', label: '3RD BRONZE', ring: 'border-amber-700 shadow-[0_4px_15px_rgba(180,83,9,0.2)]', scale: 'border-t-4' },
            ];
            const p = positions[index] || positions[2];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-slate-800/90 border ${p.ring} ${p.scale} rounded-2xl p-5 flex flex-col justify-between items-center relative overflow-hidden text-center`}
              >
                {/* Medal crown representation */}
                <div className={`p-3 bg-gradient-to-r ${p.color} text-slate-950 rounded-full font-black text-xs font-mono mb-3`}>
                  <Trophy className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-xs font-mono tracking-widest text-slate-400 uppercase">{p.label}</h3>
                  <h2 className="text-xl font-black text-white mt-1 leading-tight max-w-[180px] truncate">{entry.playerName}</h2>
                </div>

                <div className="mt-4 bg-slate-900/60 border border-slate-700/50 px-4 py-3 rounded-xl w-full">
                  <div className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Skor Diperoleh</div>
                  <div className="text-2xl font-black text-yellow-400 font-mono tracking-tight">{entry.score}</div>
                  <div className="text-[11px] text-emerald-400/95 font-medium mt-1">🍌 {entry.bananasCollected} Pisang</div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 font-mono w-full px-1">
                  <span className="truncate max-w-[100px]">{entry.levelReached}</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-gray-600" />
                    <span>{new Date(entry.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* List view for other placements */}
      <div className="relative z-10 max-w-4xl w-full mx-auto flex-grow bg-slate-800/80 border border-slate-700 rounded-2xl shadow-lg p-4 md:p-6 overflow-hidden">
        <h2 className="text-xs font-black font-mono tracking-widest text-gray-400 uppercase mb-4 pl-1">PLACEMENTS #4 - #10</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/60 pb-3 text-gray-500 text-xs font-medium font-mono uppercase">
                <th className="py-2 px-3">No</th>
                <th className="py-2 px-3">Nama Pemain</th>
                <th className="py-2 px-3">Skor Akhir</th>
                <th className="py-2 px-3 text-center">Pisang Diambil</th>
                <th className="py-2 px-3">Level Capaian</th>
                <th className="py-2 px-3 text-right">Tanggal Berkelana</th>
              </tr>
            </thead>
            <tbody>
              {highscores.slice(3, 10).map((entry, index) => (
                <tr key={index} className="border-b border-slate-750 hover:bg-slate-750/30 transition-colors text-xs font-sans">
                  <td className="py-3 px-3 font-mono text-slate-400 font-bold">#{index + 4}</td>
                  <td className="py-3 px-3 font-bold text-white max-w-[150px] truncate">{entry.playerName}</td>
                  <td className="py-3 px-3 font-mono font-black text-yellow-400">{entry.score}</td>
                  <td className="py-3 px-3 font-mono text-center text-emerald-300">🍌 {entry.bananasCollected}</td>
                  <td className="py-3 px-3 font-medium text-slate-300">{entry.levelReached}</td>
                  <td className="py-3 px-3 text-right text-gray-400 font-mono text-[11px]">
                    {new Date(entry.date).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
              {highscores.length <= 3 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-gray-500 font-mono italic">
                    Belum ada penjelajah lain di papan peringkat bawah ini. Jadilah yang pertama masuk daftar!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
