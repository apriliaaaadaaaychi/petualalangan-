export enum GameScreen {
  MAIN_MENU = 'main_menu',
  LEVEL_SELECTOR = 'level_selector',
  PLAYING = 'playing',
  UPGRADE_SHOP = 'upgrade_shop',
  HIGHSCORES = 'highscores',
  CONTROLS = 'controls'
}

export interface PlayerStats {
  maxHealth: number;       // default initial: 3
  weaponDamage: number;    // default initial: 1
  shotSpeed: number;       // default initial: 5
  magnetRadius: number;    // default initial: 0 px (no magnet), upgraded to pull bananas
  speedBoost: number;      // default initial: 1.0 multiplier
  jumpMultiplier: number;  // default initial: 1.0 multiplier
}

export interface Upgrades {
  maxHealthLevel: number;    // max 5
  damageLevel: number;       // max 5
  magnetLevel: number;       // max 5
  speedLevel: number;        // max 5
}

export interface UpgradeCost {
  title: string;
  description: string;
  level: number;
  maxLevel: number;
  costs: number[]; // cost for next level, e.g. level 0->1 costs costs[0]
}

export interface LevelConfig {
  id: number;
  name: string;
  world: number;
  description: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit' | 'Sangat Sulit' | 'BOS';
  targetBananas: number;
  isBossLevel: boolean;
  bossName?: string;
  backgroundTheme: 'jungle' | 'cave' | 'temple' | 'volcano';
  unlocked: boolean;
  highScore: number;
}

export interface HighScoreEntry {
  playerName: string;
  score: number;
  bananasCollected: number;
  levelReached: string;
  date: string;
}

export type PowerUpType = 'COCONUT_SHOOTER' | 'GOLDEN_SHIELD' | 'SUPER_JUMP' | 'MAGNET_FEVER';

export interface PowerUp {
  type: PowerUpType;
  duration: number; // in frames or ms
  timer: number;
}
