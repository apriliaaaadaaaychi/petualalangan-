import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameScreen, Upgrades, HighScoreEntry, LevelConfig } from './types';
import MainMenu from './components/MainMenu';
import UpgradeShop from './components/UpgradeShop';
import LevelSelector from './components/LevelSelector';
import Highscores from './components/Highscores';
import ControlsPopup from './components/ControlsPopup';
import GameCanvas from './components/GameCanvas';

const DEFAULT_LEVELS_DB: LevelConfig[] = [
  {
    id: 1,
    name: 'Mula Rimba Purba',
    world: 1,
    description: 'Hutan bambu rimbun menyegarkan. Tempat tepat melatih ketangkasan Miko melompat tinggi dan memakan pisang murni.',
    difficulty: 'Mudah',
    targetBananas: 8,
    isBossLevel: false,
    backgroundTheme: 'jungle',
    unlocked: true,
    highScore: 0,
  },
  {
    id: 2,
    name: 'Lembah Penyengat',
    world: 1,
    description: 'Gowa berair lumut payau, dipenuhi lari kencang celeng liar & kepakan elang pengincar dari cakrawala langit.',
    difficulty: 'Sedang',
    targetBananas: 14,
    isBossLevel: false,
    backgroundTheme: 'cave',
    unlocked: false,
    highScore: 0,
  },
  {
    id: 3,
    name: 'Sarang Harimau Kuno',
    world: 1,
    description: 'Lorong runtuhan kuil abu-abu yang dihuni Cobra peludah racun mistis. Lompat waspada pada lontaran bola bisa!',
    difficulty: 'Sulit',
    targetBananas: 20,
    isBossLevel: false,
    backgroundTheme: 'temple',
    unlocked: false,
    highScore: 0,
  },
  {
    id: 4,
    name: 'AULA BOS: Raja Gorila (BOS)',
    world: 1,
    description: 'Takhta keramat pemujaan dewa kera. Sang Raja Gorila mengamuk dengan batu kerikil pecah dan serudukan gempa runtuhan!',
    difficulty: 'BOS',
    targetBananas: 12,
    isBossLevel: true,
    bossName: 'RAJA GORILA HITAM',
    backgroundTheme: 'temple',
    unlocked: false,
    highScore: 0,
  },
  {
    id: 5,
    name: 'PUNCAK CORONG VOLCANO (FINAL BOS)',
    world: 2,
    description: 'Kawah lava obsidian mendidih mematikan. Semburan kobaran api Naga legenda akan menguji batas tertinggi kelincahan Miko!',
    difficulty: 'BOS',
    targetBananas: 15,
    isBossLevel: true,
    bossName: 'NAGA KAWAH MEMBARA',
    backgroundTheme: 'volcano',
    unlocked: false,
    highScore: 0,
  }
];

const DEFAULT_HIGHSCORES_DB: HighScoreEntry[] = [
  {
    playerName: 'KingKong99',
    score: 3800,
    bananasCollected: 95,
    levelReached: 'AULA BOS: Raja Gorila',
    date: '2026-05-18T10:00:00Z'
  },
  {
    playerName: 'ChimpMaster',
    score: 2950,
    bananasCollected: 72,
    levelReached: 'Sarang Harimau Kuno',
    date: '2026-05-22T14:30:00Z'
  },
  {
    playerName: 'MikoJunior',
    score: 1450,
    bananasCollected: 38,
    levelReached: 'Lembah Penyengat',
    date: '2026-05-25T08:15:00Z'
  },
  {
    playerName: 'TarzanLiar',
    score: 980,
    bananasCollected: 25,
    levelReached: 'Mula Rimba Purba',
    date: '2026-05-26T02:00:00Z'
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.MAIN_MENU);
  
  // Permanent Bananas Currency state
  const [bananasCount, setBananasCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('miko_bananas_currency');
      return stored ? parseInt(stored) : 10; // start with 10 free beans as warm welcome gift!
    } catch {
      return 10;
    }
  });

  // Upgrades database
  const [upgrades, setUpgrades] = useState<Upgrades>(() => {
    const defaultStats: Upgrades = {
      maxHealthLevel: 0,
      damageLevel: 0,
      magnetLevel: 0,
      speedLevel: 0
    };
    try {
      const stored = localStorage.getItem('miko_upgrades');
      return stored ? JSON.parse(stored) : defaultStats;
    } catch {
      return defaultStats;
    }
  });

  // Levels database state
  const [levels, setLevels] = useState<LevelConfig[]>(() => {
    try {
      const stored = localStorage.getItem('miko_levels');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sync structures in case of upgrades
        return DEFAULT_LEVELS_DB.map(def => {
          const matched = parsed.find((p: any) => p.id === def.id);
          return matched ? { ...def, unlocked: matched.unlocked, highScore: matched.highScore } : def;
        });
      }
      return DEFAULT_LEVELS_DB;
    } catch {
      return DEFAULT_LEVELS_DB;
    }
  });

  // High score records state
  const [highscores, setHighscores] = useState<HighScoreEntry[]>(() => {
    try {
      const stored = localStorage.getItem('miko_highscores');
      return stored ? JSON.parse(stored) : DEFAULT_HIGHSCORES_DB;
    } catch {
      return DEFAULT_HIGHSCORES_DB;
    }
  });

  // Current selected interactive playing level id
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  // Sync state modifications safely with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('miko_bananas_currency', bananasCount.toString());
    } catch {}
  }, [bananasCount]);

  useEffect(() => {
    try {
      localStorage.setItem('miko_upgrades', JSON.stringify(upgrades));
    } catch {}
  }, [upgrades]);

  useEffect(() => {
    try {
      localStorage.setItem('miko_levels', JSON.stringify(levels));
    } catch {}
  }, [levels]);

  useEffect(() => {
    try {
      // Sort highscores desc before saving
      const sorted = [...highscores].sort((a, b) => b.score - a.score);
      localStorage.setItem('miko_highscores', JSON.stringify(sorted));
    } catch {}
  }, [highscores]);

  // Handle Permanent Character Upgrade Purchase in Shop
  const handleUpgradeStat = (stat: keyof Upgrades, cost: number) => {
    if (bananasCount >= cost) {
      setBananasCount(prev => prev - cost);
      setUpgrades(prev => ({
        ...prev,
        [stat]: prev[stat] + 1
      }));
    }
  };

  // Handle Select Level
  const handleOnSelectLevel = (levelId: number) => {
    setSelectedLevelId(levelId);
    setCurrentScreen(GameScreen.PLAYING);
  };

  // Handle Winning Level Completed
  const handleWinLevel = (levelId: number, score: number, collectedBananas: number) => {
    // Add collected bananas to permanent savings currency
    setBananasCount(prev => prev + collectedBananas);

    // Record high score for this level
    setLevels(prevLevels => {
      const updated = prevLevels.map(lvl => {
        if (lvl.id === levelId) {
          return { ...lvl, highScore: Math.max(lvl.highScore, score) };
        }
        // Unlock next Level in progression
        if (lvl.id === levelId + 1) {
          return { ...lvl, unlocked: true };
        }
        return lvl;
      });
      return updated;
    });

    // Go back to level select dashboard map
    setCurrentScreen(GameScreen.LEVEL_SELECTOR);
  };

  // Handle saving new score entry
  const handleSaveHighscore = (entry: HighScoreEntry) => {
    setHighscores(prev => {
      const updated = [entry, ...prev];
      return updated.sort((a, b) => b.score - a.score).slice(0, 15); // cap leaderboards top 15
    });
  };

  // Reset leaderboard databases
  const handleClearHighscores = () => {
    setHighscores(DEFAULT_HIGHSCORES_DB);
  };

  const activeLevelConfig = levels.find(l => l.id === selectedLevelId);

  return (
    <div className="w-full min-h-screen bg-slate-900 select-none overflow-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === GameScreen.MAIN_MENU && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <MainMenu 
              onNavigate={setCurrentScreen} 
              bananasCount={bananasCount}
            />
          </motion.div>
        )}

        {currentScreen === GameScreen.LEVEL_SELECTOR && (
          <motion.div
            key="levels"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="w-full h-full"
          >
            <LevelSelector
              levels={levels}
              onSelectLevel={handleOnSelectLevel}
              onNavigate={setCurrentScreen}
              bananasCount={bananasCount}
            />
          </motion.div>
        )}

        {currentScreen === GameScreen.UPGRADE_SHOP && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="w-full h-full"
          >
            <UpgradeShop
              upgrades={upgrades}
              bananasCount={bananasCount}
              onUpgrade={handleUpgradeStat}
              onNavigate={setCurrentScreen}
            />
          </motion.div>
        )}

        {currentScreen === GameScreen.HIGHSCORES && (
          <motion.div
            key="highscores"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <Highscores
              highscores={highscores}
              onClearHighscores={handleClearHighscores}
              onNavigate={setCurrentScreen}
            />
          </motion.div>
        )}

        {currentScreen === GameScreen.CONTROLS && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <ControlsPopup onNavigate={setCurrentScreen} />
          </motion.div>
        )}

        {currentScreen === GameScreen.PLAYING && activeLevelConfig && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <GameCanvas
              level={activeLevelConfig}
              upgrades={upgrades}
              bananasCount={bananasCount}
              onWinLevel={handleWinLevel}
              onExitGame={() => setCurrentScreen(GameScreen.LEVEL_SELECTOR)}
              onSaveHighscore={handleSaveHighscore}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
