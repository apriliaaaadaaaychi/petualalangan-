import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Trophy, Banana, ArrowLeft, RefreshCw, 
  ChevronRight, Volume2, VolumeX, Shield, Zap, Sparkles, MapPin, ListCollapse
} from 'lucide-react';
import { LevelConfig, Upgrades, PlayerStats, GameScreen, HighScoreEntry, PowerUpType } from '../types';
import { sound } from '../utils/sound';

interface GameCanvasProps {
  level: LevelConfig;
  upgrades: Upgrades;
  bananasCount: number;
  onWinLevel: (levelId: number, score: number, collectedBananas: number) => void;
  onExitGame: () => void;
  onSaveHighscore: (entry: HighScoreEntry) => void;
}

// Fixed simulation space coordinate grid size
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

export default function GameCanvas({ 
  level, 
  upgrades, 
  bananasCount, 
  onWinLevel, 
  onExitGame,
  onSaveHighscore
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Upgrade stats mapping
  const maxHealth = 3 + upgrades.maxHealthLevel;
  const coconutDamage = 1 + upgrades.damageLevel;
  const magnetRadius = upgrades.magnetLevel * 40; // 0, 40, 80, 120, etc.
  const speedMultiplier = 1.0 + (upgrades.speedLevel * 0.1); // +10% speed per level

  // Game UI/Control states
  const [lives, setLives] = useState(maxHealth);
  const [score, setScore] = useState(0);
  const [levelBananas, setLevelBananas] = useState(0);
  const [totalBananasCollectedInLevel, setTotalBananasCollectedInLevel] = useState(0);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'gameover' | 'victory'>('intro');
  const [activePowerUp, setActivePowerUp] = useState<{ type: PowerUpType; duration: number; maxDuration: number } | null>(null);
  const activePowerUpRef = useRef<{ type: PowerUpType; duration: number; maxDuration: number } | null>(null);
  const renderFrameId = useRef<number | null>(null);
  const physicsFrameCounter = useRef(0);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const [coconutAmmo, setCoconutAmmo] = useState(0);
  const coconutAmmoRef = useRef(coconutAmmo);
  coconutAmmoRef.current = coconutAmmo;
  const [isMuted, setIsMuted] = useState(sound.muted);

  // Victory / Gameover screens states
  const [playerName, setPlayerName] = useState('MikoLovers');
  const [highscoreSaved, setHighscoreSaved] = useState(false);

  // Keyboard controls key bindings state
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Touch Controls Refs for mobile
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const touchJoystickActive = useRef({ left: false, right: false, up: false, down: false });

  // Game loop interval timer referential tracking
  const animationFrameId = useRef<number | null>(null);

  // --- GAME WORLD DATA ENTITIES & PHYSICS STATE ---
  const worldWidth = level.isBossLevel ? 1600 : 2500; // scrollable path width
  const playerRef = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    width: 32,
    height: 38,
    isGrounded: false,
    isClimbing: false,
    facingLeft: false,
    invincibilityFrames: 0,
    blinkState: false,
    shootCooldown: 0,
    runningAnimationFrame: 0,
  });

  const cameraX = useRef(0);
  const screenShake = useRef(0);

  // Game elements sets
  const platforms = useRef<any[]>([]);
  const vines = useRef<any[]>([]);
  const items = useRef<any[]>([]);
  const predators = useRef<any[]>([]);
  const projectiles = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const enemyProjectiles = useRef<any[]>([]);

  // BOSS STATE
  const bossRef = useRef({
    x: worldWidth - 250,
    y: 150,
    width: 90,
    height: 90,
    maxHp: level.id === 4 ? 12 : 18,
    hp: level.id === 4 ? 12 : 18,
    actionTimer: 0,
    state: 'idle', // idle, jump, slam, shoot
    vy: 0,
    isGrounded: false,
    blinkFrames: 0,
    facingLeft: true,
  });

  // Detect Touch / Mobile on mount
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  // --- INITIALIZE THE MAP BASED ON LEVEL ID ---
  const buildLevelWorld = () => {
    // Clear out everything
    platforms.current = [];
    vines.current = [];
    items.current = [];
    predators.current = [];
    projectiles.current = [];
    particles.current = [];
    enemyProjectiles.current = [];

    // Reset player position safely
    playerRef.current.x = 100;
    playerRef.current.y = 200;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.isClimbing = false;
    playerRef.current.isGrounded = false;
    playerRef.current.invincibilityFrames = 0;

    cameraX.current = 0;
    screenShake.current = 0;

    // Default ammo from upgrades: start with initial slot based on upgrades
    setCoconutAmmo(3 + upgrades.damageLevel);

    // Dynamic level themes customization
    const theme = level.backgroundTheme;

    // Define Level Floor (Tanah Dasar)
    // Floor spans entire length of world, with some pits (lubang jebakan)
    let groundSegments: { start: number; end: number }[] = [];

    if (level.isBossLevel) {
      // Flat surface for Boss Area, no bottom pits to make boss fight fair
      groundSegments.push({ start: 0, end: worldWidth });
    } else {
      // World standard path with some pits
      if (level.id === 1) {
        groundSegments.push({ start: 0, end: 900 });
        groundSegments.push({ start: 980, end: 1700 });
        groundSegments.push({ start: 1760, end: worldWidth });
      } else if (level.id === 2) {
        groundSegments.push({ start: 0, end: 600 });
        groundSegments.push({ start: 700, end: 1200 });
        groundSegments.push({ start: 1320, end: 1800 });
        groundSegments.push({ start: 1900, end: worldWidth });
      } else {
        // Lava or high spike pits
        groundSegments.push({ start: 0, end: 500 });
        groundSegments.push({ start: 620, end: 1050 });
        groundSegments.push({ start: 1200, end: 1650 });
        groundSegments.push({ start: 1780, end: worldWidth });
      }
    }

    // Insert Base Floor Solid Blocks
    groundSegments.forEach(seg => {
      platforms.current.push({
        x: seg.start,
        y: CANVAS_HEIGHT - 40,
        width: seg.end - seg.start,
        height: 60,
        type: theme === 'volcano' ? 'LAVA_STONE' : 'DIRT_GRASS',
        isLava: theme === 'volcano' ? true : false // Lava blocks damage Miko
      });
    });

    // --- PROCEDURAL-ASSISTED PLATFORM BLOCKS FOR VERTICALITY ---
    if (level.id === 1) { // Hutan Bambu Mula
      // Simple platform grids
      platforms.current.push({ x: 250, y: 280, width: 120, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 450, y: 200, width: 150, height: 16, type: 'WOOD_LOG' });
      platforms.current.push({ x: 700, y: 260, width: 130, height: 16, type: 'TEMPLE_BRICK' });
      
      // Vines
      vines.current.push({ x: 500, y: 50, width: 16, height: 260 });
      vines.current.push({ x: 1100, y: 50, width: 16, height: 300 });

      // Secondary row platforms
      platforms.current.push({ x: 1050, y: 250, width: 220, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1380, y: 180, width: 160, height: 16, type: 'WOOD_LOG' });
      platforms.current.push({ x: 1850, y: 270, width: 200, height: 16, type: 'TEMPLE_BRICK' });

      // Items scatter
      const bananaCoords = [
        120, 150, 180, 280, 310, 340, 500, 500, 500, 720, 750, 780, 1080, 1100, 1120, 1140, 1400, 1450, 
        1500, 1900, 1930, 1960, 2000, 2100, 2200
      ];
      bananaCoords.forEach(bx => {
        // Find platform elevation or ground
        let by = 350;
        if (bx >= 250 && bx <= 370) by = 240;
        if (bx >= 450 && bx <= 600) by = 160;
        if (bx >= 700 && bx <= 830) by = 220;
        if (bx >= 1050 && bx <= 1270) by = 210;
        if (bx >= 1380 && bx <= 1540) by = 140;

        items.current.push({ x: bx, y: by, size: 16, eaten: false, type: 'BANANA' });
      });

      // Special items: Power-ups
      items.current.push({ x: 500, y: 120, size: 18, eaten: false, type: 'CHILI' }); // Chili Rawit!
      items.current.push({ x: 1200, y: 210, size: 18, eaten: false, type: 'SHIELD' });
      items.current.push({ x: 1950, y: 230, size: 18, eaten: false, type: 'HEART' });

      // Predators
      predators.current.push({ x: 300, y: 240, type: 'SNAKE', vx: 1, minX: 250, maxX: 350, hp: 1, maxHp: 1 });
      predators.current.push({ x: 750, y: 350, type: 'SNAKE', vx: 1.2, minX: 700, maxX: 850, hp: 1, maxHp: 1 });
      predators.current.push({ x: 1150, y: 210, type: 'SNAKE', vx: 1.5, minX: 1060, maxX: 1250, hp: 1, maxHp: 1 });
      predators.current.push({ x: 1500, y: 350, type: 'BOAR', vx: 2, minX: 1400, maxX: 1700, hp: 2, maxHp: 2 });
      predators.current.push({ x: 1950, y: 350, type: 'BOAR', vx: 2, minX: 1850, maxX: 2100, hp: 2, maxHp: 2 });
    } 
    else if (level.id === 2) { // Rawa Buaya Penyengat
      platforms.current.push({ x: 200, y: 300, width: 100, height: 16, type: 'WOOD_LOG' });
      platforms.current.push({ x: 380, y: 220, width: 120, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 550, y: 140, width: 100, height: 16, type: 'WOOD_LOG' });
      platforms.current.push({ x: 750, y: 250, width: 150, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1020, y: 180, width: 180, height: 16, type: 'WOOD_LOG' });

      vines.current.push({ x: 440, y: 40, width: 16, height: 280 });
      vines.current.push({ x: 1100, y: 40, width: 16, height: 260 });
      vines.current.push({ x: 1550, y: 60, width: 16, height: 240 });

      platforms.current.push({ x: 1350, y: 280, width: 110, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1500, y: 190, width: 140, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1720, y: 260, width: 160, height: 16, type: 'WOOD_LOG' });
      platforms.current.push({ x: 2050, y: 200, width: 220, height: 16, type: 'TEMPLE_BRICK' });

      // Bananas and hearts
      for (let i = 0; i < 28; i++) {
        const bx = 150 + i * 80;
        let by = 350;
        if (bx >= 380 && bx <= 500) by = 180;
        if (bx >= 750 && bx <= 900) by = 210;
        if (bx >= 1020 && bx <= 1200) by = 140;
        if (bx >= 1500 && bx <= 1640) by = 150;
        if (bx >= 2050 && bx <= 2270) by = 160;

        items.current.push({ x: bx, y: by, size: 16, eaten: false, type: 'BANANA' });
      }

      items.current.push({ x: 440, y: 100, size: 18, eaten: false, type: 'MAGNET' });
      items.current.push({ x: 1100, y: 120, size: 18, eaten: false, type: 'CHILI' });
      items.current.push({ x: 1650, y: 350, size: 18, eaten: false, type: 'HEART' });
      items.current.push({ x: 800, y: 210, size: 20, eaten: false, type: 'GOLD_BANANA' }); // Golden banana values!

      // Eagle and Snakes
      predators.current.push({ x: 450, y: 350, type: 'BOAR', vx: 2, minX: 300, maxX: 600, hp: 2, maxHp: 2 });
      predators.current.push({ x: 800, y: 210, type: 'SNAKE', vx: 1.3, minX: 750, maxX: 900, hp: 1, maxHp: 1 });
      predators.current.push({ x: 1400, y: 240, type: 'SNAKE', vx: 1.2, minX: 1350, maxX: 1460, hp: 1, maxHp: 1 });

      // Flying Eagles
      predators.current.push({ x: 600, y: 100, type: 'EAGLE', vx: 2.2, minX: 450, maxX: 750, hp: 1, maxHp: 1, baseHeight: 100 });
      predators.current.push({ x: 1300, y: 80, type: 'EAGLE', vx: 2.5, minX: 1100, maxX: 1500, hp: 1, maxHp: 1, baseHeight: 80 });
      predators.current.push({ x: 1900, y: 90, type: 'EAGLE', vx: 2.0, minX: 1700, maxX: 2150, hp: 1, maxHp: 1, baseHeight: 90 });
    } 
    else if (level.id === 3) { // Kuil Kuno / Sarang Kobra
      // Obsidian bricks
      platforms.current.push({ x: 180, y: 280, width: 140, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 380, y: 200, width: 140, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 580, y: 280, width: 140, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 780, y: 190, width: 180, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1050, y: 270, width: 220, height: 16, type: 'TEMPLE_BRICK' });

      vines.current.push({ x: 450, y: 50, width: 16, height: 260 });
      vines.current.push({ x: 860, y: 50, width: 16, height: 280 });
      vines.current.push({ x: 1300, y: 60, width: 16, height: 240 });

      platforms.current.push({ x: 1360, y: 180, width: 150, height: 16, type: 'WOOD_LOG' });
      platforms.current.push({ x: 1580, y: 260, width: 180, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1850, y: 180, width: 250, height: 16, type: 'TEMPLE_BRICK' });

      // Snakes, boars and Cobras! Cobras fire poison spits vertically or horizontally
      predators.current.push({ x: 220, y: 240, type: 'COBRA', vx: 0, minX: 200, maxX: 240, hp: 2, maxHp: 2, fireCooldown: 80 });
      predators.current.push({ x: 620, y: 240, type: 'COBRA', vx: 0, minX: 600, maxX: 640, hp: 2, maxHp: 2, fireCooldown: 120 });
      predators.current.push({ x: 1100, y: 235, type: 'SNAKE', vx: 1.6, minX: 1060, maxX: 1260, hp: 1, maxHp: 1 });
      predators.current.push({ x: 1400, y: 350, type: 'BOAR', vx: 2.5, minX: 1200, maxX: 1600, hp: 2, maxHp: 2 });
      predators.current.push({ x: 1950, y: 140, type: 'COBRA', vx: 0, minX: 1900, maxX: 2000, hp: 2, maxHp: 2, fireCooldown: 90 });

      // Items
      for (let i = 0; i < 35; i++) {
        const bx = 120 + i * 65;
        let by = 350;
        if (bx >= 180 && bx <= 320) by = 240;
        if (bx >= 380 && bx <= 520) by = 160;
        if (bx >= 580 && bx <= 720) by = 240;
        if (bx >= 780 && bx <= 960) by = 150;
        if (bx >= 1850 && bx <= 2100) by = 140;

        items.current.push({ x: bx, y: by, size: 16, eaten: false, type: 'BANANA' });
      }

      items.current.push({ x: 450, y: 130, size: 18, eaten: false, type: 'CHILI' });
      items.current.push({ x: 860, y: 130, size: 18, eaten: false, type: 'SHIELD' });
      items.current.push({ x: 1580, y: 210, size: 18, eaten: false, type: 'MAGNET' });
      items.current.push({ x: 2000, y: 140, size: 20, eaten: false, type: 'GOLD_BANANA' });
      items.current.push({ x: 1000, y: 350, size: 18, eaten: false, type: 'HEART' });
    } 
    else if (level.id === 4) { // LEVEL 4: BOS RAJA GORILA HITAM
      // Arena has specific elevated platform rings for dodging slided stones!
      platforms.current.push({ x: 200, y: 280, width: 180, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 500, y: 220, width: 220, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 900, y: 270, width: 200, height: 16, type: 'TEMPLE_BRICK' });
      platforms.current.push({ x: 1250, y: 200, width: 150, height: 16, type: 'TEMPLE_BRICK' });

      // Vine ladders to reach the platforms
      vines.current.push({ x: 290, y: 80, width: 16, height: 280 });
      vines.current.push({ x: 610, y: 60, width: 16, height: 310 });
      vines.current.push({ x: 1000, y: 80, width: 16, height: 290 });

      // Bananas and rewards
      for (let i = 0; i < 20; i++) {
        items.current.push({ x: 150 + i * 70, y: 350, size: 16, eaten: false, type: 'BANANA' });
      }
      // Floating items for dodging help
      items.current.push({ x: 290, y: 180, size: 18, eaten: false, type: 'CHILI' });
      items.current.push({ x: 610, y: 120, size: 18, eaten: false, type: 'SHIELD' });
      items.current.push({ x: 1000, y: 180, size: 18, eaten: false, type: 'HEART' });

      // Mini snake predators to clear before boss gate
      predators.current.push({ x: 250, y: 240, type: 'SNAKE', vx: 1.2, minX: 200, maxX: 350, hp: 1, maxHp: 1 });
      predators.current.push({ x: 950, y: 230, type: 'SNAKE', vx: 1.5, minX: 900, maxX: 1050, hp: 1, maxHp: 1 });

      // Reset Boss Stats
      bossRef.current.x = worldWidth - 250;
      bossRef.current.y = 150;
      bossRef.current.vy = 0;
      bossRef.current.hp = bossRef.current.maxHp;
      bossRef.current.state = 'idle';
      bossRef.current.actionTimer = 0;
    } 
    else if (level.id === 5) { // LEVEL 5: BOS ULTIMATE NAGA KAWAH
      // Volcanic magma obsidian platforms, beware of Lava steps at floor!
      platforms.current.push({ x: 150, y: 270, width: 200, height: 16, type: 'LAVA_STONE', isLava: false });
      platforms.current.push({ x: 450, y: 190, width: 220, height: 16, type: 'LAVA_STONE', isLava: false });
      platforms.current.push({ x: 780, y: 260, width: 220, height: 16, type: 'LAVA_STONE', isLava: false });
      platforms.current.push({ x: 1100, y: 180, width: 250, height: 16, type: 'LAVA_STONE', isLava: false });

      vines.current.push({ x: 250, y: 80, width: 16, height: 280 });
      vines.current.push({ x: 560, y: 60, width: 16, height: 320 });
      vines.current.push({ x: 890, y: 80, width: 16, height: 290 });

      // Scattered safety items
      for (let i = 0; i < 22; i++) {
        items.current.push({ x: 100 + i * 65, y: 340, size: 16, eaten: false, type: 'BANANA' });
      }

      items.current.push({ x: 250, y: 160, size: 18, eaten: false, type: 'CHILI' });
      items.current.push({ x: 560, y: 100, size: 18, eaten: false, type: 'SHIELD' });
      items.current.push({ x: 890, y: 160, size: 20, eaten: false, type: 'GOLD_BANANA' });
      items.current.push({ x: 1200, y: 120, size: 18, eaten: false, type: 'HEART' });

      // Flying Eagle predator helper
      predators.current.push({ x: 400, y: 80, type: 'EAGLE', vx: 2, minX: 300, maxX: 650, hp: 1, maxHp: 1, baseHeight: 80 });

      // Reset Lava Dragon Boss specs
      bossRef.current.x = worldWidth - 280;
      bossRef.current.y = 100;
      bossRef.current.vy = 0;
      bossRef.current.maxHp = 18;
      bossRef.current.hp = 18;
      bossRef.current.state = 'idle';
      bossRef.current.actionTimer = 0;
    }

    // Portal (Tiang Bendera Akhir)
    // Only spawn complete goal portal in non-boss level, or when Boss is dead
    if (!level.isBossLevel) {
      platforms.current.push({
        x: worldWidth - 120,
        y: CANVAS_HEIGHT - 120,
        width: 14,
        height: 80,
        type: 'PORTAL_POLE'
      });
    }

    setLives(maxHealth);
    setScore(0);
    setLevelBananas(0);
    setTotalBananasCollectedInLevel(0);
    activePowerUpRef.current = null;
    setActivePowerUp(null);
  };

  // Run initial loading on setup or level change
  useEffect(() => {
    buildLevelWorld();
    setGameState('intro');
    setHighscoreSaved(false);

    // Set mute toggle according to current manager setting
    setIsMuted(sound.muted);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [level, upgrades]);

  // --- KEYBOARD LISTENER HANDLERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = true;
      keysPressed.current[e.key] = true; // Support raw key capitalization too

      // Map arrow keys safely to standard directional strings used in physical loop
      if (e.key === 'ArrowLeft' || e.key === 'Left') {
        keysPressed.current['left'] = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        keysPressed.current['right'] = true;
      }
      if (e.key === 'ArrowUp' || e.key === 'Up') {
        keysPressed.current['up'] = true;
      }
      if (e.key === 'ArrowDown' || e.key === 'Down') {
        keysPressed.current['down'] = true;
      }

      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Prevent window scrolling scrollbar wiggles
        e.preventDefault();
      }

      // Handle Instant Coconut Firing
      if (k === 'z' || k === 'j' || k === 'f') {
        fireCoconut();
      }

      if (e.key === 'p' || e.key === 'Escape') {
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.key] = false;

      if (e.key === 'ArrowLeft' || e.key === 'Left') {
        keysPressed.current['left'] = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        keysPressed.current['right'] = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'Up') {
        keysPressed.current['up'] = false;
      }
      if (e.key === 'ArrowDown' || e.key === 'Down') {
        keysPressed.current['down'] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const togglePause = () => {
    if (gameStateRef.current === 'playing') {
      sound.playHurt();
      setGameState('paused');
    } else if (gameStateRef.current === 'paused') {
      sound.playBanana();
      setGameState('playing');
    }
  };

  const startPlaying = () => {
    sound.playPowerUp();
    setGameState('playing');
  };

  const fireCoconut = () => {
    if (gameStateRef.current !== 'playing') return;
    const p = playerRef.current;

    // Firing requires Chili Fury OR having Ammo!
    const isChiliActive = activePowerUpRef.current?.type === 'COCONUT_SHOOTER';
    if (!isChiliActive && coconutAmmoRef.current <= 0) {
      sound.playHurt(); // warning buzz
      return;
    }

    // Cooldown check to prevent projectile spamming
    if (p.shootCooldown > 0) return;

    sound.playShoot();

    // Spawn Projectile
    const bulletSpeed = 7 + (upgrades.speedLevel * 0.5);
    const direction = p.facingLeft ? -1 : 1;
    projectiles.current.push({
      x: p.facingLeft ? p.x - 5 : p.x + p.width + 5,
      y: p.y + p.height / 2 - 4,
      vx: direction * bulletSpeed,
      vy: isChiliActive ? -1.5 : -0.5, // slight arc upwards
      radius: isChiliActive ? 8 : 6,
      type: isChiliActive ? 'FIRE_COCONUT' : 'COCONUT',
      damage: coconutDamage * (isChiliActive ? 2 : 1)
    });

    // Reduce Ammo if not in infinite Chili power
    if (!isChiliActive) {
      setCoconutAmmo(prev => Math.max(0, prev - 1));
    }

    // Set Cooldown
    p.shootCooldown = 15; // 15 frames delay
  };

  // --- GAME UPDATE & PHYSICS TICK LOOP ---
  const updatePhysics = () => {
    if (gameState !== 'playing') return;

    const p = playerRef.current;

    // Handle screen shake decay
    if (screenShake.current > 0) {
      screenShake.current -= 0.5;
    }

    // --- COOLDOWN TICKING ---
    if (p.shootCooldown > 0) p.shootCooldown--;
    if (p.invincibilityFrames > 0) {
      p.invincibilityFrames--;
      if (p.invincibilityFrames % 4 === 0) {
        p.blinkState = !p.blinkState;
      }
    } else {
      p.blinkState = false;
    }

    // Increment physics frame clock
    physicsFrameCounter.current++;

    // --- POWERUP TIMER DECAY TICKING ---
    if (activePowerUpRef.current) {
      activePowerUpRef.current.duration--;
      if (activePowerUpRef.current.duration <= 0) {
        activePowerUpRef.current = null;
        setActivePowerUp(null);
      } else if (physicsFrameCounter.current % 15 === 0) {
        // Throttled UI state updates to keep 60 FPS buttery smooth and lag-free!
        setActivePowerUp({ ...activePowerUpRef.current });
      }
    }

    // --- MOVE INPUT DETECT (Keyboard + On-screen buttons) ---
    let moveX = 0;
    let wantJump = false;
    let wantClimbUp = false;
    let wantClimbDown = false;

    // Keyboard checks
    if (keysPressed.current['left'] || keysPressed.current['a'] || touchJoystickActive.current.left) {
      moveX = -1;
      p.facingLeft = true;
    }
    if (keysPressed.current['right'] || keysPressed.current['d'] || touchJoystickActive.current.right) {
      moveX = 1;
      p.facingLeft = false;
    }

    if (keysPressed.current['up'] || keysPressed.current['w'] || keysPressed.current[' '] || touchJoystickActive.current.up) {
      wantJump = true;
      wantClimbUp = true;
    }

    if (keysPressed.current['down'] || keysPressed.current['s'] || touchJoystickActive.current.down) {
      wantClimbDown = true;
    }

    // --- CLIMBING LOGIC (VINES INTERSECTION) ---
    // Check if player intersects with any vine
    let isCollidingWithVine = false;
    let intersectingVine: any = null;

    vines.current.forEach(v => {
      if (
        p.x + p.width > v.x &&
        p.x < v.x + v.width &&
        p.y + p.height > v.y &&
        p.y < v.y + v.height
      ) {
        isCollidingWithVine = true;
        intersectingVine = v;
      }
    });

    if (isCollidingWithVine) {
      // Toggle climb mode if user moves vertically on a vine
      if (wantClimbUp || wantClimbDown) {
        p.isClimbing = true;
        p.vx = 0; // stop horizontal physics sliding
      }
    } else {
      p.isClimbing = false;
    }

    // Apply Climbing movement
    if (p.isClimbing) {
      p.vy = 0; // Nullify standard gravity index
      const climbSpeed = 3.5;

      if (wantClimbUp) {
        p.y -= climbSpeed;
      }
      if (wantClimbDown) {
        p.y += climbSpeed;
      }

      // Check boundary of vine vertical length safely
      if (intersectingVine) {
        if (p.y < intersectingVine.y - 10) p.y = intersectingVine.y - 10;
        if (p.y + p.height > intersectingVine.y + intersectingVine.height + 10) {
          p.isClimbing = false; // drop of vine bottom
        }
      }

      // Jump off vine
      if (wantJump && (keysPressed.current['a'] || keysPressed.current['d'] || touchJoystickActive.current.left || touchJoystickActive.current.right)) {
        p.isClimbing = false;
        p.vy = -7.5 * speedMultiplier;
        sound.playJump();
      }
    } else {
      // --- REGULAR HORIZONTAL & GRAVITY PHYSICS ---
      const baseSpeed = 4 * speedMultiplier;
      // If Chili power-up, Miko runs super fast (x1.75 velocity!)
      const currentRunSpeed = activePowerUpRef.current?.type === 'COCONUT_SHOOTER' ? baseSpeed * 1.5 : baseSpeed;

      p.vx = moveX * currentRunSpeed;

      // Gravity apply
      p.vy += 0.5; // gravity scale
      if (p.vy > 12) p.vy = 12; // Terminal velocity terminal speed
    }

    // Animation frames ticking
    if (moveX !== 0 && p.isGrounded) {
      p.runningAnimationFrame = (p.runningAnimationFrame + 1) % 16;
    } else {
      p.runningAnimationFrame = 0;
    }

    // JUMP TRIGGERS
    if (wantJump && p.isGrounded && !p.isClimbing) {
      // Regular jump vs Super jump banana
      const isSuperJumpActive = activePowerUpRef.current?.type === 'SUPER_JUMP';
      p.vy = (isSuperJumpActive ? -12 : -8.5) * speedMultiplier;
      p.isGrounded = false;
      sound.playJump();
      
      // Spawn jump dust particles
      spawnDustParticles(p.x + p.width/2, p.y + p.height, '#22c55e');
    }

    // Apply Movement vector positions
    p.x += p.vx;
    p.y += p.vy;

    // --- CHECK BOTTOM OUT OF SCREEN PIT LIMITS ---
    if (p.y > CANVAS_HEIGHT - 10) {
      handleHurt(2); // take heavy damage from falling into spikes/mud pits
      // Respawn player back on solid platform
      p.x = Math.max(100, p.x - 200);
      p.y = 100;
      p.vy = 0;
      p.vx = 0;
    }

    // Left screen bound block
    if (p.x < 10) p.x = 10;
    // Right boundary block
    if (p.x > worldWidth - p.width - 10) p.x = worldWidth - p.width - 10;

    // --- SOLID PLATFORMS COLLISIONS HITS ---
    p.isGrounded = false;

    if (!p.isClimbing) {
      platforms.current.forEach(plat => {
        // Horizontal overlap
        if (p.x + p.width > plat.x && p.x < plat.x + plat.width) {
          // Vertical check (falling through top)
          if (p.y + p.height >= plat.y && p.y + p.height - p.vy <= plat.y + 12) {
            // Check if lava surface hurts Miko
            if (plat.isLava) {
              if (activePowerUpRef.current?.type !== 'GOLDEN_SHIELD') {
                handleHurt(1);
                p.vy = -6; // bounce Miko back up in pain
              } else {
                // Grounded on lava safely because shield protects him!
                p.y = plat.y - p.height;
                p.vy = 0;
                p.isGrounded = true;
              }
            } else {
              p.y = plat.y - p.height;
              p.vy = 0;
              p.isGrounded = true;
            }
          }
        }
      });
    }

    // --- MAGNET FRUIT ATTRACTS BANANAS IN DISTANCE ---
    const isMagnetActive = activePowerUpRef.current?.type === 'MAGNET_FEVER';
    const activeRadius = magnetRadius + (isMagnetActive ? 150 : 0);

    if (activeRadius > 0) {
      items.current.forEach(item => {
        if (item.eaten || item.type !== 'BANANA') return;

        // Cartesian distance calculation
        const dx = (p.x + p.width/2) - item.x;
        const dy = (p.y + p.height/2) - item.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        if (distance <= activeRadius) {
          // Fly bananas towards Miko!
          const angle = Math.atan2(dy, dx);
          const pullVelocity = 6;
          item.x += Math.cos(angle) * -pullVelocity;
          item.y += Math.sin(angle) * -pullVelocity;
        }
      });
    }

    // --- COIN & ITEM EATING PICKUPS HITS ---
    items.current.forEach(item => {
      if (item.eaten) return;

      // Proximity bounding box check for grab
      if (
        p.x + p.width > item.x - 10 &&
        p.x < item.x + item.size + 10 &&
        p.y + p.height > item.y - 12 &&
        p.y < item.y + item.size + 12
      ) {
        item.eaten = true;

        if (item.type === 'BANANA') {
          sound.playBanana();
          setLevelBananas(prev => prev + 1);
          setTotalBananasCollectedInLevel(prev => prev + 1);
          setScore(prev => prev + 10);
          spawnDustParticles(item.x, item.y, '#fbbf24');
        } 
        else if (item.type === 'GOLD_BANANA') {
          sound.playPowerUp();
          setLevelBananas(prev => prev + 5);
          setTotalBananasCollectedInLevel(prev => prev + 5);
          setScore(prev => prev + 50);
          spawnDustParticles(item.x, item.y, '#f59e0b', 12);
          // Auto spark shield brief duration
          const pUp = { type: 'MAGNET_FEVER' as PowerUpType, duration: 180, maxDuration: 180 };
          activePowerUpRef.current = pUp;
          setActivePowerUp(pUp);
        }
        else if (item.type === 'CHILI') {
          sound.playPowerUp();
          const pUp = { type: 'COCONUT_SHOOTER' as PowerUpType, duration: 360, maxDuration: 360 };
          activePowerUpRef.current = pUp;
          setActivePowerUp(pUp);
          setScore(prev => prev + 25);
          spawnDustParticles(item.x, item.y, '#ef4444', 15);
        }
        else if (item.type === 'SHIELD') {
          sound.playPowerUp();
          const pUp = { type: 'GOLDEN_SHIELD' as PowerUpType, duration: 300, maxDuration: 300 };
          activePowerUpRef.current = pUp;
          setActivePowerUp(pUp);
          setScore(prev => prev + 25);
          spawnDustParticles(item.x, item.y, '#3b82f6', 15);
        }
        else if (item.type === 'MAGNET') {
          sound.playPowerUp();
          const pUp = { type: 'MAGNET_FEVER' as PowerUpType, duration: 400, maxDuration: 400 };
          activePowerUpRef.current = pUp;
          setActivePowerUp(pUp);
          setScore(prev => prev + 25);
          spawnDustParticles(item.x, item.y, '#60a5fa', 15);
        }
        else if (item.type === 'HEART') {
          sound.playPowerUp();
          setLives(prev => Math.min(maxHealth, prev + 1));
          spawnDustParticles(item.x, item.y, '#ec4899', 12);
        }
      }
    });

    // --- COCONUT PROJECTILES UPDATING & COLLISION CONSTRAINTS ---
    projectiles.current.forEach((proj, idx) => {
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.vy += 0.08; // slight drop arc over distance

      // Delete if out of horizontal view boundary
      if (proj.x < cameraX.current - 100 || proj.x > cameraX.current + CANVAS_WIDTH + 100) {
        projectiles.current.splice(idx, 1);
        return;
      }

      // Check collision with solid platforms (explode on contact)
      platforms.current.forEach(plat => {
        if (
          proj.x + proj.radius > plat.x &&
          proj.x - proj.radius < plat.x + plat.width &&
          proj.y + proj.radius > plat.y &&
          proj.y - proj.radius < plat.y + plat.height
        ) {
          spawnDustParticles(proj.x, proj.y, '#b45309', 5);
          projectiles.current.splice(idx, 1);
          return;
        }
      });

      // Check hits against crawling Predators!
      predators.current.forEach((pred, pIdx) => {
        if (pred.hp <= 0) return;

        if (
          proj.x + proj.radius > pred.x &&
          proj.x - proj.radius < pred.x + 36 &&
          proj.y + proj.radius > pred.y &&
          proj.y - proj.radius < pred.y + 36
        ) {
          // HIT!
          sound.playHitEnemy();
          pred.hp -= proj.damage;
          spawnDustParticles(proj.x, proj.y, '#ef4444', 8);

          // Remove bullet
          projectiles.current.splice(idx, 1);

          if (pred.hp <= 0) {
            // Defeated enemy reward points
            setScore(prev => prev + (pred.type === 'COBRA' ? 100 : 50));
            // Spawn sweet banana drop!
            items.current.push({ x: pred.x, y: pred.y, size: 16, eaten: false, type: 'BANANA' });
            spawnDustParticles(pred.x + 18, pred.y + 18, '#fbbf24', 15);
          }
        }
      });

      // Hit against BOSS (Levels 4 and 5)
      if (level.isBossLevel && bossRef.current.hp > 0 && gameState === 'playing') {
        const boss = bossRef.current;
        if (
          proj.x + proj.radius > boss.x &&
          proj.x - proj.radius < boss.x + boss.width &&
          proj.y + proj.radius > boss.y &&
          proj.y - proj.radius < boss.y + boss.height
        ) {
          // Hit boss!
          sound.playHitEnemy();
          boss.hp -= proj.damage;
          boss.blinkFrames = 15; // flashes red
          projectiles.current.splice(idx, 1);

          // Defeated boss!
          if (boss.hp <= 0) {
            handleVictory();
          }
        }
      }
    });

    // --- COBRA SHOOTING / INFLICTING ENEMY BULLETS TIMER ---
    enemyProjectiles.current.forEach((eb, ix) => {
      eb.x += eb.vx;
      eb.y += eb.vy;

      // Delete if out of canvas bounds
      if (eb.x < cameraX.current - 100 || eb.x > cameraX.current + CANVAS_WIDTH + 100) {
        enemyProjectiles.current.splice(ix, 1);
        return;
      }

      // Check hitting Miko
      if (
        eb.x + 5 > p.x &&
        eb.x - 5 < p.x + p.width &&
        eb.y + 5 > p.y &&
        eb.y - 5 < p.y + p.height
      ) {
        // hit!
        enemyProjectiles.current.splice(ix, 1);
        if (activePowerUpRef.current?.type !== 'GOLDEN_SHIELD') {
          handleHurt(1);
        } else {
          // shield sparkles bounce the poison
          spawnDustParticles(eb.x, eb.y, '#3b82f6', 8);
        }
      }
    });

    // --- PREDATORS ROAMING ARTIFICIAL BEHAVIORS ---
    predators.current.forEach(pred => {
      if (pred.hp <= 0) return;

      if (pred.type === 'COBRA') {
        // Shoots venom balls towards player if close
        pred.fireCooldown--;
        if (pred.fireCooldown <= 0) {
          pred.fireCooldown = 110 + Math.random() * 60;
          // Shoot toward Miko direction
          const targetIsLeft = p.x < pred.x;
          enemyProjectiles.current.push({
            x: targetIsLeft ? pred.x - 8 : pred.x + 40,
            y: pred.y + 10,
            vx: targetIsLeft ? -4 : 4,
            vy: -1,
            color: '#a855f7' // Purple poison splash ball
          });
        }
      } 
      else if (pred.type === 'EAGLE') {
        // Sinusoidal flight path
        pred.x += pred.vx;
        if (pred.x < pred.minX || pred.x > pred.maxX) {
          pred.vx *= -1;
        }

        // Float up and down
        pred.y = pred.baseHeight + Math.sin(pred.x * 0.03) * 20;

        // Eagle diving attack! If player passes beneath
        if (Math.abs(p.x - pred.x) < 150 && p.y > pred.y && Math.random() < 0.02) {
          pred.y += 4; // Dive!
        }
      } 
      else {
        // Regular Crawling Snake / Running Boar
        pred.x += pred.vx;

        // Turn around targets
        if (pred.x < pred.minX) {
          pred.x = pred.minX;
          pred.vx *= -1;
        }
        if (pred.x > pred.maxX) {
          pred.x = pred.maxX;
          pred.vx *= -1;
        }

        // Boar fast charge if player stands on same height level
        if (pred.type === 'BOAR') {
          const verticalOverlap = Math.abs((p.y + p.height/2) - (pred.y + 18)) < 40;
          const sameZone = p.x > pred.minX && p.x < pred.maxX;

          if (verticalOverlap && sameZone) {
            // Speed up boar
            const targetDirection = p.x < pred.x ? -3.5 : 3.5;
            pred.vx = targetDirection;
          } else {
            // restore standard crawling
            if (Math.abs(pred.vx) > 1.8) {
              pred.vx = pred.vx > 0 ? 1.5 : -1.5;
            }
          }
        }
      }

      // --- PREDATOR VS PLAYER COLLISION CHECKS ---
      if (
        p.x + p.width > pred.x + 2 &&
        p.x < pred.x + 34 &&
        p.y + p.height > pred.y + 2 &&
        p.y < pred.y + 34
      ) {
        // Invincibility Shield power up destroys predator instantly!
        if (activePowerUpRef.current?.type === 'GOLDEN_SHIELD') {
          sound.playHitEnemy();
          pred.hp = 0;
          setScore(prev => prev + 50);
          items.current.push({ x: pred.x, y: pred.y, size: 16, eaten: false, type: 'BANANA' });
          spawnDustParticles(pred.x + 18, pred.y + 18, '#3b82f6', 15);
        } else {
          // Miko gets hit
          // Can destroy snake/boar by jumping DIRECTLY on head (Super Mario style!)
          const fallingOnHead = p.vy > 1.2 && (p.y + p.height - p.vy < pred.y + 12);
          if (fallingOnHead && pred.type !== 'EAGLE' && pred.type !== 'COBRA') {
            sound.playHitEnemy();
            pred.hp--;
            p.vy = -6; // bounce jump height
            spawnDustParticles(pred.x + 18, pred.y, '#22c55e', 8);

            if (pred.hp <= 0) {
              setScore(prev => prev + 60);
              items.current.push({ x: pred.x, y: pred.y, size: 16, eaten: false, type: 'BANANA' });
            }
          } else {
            // Take normal bites damage
            handleHurt(1);
          }
        }
      }
    });

    // --- PARTICLES ENGINE COMPILER ---
    particles.current.forEach((part, index) => {
      part.x += part.vx;
      part.y += part.vy;
      part.alpha -= 0.02;
      part.size *= 0.96;

      if (part.alpha <= 0) {
        particles.current.splice(index, 1);
      }
    });

    // --- BOSS FIGHT ENEMY TIMED SCRIPTS (Level 4 and 5) ---
    if (level.isBossLevel && gameState === 'playing' && bossRef.current.hp > 0) {
      const boss = bossRef.current;
      boss.actionTimer++;

      // Flashes decay
      if (boss.blinkFrames > 0) boss.blinkFrames--;

      // Face toward player dynamically
      boss.facingLeft = p.x < boss.x;

      if (level.id === 4) { // LEVEL 4: RAJA GORILA ACTIONS
        // Jump and slam loop every 220 frames (~3.5 sec)
        if (boss.actionTimer % 220 === 0) {
          boss.state = 'jump';
          boss.vy = -12; // massive jump upwards
          sound.playBossRoar();
        }

        // Apply Boss gravity vertical mechanics
        if (boss.state === 'jump') {
          boss.vy += 0.4;
          boss.y += boss.vy;

          if (boss.y >= CANVAS_HEIGHT - boss.height - 40) {
            boss.y = CANVAS_HEIGHT - boss.height - 40;
            boss.vy = 0;
            boss.state = 'slam';
            boss.actionTimer = 0;

            // GROUND SLAM IMPACT! Shake screen wildly!
            screenShake.current = 14;
            sound.playHurt();

            // Spawn falling boulder hazards from the sky towards player area
            for (let i = 0; i < 3; i++) {
              const fallX = p.x + (Math.random() * 300 - 150);
              enemyProjectiles.current.push({
                x: Math.max(100, Math.min(worldWidth - 100, fallX)),
                y: -50,
                vx: 0,
                vy: 4 + Math.random() * 2,
                color: '#78716c', // heavy rock gray
                isRock: true,
                radius: 12
              });
            }

            // Return to idle state after slam puff
            setTimeout(() => { boss.state = 'idle'; }, 600);
          }
        }

        // Periodically throw massive horizontal boulder every 130 frames (~2.2 sec)
        if (boss.state === 'idle' && boss.actionTimer % 130 === 0) {
          sound.playShoot();
          const throwDir = boss.facingLeft ? -1 : 1;
          enemyProjectiles.current.push({
            x: boss.facingLeft ? boss.x - 20 : boss.x + boss.width + 20,
            y: boss.y + boss.height/2 + 10,
            vx: throwDir * 5,
            vy: -1,
            color: '#44403c',
            isRock: true,
            radius: 14
          });
        }
      } 
      else if (level.id === 5) { // LEVEL 5: ULTIMATE LAVA DRAGON
        // Dragon floats hovering along a large sine vertical wave
        boss.y = 80 + Math.sin(boss.actionTimer * 0.04) * 60;

        // Slowly pace left/right in boss arena boundaries
        const arenaLeft = worldWidth - 450;
        const arenaRight = worldWidth - 100;
        if (boss.state === 'idle') {
          boss.x -= 1.5;
          if (boss.x < arenaLeft) boss.state = 'move_right';
        } else if (boss.state === 'move_right') {
          boss.x += 1.5;
          if (boss.x > arenaRight) boss.state = 'idle';
        }

        // Spray fireball projectiles every 110 frames (~1.8 sec)
        if (boss.actionTimer % 110 === 0) {
          sound.playBossRoar();
          // Aim toward Miko Cartesian slope
          const dx = p.x - boss.x;
          const dy = p.y - boss.y;
          const angle = Math.atan2(dy, dx);

          // Spawn triple spread fire archs
          const fireSpeeds = [4.5, 5.5, 6.5];
          fireSpeeds.forEach(v => {
            enemyProjectiles.current.push({
              x: boss.x - 10,
              y: boss.y + boss.height/2,
              vx: Math.cos(angle) * v,
              vy: Math.sin(angle) * v,
              color: '#f97316', // bright magma orange fire
              isFire: true,
              radius: 9
            });
          });
        }

        // Erupt dangerous Magma Pillar from ground under player every 280 frames
        if (boss.actionTimer % 280 === 0) {
          sound.playHurt();
          const targetX = p.x;
          // Spawn temporary indicator light on floor, which erupts fire in 45 frames
          setTimeout(() => {
            // Shake screen
            screenShake.current = 8;
            // Spawn fire pillar damage particle stack
            for (let h = 0; h < 5; h++) {
              enemyProjectiles.current.push({
                x: targetX,
                y: (CANVAS_HEIGHT - 60) - h * 40,
                vx: 0,
                vy: 0,
                color: '#ef4444',
                isFire: true,
                radius: 16
              });
            }
          }, 800);
        }
      }

      // Check direct collision with Boss (causes instant hurt to Miko)
      if (
        p.x + p.width > boss.x + 10 &&
        p.x < boss.x + boss.width - 10 &&
        p.y + p.height > boss.y + 10 &&
        p.y < boss.y + boss.height - 10
      ) {
        if (activePowerUpRef.current?.type !== 'GOLDEN_SHIELD') {
          handleHurt(1);
          p.vx = p.facingLeft ? 7 : -7; // knock player back strong
        }
      }
    }

    // --- CHECK LEVEL COMPLETED GOAL (Portal / Goalpole in normal level) ---
    if (!level.isBossLevel) {
      const portalX = worldWidth - 120;
      if (p.x >= portalX - 20 && p.x <= portalX + 40) {
        // Did we eat enough bananas?
        if (levelBananas >= level.targetBananas) {
          handleVictory();
        }
      }
    }

    // --- CAMERA ENGINE SCROLL (Centered on player screen) ---
    const targetCameraX = p.x - CANVAS_WIDTH / 2;
    cameraX.current = Math.max(0, Math.min(worldWidth - CANVAS_WIDTH, targetCameraX));

    // Re-request loop frame ticker
    animationFrameId.current = requestAnimationFrame(updatePhysics);
  };

  const spawnDustParticles = (x: number, y: number, color: string, amount: number = 8) => {
    for (let i = 0; i < amount; i++) {
      particles.current.push({
        x: x,
        y: y,
        vx: (Math.random() * 4 - 2),
        vy: (Math.random() * -4 - 1),
        size: 3 + Math.random() * 5,
        alpha: 1.0,
        color: color
      });
    }
  };

  const handleHurt = (amount: number) => {
    const p = playerRef.current;
    if (p.invincibilityFrames > 0 || gameState !== 'playing') return;

    sound.playHurt();
    const newLives = Math.max(0, lives - amount);
    setLives(newLives);

    // Render screen blood red blink flash
    screenShake.current = 10;

    if (newLives <= 0) {
      setGameState('gameover');
      sound.playHurt();
    } else {
      // 90 frames of blinking damage protection
      p.invincibilityFrames = 90;
    }
  };

  const handleVictory = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    sound.playVictory();
    // Compute bonus scores based on quick completion & taking zero damage
    const victoryBonus = level.isBossLevel ? 1000 : 500;
    const finalScore = score + (lives * 150) + victoryBonus;
    setScore(finalScore);
    setGameState('victory');
  };

  const submitHighscore = () => {
    if (highscoreSaved) return;

    const newEntry: HighScoreEntry = {
      playerName: playerName || 'MikoLovers',
      score: score,
      bananasCollected: totalBananasCollectedInLevel,
      levelReached: level.name,
      date: new Date().toISOString()
    };

    onSaveHighscore(newEntry);
    setHighscoreSaved(true);
    sound.playPowerUp();
  };

  // Run or Pause loop ticker based on state changes
  useEffect(() => {
    if (gameState === 'playing') {
      animationFrameId.current = requestAnimationFrame(updatePhysics);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState]);

  // --- HTML CANVAS RENDERING ENGINE ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrame = 0;

    const renderLoop = () => {
      // Clear with sky blue / volcano space according to theme
      let bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      if (level.backgroundTheme === 'jungle') {
        bgGrad.addColorStop(0, '#064e3b'); // Dark deep green sky
        bgGrad.addColorStop(1, '#022c22');
      } else if (level.backgroundTheme === 'cave') {
        bgGrad.addColorStop(0, '#1e1b4b'); // Deep retro cave purple
        bgGrad.addColorStop(1, '#090514');
      } else if (level.backgroundTheme === 'temple') {
        bgGrad.addColorStop(0, '#1c1917'); // Dark slate stony vault
        bgGrad.addColorStop(1, '#44403c');
      } else { // Volcano
        bgGrad.addColorStop(0, '#450a0a'); // Hot crimson sky
        bgGrad.addColorStop(1, '#180000');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Apply screen shake camera translating
      ctx.save();
      const shakeAmt = screenShake.current;
      if (shakeAmt > 0) {
        const dx = (Math.random() * shakeAmt - shakeAmt/2);
        const dy = (Math.random() * shakeAmt - shakeAmt/2);
        ctx.translate(dx, dy);
      }

      // Draw background ambient details (e.g., giant distant sun or glowing volcano clouds)
      ctx.fillStyle = level.backgroundTheme === 'volcano' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.05)';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, 200, 180, 0, Math.PI * 2);
      ctx.fill();

      // --- SCROLL VIEWPONT TRANSLATION ---
      ctx.translate(-cameraX.current, 0);

      // --- DRAW VINES ---
      vines.current.forEach(v => {
        // Draw dark green ivy stalk with curly leaves
        ctx.fillStyle = '#065f46';
        ctx.fillRect(v.x, v.y, v.width, v.height);

        // Vine segment rings
        ctx.fillStyle = '#0f766e';
        for (let y = v.y; y < v.y + v.height; y += 24) {
          ctx.beginPath();
          ctx.arc(v.x + v.width/2, y, 6, 0, Math.PI * 2);
          ctx.fill();

          // curly leaf right
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.ellipse(v.x + v.width + 4, y + 4, 8, 4, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --- DRAW COIN & BULLET POWERUPS ITEMS ---
      items.current.forEach(item => {
        if (item.eaten) return;

        // Shiny float bounce effect offset
        const yOffset = Math.sin(localFrame * 0.05 + item.x * 0.1) * 4;

        if (item.type === 'BANANA') {
          // Glossy Golden crescent banana!
          ctx.fillStyle = '#eab308'; // rich gold yellow
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8 + yOffset, 8, 0.2, Math.PI - 0.2, false);
          ctx.arc(item.x + 8, item.y + 4 + yOffset, 6, Math.PI - 0.5, 0.5, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // banana tip
          ctx.fillStyle = '#3f2c00';
          ctx.fillRect(item.x + 10, item.y + yOffset, 2, 3);
        } 
        else if (item.type === 'GOLD_BANANA') {
          // Golden Crown / Mega item
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8 + yOffset, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('🍌', item.x + 3, item.y + 11 + yOffset);
        }
        else if (item.type === 'HEART') {
          ctx.fillStyle = '#ec4899'; // pink heart
          ctx.beginPath();
          const cx = item.x + 8;
          const cy = item.y + 8 + yOffset;
          ctx.moveTo(cx, cy + 4);
          ctx.bezierCurveTo(cx - 8, cy - 4, cx - 6, cy - 10, cx, cy - 4);
          ctx.bezierCurveTo(cx + 6, cy - 10, cx + 8, cy - 4, cx, cy + 4);
          ctx.fill();
        } 
        else if (item.type === 'CHILI') {
          // Flame Pepper
          ctx.fillStyle = '#ef4444'; // Red Spicy
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 10 + yOffset, 6, 0, Math.PI * 2);
          ctx.fill();
          // tail curve
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(item.x + 8, item.y + 4 + yOffset);
          ctx.quadraticCurveTo(item.x + 12, item.y - 2 + yOffset, item.x + 15, item.y + yOffset);
          ctx.stroke();
        }
        else if (item.type === 'SHIELD') {
          // Glowing orb
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(item.x + 8, item.y + 8 + yOffset, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
        else if (item.type === 'MAGNET') {
          // Magnet horseshoe vector
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(item.x + 4, item.y + yOffset, 8, 12);
          ctx.fillStyle = '#ef4444'; // red tip
          ctx.fillRect(item.x + 4, item.y + yOffset, 8, 4);
        }
      });

      // --- DRAW SOLID PLATFORMS GRIDS ---
      platforms.current.forEach(plat => {
        // Draw solid platform blocks
        let fillStyle = '#16a34a'; // grass top log
        let strokeStyle = '#15803d';

        if (plat.type === 'DIRT_GRASS') {
          fillStyle = '#0f766e';
          strokeStyle = '#115e59';
        } else if (plat.type === 'TEMPLE_BRICK') {
          fillStyle = '#475569';
          strokeStyle = '#334155';
        } else if (plat.type === 'LAVA_STONE') {
          fillStyle = '#1c1917';
          strokeStyle = '#44403c';
        } else if (plat.type === 'PORTAL_POLE') {
          fillStyle = '#3f3f46';
          strokeStyle = '#18181b';
        }

        ctx.fillStyle = fillStyle;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 3;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Extra details: Draw grass leaves on top of DIRT_GRASS blocks
        if (plat.type === 'DIRT_GRASS') {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(plat.x, plat.y, plat.width, 6);
        } else if (plat.type === 'LAVA_STONE') {
          // Glowing red fiery cracks in lava blocks
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(plat.x, plat.y, plat.width, 4);

          if (localFrame % 30 < 15) {
            ctx.fillStyle = '#df3500';
            for (let cx = plat.x + 20; cx < plat.x + plat.width; cx += 40) {
              ctx.fillRect(cx, plat.y + 4, 8, 3);
            }
          }
        } else if (plat.type === 'PORTAL_POLE') {
          // Draw a big golden crown flag on top of the goal portal pole!
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(plat.x + plat.width, plat.y);
          ctx.lineTo(plat.x + plat.width + 36, plat.y + 16);
          ctx.lineTo(plat.x + plat.width, plat.y + 32);
          ctx.fill();

          // Write minimal 'FINISH' lettering
          ctx.fillStyle = '#000';
          ctx.font = '9px monospace';
          ctx.fillText('GOAL', plat.x + plat.width + 4, plat.y + 19);
        }
      });

      // --- DRAW PLAYER PROJECTS (COCONUTS OR FIRES COCONUTS) ---
      projectiles.current.forEach(proj => {
        if (proj.type === 'FIRE_COCONUT') {
          // Fiery fireball
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ef4444';
          ctx.stroke();

          // Spiky sparks
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(proj.x - proj.radius - 2, proj.y - 1, 2, 2);
          ctx.fillRect(proj.x + proj.radius, proj.y - 1, 2, 2);
        } else {
          // Normal brown coconut
          ctx.fillStyle = '#78350f'; // Dark wood Cocoa
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
          ctx.fill();

          // Draw coconut cracks texture
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius - 2, 0.4, Math.PI - 0.4);
          ctx.stroke();
        }
      });

      // --- DRAW ENEMY DAMAGE PROJECTILES/ROCKS ---
      enemyProjectiles.current.forEach(eb => {
        ctx.fillStyle = eb.color || '#ef4444';
        ctx.beginPath();
        const r = eb.radius || 7;
        ctx.arc(eb.x, eb.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (eb.isRock) {
          // draw heavy cracked stone circles textures
          ctx.strokeStyle = '#292524';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#44403c';
          ctx.fillRect(eb.x - 3, eb.y - 3, 4, 4);
        } else if (eb.isFire) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(eb.x, eb.y, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --- DRAW ROAMING PREDATORS ---
      predators.current.forEach(pred => {
        if (pred.hp <= 0) return;

        // Slither / pace bounce offsets
        const animationWobble = Math.sin(localFrame * 0.15 + pred.x * 0.05) * 3;

        if (pred.type === 'SNAKE') {
          // Slithery green snake 🐍
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(pred.x, pred.y + 20 + animationWobble);
          ctx.quadraticCurveTo(pred.x + 10, pred.y + 10 - animationWobble, pred.x + 20, pred.y + 20 + animationWobble);
          ctx.quadraticCurveTo(pred.x + 30, pred.y + 10 - animationWobble, pred.x + 36, pred.y + 20 + animationWobble);
          ctx.stroke();

          // Snake red head
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(pred.vx > 0 ? pred.x + 34 : pred.x + 2, pred.y + 16, 6, 0, Math.PI * 2);
          ctx.fill();

          // snake red glowing eye
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pred.vx > 0 ? pred.x + 35 : pred.x + 1, pred.y + 14, 2, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (pred.type === 'BOAR') {
          // Tusky charging boar 🐗
          ctx.fillStyle = '#451a03'; // brown
          ctx.fillRect(pred.x + 2, pred.y + 8, 32, 22);

          // Head block
          ctx.fillStyle = '#291102';
          ctx.fillRect(pred.vx < 0 ? pred.x : pred.x + 24, pred.y + 8, 12, 14);

          // tusks
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(pred.vx < 0 ? pred.x - 3 : pred.x + 35, pred.y + 16, 4, 4);

          // legs
          ctx.fillStyle = '#1c0d02';
          const legSwing = Math.sin(localFrame * 0.2) * 4;
          ctx.fillRect(pred.x + 6, pred.y + 28, 4, 8 + legSwing);
          ctx.fillRect(pred.x + 24, pred.y + 28, 4, 8 - legSwing);

          // eyes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(pred.vx < 0 ? pred.x + 3 : pred.x + 30, pred.y + 10, 3, 3);
        }
        else if (pred.type === 'EAGLE') {
          // Flying Eagle 🦅
          ctx.fillStyle = '#78350f'; // Dark brown feathers
          // Body
          ctx.beginPath();
          ctx.ellipse(pred.x + 18, pred.y + 18, 16, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Wings flap
          const wingFlap = Math.sin(localFrame * 0.25) * 14;
          ctx.fillStyle = '#a16207';
          ctx.beginPath();
          ctx.moveTo(pred.x + 18, pred.y + 12);
          ctx.lineTo(pred.x + 6, pred.y - 2 + wingFlap);
          ctx.lineTo(pred.x + 12, pred.y + 14);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(pred.x + 18, pred.y + 12);
          ctx.lineTo(pred.x + 30, pred.y - 2 + wingFlap);
          ctx.lineTo(pred.x + 24, pred.y + 14);
          ctx.closePath();
          ctx.fill();

          // beak
          ctx.fillStyle = '#eab308';
          ctx.fillRect(pred.vx < 0 ? pred.x : pred.x + 32, pred.y + 14, 4, 4);
        }
        else if (pred.type === 'COBRA') {
          // Standing temple Cobra 🐍
          ctx.fillStyle = '#6b21a8'; // Dark Purple cobra
          ctx.fillRect(pred.x + 10, pred.y + 10, 16, 26);

          // cobra flaring hood
          ctx.fillStyle = '#581c87';
          ctx.beginPath();
          ctx.ellipse(pred.x + 18, pred.y + 18, 18, 10, Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();

          // flashing red eyes
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(pred.x + 14, pred.y + 12, 1.8, 0, Math.PI * 2);
          ctx.arc(pred.x + 22, pred.y + 12, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw small red health bar above predators if damaged
        if (pred.hp < pred.maxHp) {
          const pct = Math.max(0, pred.hp / pred.maxHp);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(pred.x + 4, pred.y - 8, 28, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(pred.x + 4, pred.y - 8, 28 * pct, 4);
        }
      });

      // --- DRAW THE BOSS FIGHT FIGHT ENEMY (Level 4 and 5) ---
      if (level.isBossLevel && bossRef.current.hp > 0) {
        const boss = bossRef.current;
        const bounceOffset = Math.sin(localFrame * 0.08) * 3;

        // Flash red on taking damage hit
        if (boss.blinkFrames > 0 && boss.blinkFrames % 2 === 0) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; // flash damage tint overlay
        } else {
          ctx.fillStyle = level.id === 4 ? '#27272a' : '#991b1b'; // Gorilla charcoal black vs Dragon crimson gold
        }

        if (level.id === 4) { // GORILLA BOSS GRAPHICS
          // Draw gorilla massive torso
          ctx.fillRect(boss.x, boss.y + bounceOffset, boss.width, boss.height - bounceOffset);

          // massive gorilla chest muscles plate
          ctx.fillStyle = '#52525b';
          ctx.fillRect(boss.x + 16, boss.y + 24 + bounceOffset, boss.width - 32, 40);

          // eyes glowing orange-red
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(boss.facingLeft ? boss.x + 18 : boss.x + 58, boss.y + 14 + bounceOffset, 12, 4);
          ctx.fillRect(boss.facingLeft ? boss.x + 38 : boss.x + 78, boss.y + 14 + bounceOffset, 12, 4);

          // white wild teeth teeth
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(boss.x + 30, boss.y + 70 + bounceOffset, 30, 4);

          // Golden Crown of King
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(boss.x + 24, boss.y + bounceOffset);
          ctx.lineTo(boss.x + boss.width/2, boss.y - 12 + bounceOffset);
          ctx.lineTo(boss.x + boss.width - 24, boss.y + bounceOffset);
          ctx.fill();
        } 
        else if (level.id === 5) { // FIRE DRAGON BOSS GRAPHICS
          // Dragon head & slithery tail
          ctx.beginPath();
          ctx.ellipse(boss.x + boss.width/2, boss.y + boss.height/2, boss.width * 0.4, boss.height * 0.35, Math.sin(localFrame*0.06)*0.2, 0, Math.PI * 2);
          ctx.fill();

          // Dragon horns
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(boss.x + 15, boss.y + 10);
          ctx.lineTo(boss.x - 10, boss.y - 15);
          ctx.lineTo(boss.x + 25, boss.y + 10);
          ctx.fill();

          // Glowing flaming eyes
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(boss.facingLeft ? boss.x + boss.width * 0.25 : boss.x + boss.width * 0.75, boss.y + boss.height * 0.35, 8, 0, Math.PI * 2);
          ctx.fill();

          // Dragon scales details
          ctx.fillStyle = '#f97316';
          ctx.fillRect(boss.x + boss.width * 0.3, boss.y + boss.height * 0.5, 12, 12);
        }

        // Draw Boss HP bar
        const hpPct = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boss.x - 10, boss.y - 20, boss.width + 20, 8);
        ctx.fillStyle = '#ef4444'; // Red
        ctx.fillRect(boss.x - 10, boss.y - 20, (boss.width + 20) * hpPct, 8);

        // Name text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(level.bossName || 'BOS', boss.x - 8, boss.y - 26);
      }

      // --- DRAW MASTER PLAYER (MIKO THE MONKEY 🐒) ---
      const p = playerRef.current;
      if (!p.blinkState) {
        ctx.save();

        // Translate to player center to support side tilt flips
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        if (p.facingLeft) {
          ctx.scale(-1, 1); // mirror horizontal direction
        }

        // --- DRAW TAIL (cute curly wiggle) ---
        const tailWiggle = Math.sin(localFrame * 0.15) * 8;
        ctx.strokeStyle = '#7c2d12'; // brown tail
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, 10);
        ctx.quadraticCurveTo(-18, 15 + tailWiggle, -22, 6 + tailWiggle);
        ctx.quadraticCurveTo(-26, -2, -18, -6);
        ctx.stroke();

        // --- MAIN TORSO BODY ---
        ctx.fillStyle = '#7c2d12'; // Rich brown body tone
        ctx.fillRect(-p.width/2, -p.height/2 + 8, p.width, p.height - 10);

        // --- FACE OR RANGE MOUTH AREA ---
        ctx.fillStyle = '#fed7aa'; // light peach skin
        ctx.fillRect(-p.width/2 + 6, -p.height/2 + 10, p.width - 12, p.height - 18);

        // --- EARS (brown + peach insert) ---
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.arc(-p.width/2, -p.height/2 + 12, 6, 0, Math.PI * 2);
        ctx.arc(p.width/2, -p.height/2 + 12, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(-p.width/2, -p.height/2 + 12, 3.5, 0, Math.PI * 2);
        ctx.arc(p.width/2, -p.height/2 + 12, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // --- EYEBALLS (with glossy looking blinking) ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -p.height/2 + 10, 5, 6);
        ctx.fillRect(2, -p.height/2 + 10, 5, 6);

        // black pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(-4, -p.height/2 + 12, 3, 3);
        ctx.fillRect(4, -p.height/2 + 12, 3, 3);

        // --- ANIMATED LEGS (Running walk cycle) ---
        ctx.fillStyle = '#451a03'; // deeper brown boots
        let leftLegY = p.height/2;
        let rightLegY = p.height/2;

        if (p.vx !== 0 && p.isGrounded) {
          leftLegY += Math.sin(localFrame * 0.28) * 4;
          rightLegY -= Math.sin(localFrame * 0.28) * 4;
        }

        ctx.fillRect(-p.width/2 + 3, p.height/2 - 6, 5, 6 + (leftLegY - p.height/2));
        ctx.fillRect(p.width/2 - 8, p.height/2 - 6, 5, 6 + (rightLegY - p.height/2));

        ctx.restore();

        // --- ACTIVE POWERUP AURA SPARKLE LIGHT EFFECTS ---
        if (activePowerUpRef.current) {
          if (activePowerUpRef.current.type === 'COCONUT_SHOOTER') { // Chili fire fury
            ctx.fillStyle = '#ef4444';
            // Draw burning fire elements around Miko
            for (let i = 0; i < 4; i++) {
              const fX = p.x + p.width/2 + (Math.sin(localFrame * 0.4 + i) * 20);
              const fY = p.y + p.height/2 + (Math.cos(localFrame * 0.4 + i) * 20) - 2;
              ctx.beginPath();
              ctx.arc(fX, fY, 3 + Math.random()*3, 0, Math.PI*2);
              ctx.fill();
            }
          }
          if (activePowerUpRef.current.type === 'GOLDEN_SHIELD') { // Invincible Star Armor
            ctx.fillStyle = '#eab308';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5;
            // Halo ring
            ctx.beginPath();
            ctx.arc(p.x + p.width/2, p.y + p.height/2, 26, 0, Math.PI*2);
            ctx.stroke();

            // orbiting sparkly crystals
            for (let i = 0; i < 3; i++) {
              const offsetAngle = (localFrame * 0.08) + (i * Math.PI * 2 / 3);
              const starX = p.x + p.width/2 + Math.cos(offsetAngle) * 26;
              const starY = p.y + p.height/2 + Math.sin(offsetAngle) * 26;

              ctx.beginPath();
              ctx.arc(starX, starY, 4, 0, Math.PI*2);
              ctx.fill();
            }
          }
        }
      }

      // --- DRAW PARTICLES ---
      particles.current.forEach(part => {
        ctx.save();
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Restore camera translating
      ctx.restore();

      // Tick Local animation clock
      localFrame++;

      if (gameState === 'playing') {
        renderFrameId.current = requestAnimationFrame(renderLoop);
      }
    };

    if (gameState === 'playing') {
      renderLoop();
    } else {
      // Just render static preview screen on pause/start
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    return () => {
      if (renderFrameId.current) {
        cancelAnimationFrame(renderFrameId.current);
      }
    };
  }, [gameState, level]);

  // --- MUTING ACTIONS ---
  const toggleMute = () => {
    sound.muted = !sound.muted;
    setIsMuted(sound.muted);
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950 font-sans flex flex-col justify-between overflow-hidden p-3 md:p-6 text-white select-none">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.05)_0%,rgba(0,0,0,0.3)_100%)] pointer-events-none z-0" />

      {/* Retro Arcade Scanlines Overlaid Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10" />

      {/* TOP HEADER STATUS COCKPIT */}
      <div className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-md shadow-lg gap-2">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { sound.playBanana(); onExitGame(); }}
            className="p-2 hover:bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-transparent hover:border-slate-800 transition-all flex items-center justify-center cursor-pointer active:scale-95"
            title="Keluar ke Menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">T- {level.id}</span>
              <h2 className="text-xs md:text-sm font-black text-white leading-none truncate max-w-[120px] md:max-w-none">{level.name}</h2>
            </div>
            <div className="text-[9px] text-gray-400 font-mono tracking-wider mt-0.5 uppercase flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-emerald-500" />
              <span>{level.backgroundTheme === 'volcano' ? 'Gunung Api' : 'Rimba Purba'}</span>
            </div>
          </div>
        </div>

        {/* HUD Stats Dashboard */}
        <div className="flex items-center space-x-3 font-mono">
          {/* Hearts Lifesaver */}
          <div className="flex items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 space-x-1">
            {[...Array(maxHealth)].map((_, i) => (
              <Heart 
                key={i} 
                className={`w-3.5 h-3.5 ${i < lives ? 'text-red-500 fill-red-500 animate-pulse' : 'text-slate-800 fill-slate-950'}`} 
              />
            ))}
          </div>

          {/* Banana Targets */}
          <div className="flex items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 space-x-1">
            <span className="text-xs animate-bounce" style={{ animationDuration: '3s' }}>🍌</span>
            <span className="text-xs font-black text-yellow-400">{levelBananas}</span>
            <span className="text-[10px] text-gray-500">/{level.targetBananas}</span>
          </div>

          {/* High Score Count */}
          <div className="flex items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 space-x-1">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-black text-white">{score}</span>
          </div>

          {/* Ammo Coconuts */}
          <div className="flex items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 space-x-1 text-xs text-amber-500" title="Tempurung Kelapa">
            <span>🥥</span>
            <span className="font-bold">{activePowerUp?.type === 'COCONUT_SHOOTER' ? '∞' : coconutAmmo}</span>
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex space-x-1.5">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-slate-800 text-gray-400 rounded-xl"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={togglePause}
            className="p-2 hover:bg-slate-800 text-gray-300 rounded-xl font-bold font-mono text-xs cursor-pointer border border-slate-800"
          >
            {gameState === 'playing' ? 'JEDA' : 'MAIN'}
          </button>
        </div>
      </div>

      {/* MASTER GRAPHICS CANVAS CONTAINER STAGE */}
      <div 
        ref={containerRef} 
        className="relative z-10 w-full max-w-5xl mx-auto flex-grow bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden my-3 md:my-5 flex items-center justify-center shadow-2xl"
      >
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-auto aspect-[16/9] object-contain block bg-slate-950"
        />

        {/* FULL POWER-UP TIMER BAR */}
        {activePowerUp && gameState === 'playing' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-1.5 flex items-center space-x-2.5 z-20">
            <span className="text-sm">
              {activePowerUp.type === 'COCONUT_SHOOTER' ? '🌶️ Cabai' : 
               activePowerUp.type === 'GOLDEN_SHIELD' ? '🛡️ Kebal' : 
               activePowerUp.type === 'SUPER_JUMP' ? '🦘 Lompat' : '🧲 Magnet'}
            </span>
            <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  activePowerUp.type === 'COCONUT_SHOOTER' ? 'bg-red-500' : 
                  activePowerUp.type === 'GOLDEN_SHIELD' ? 'bg-blue-400' : 'bg-yellow-400'
                }`}
                style={{ width: `${(activePowerUp.duration / activePowerUp.maxDuration) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-gray-400">{Math.ceil(activePowerUp.duration / 60)}s</span>
          </div>
        )}

        {/* OVERLAYS SCREEN GAME CONTROLS */}
        <AnimatePresence mode="wait">
          {/* 1. INTRO / START SCREEN OVERLAY */}
          {gameState === 'intro' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30"
            >
              <div className="max-w-md bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
                <span className="text-4xl animate-bounce select-none">🐒</span>
                <h2 className="text-xl font-black mt-2 text-white">Mulai Tahap: {level.name}</h2>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">{level.description}</p>

                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-[11px] font-medium leading-relaxed">
                  🎯 <strong>Misi Anda:</strong> Ambil minimal <strong>{level.targetBananas} Pisang kuning</strong> dan capai Tiang Bendera akhir! Hindari gigitan celeng liar dan ular ganas.
                </div>

                <button
                  onClick={startPlaying}
                  className="mt-5 w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-500 text-slate-950 rounded-xl font-bold transition-all active:scale-95 text-sm cursor-pointer border-b-2 border-amber-700"
                >
                  MULAI SEKARANG ▶
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. PAUSED OVERLAY */}
          {gameState === 'paused' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center z-35"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-sm shadow-xl relative">
                <h2 className="text-2xl font-black text-amber-400">Permainan Deda</h2>
                <p className="text-xs text-gray-400 mt-2">Miko sedang duduk santai di dahan pohon...</p>

                <div className="flex flex-col space-y-2 mt-5">
                  <button
                    onClick={togglePause}
                    className="py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer active:scale-95"
                  >
                    LANJUTKAN BERKELANA
                  </button>
                  <button
                    onClick={() => { buildLevelWorld(); setGameState('playing'); }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-705 text-white rounded-xl text-xs cursor-pointer"
                  >
                    MULA ULANG LEVEL
                  </button>
                  <button
                    onClick={() => { onExitGame(); }}
                    className="py-2 bg-slate-900 border border-slate-800 text-gray-400 hover:text-white rounded-xl text-xs cursor-not-allowed"
                  >
                    KEMBALI KE BASEMAP
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. GAMEOVER DIED OVERLAY */}
          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-4 z-40 text-center"
            >
              <div className="max-w-md bg-slate-900 border border-red-900/60 rounded-3xl p-6 md:p-8 shadow-2xl">
                <span className="text-5xl select-none">💀</span>
                <h1 className="text-3xl font-black text-red-500 leading-tight mt-2 font-sans">Miko Kehabisan Energi!</h1>
                <p className="text-xs text-gray-400 mt-2">Para predator liar mengalahkan pertahanan Miko. Tapi jangan kuatir! Peningkatan kekuatan di toko takkan pernah hilang!</p>

                {/* Score Summary */}
                <div className="my-5 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-around">
                  <div className="text-center">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">Hasil Skor</span>
                    <div className="text-xl font-black text-white font-mono">{score}</div>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">Pisang Diambil</span>
                    <div className="text-xl font-black text-yellow-400 font-mono">🍌 {totalBananasCollectedInLevel}</div>
                  </div>
                </div>

                {/* Form to Save Local Highscore */}
                {!highscoreSaved ? (
                  <div className="mb-6 bg-slate-950/50 p-4 border border-slate-800 rounded-xl">
                    <label className="text-xs text-gray-400 font-bold block mb-1.5 leading-none">Simpan Prestasi Anda (Nama Anda):</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={12}
                        className="flex-grow p-2.5 bg-slate-900 border border-slate-700 text-yellow-400 font-bold rounded-xl text-sm font-mono text-center outline-none focus:border-yellow-500"
                        placeholder="Nama Monyet"
                      />
                      <button 
                        onClick={submitHighscore}
                        className="px-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs active:scale-95 cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 text-xs text-emerald-400 font-bold font-mono py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    ✓ Rekor Anda Berhasil Disimpan di Papan Skor!
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => { buildLevelWorld(); setGameState('playing'); }}
                    className="py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Latih Miko Lagi</span>
                  </button>

                  <button
                    onClick={() => { onExitGame(); }}
                    className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-xl text-xs cursor-pointer"
                  >
                    Peta Level
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. VICTORY CONGRATULATION OVERLAY */}
          {gameState === 'victory' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 z-50 text-center"
            >
              <div className="max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative">
                {/* sparkling visual flare particles */}
                <span className="text-6xl animate-bounce leading-none inline-block select-none">👑🍌</span>
                <h1 className="text-3xl font-black text-yellow-400 mt-2 font-sans tracking-tight">KERAJAAN TERSENYUM!</h1>
                <p className="text-xs text-gray-400 leading-relaxed mt-2">Hebat! Miko menyelesaikan misi legendaris di level **{level.name}**. Semua target pisang diraih dan predator berhasil diatasi!</p>

                {/* Score calculation report sheet */}
                <div className="my-5 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bonus Nyawa Tersisa:</span>
                    <span className="text-emerald-400">+{lives * 150}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bonus Kelulusan:</span>
                    <span className="text-emerald-400">+{level.isBossLevel ? 1000 : 500}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5 mt-1 flex justify-between font-bold">
                    <span className="text-white">Skor Akhir Level:</span>
                    <span className="text-yellow-400 text-sm">{score}</span>
                  </div>
                </div>

                {/* Form to Save Local Highscore */}
                {!highscoreSaved ? (
                  <div className="mb-6 bg-slate-950/50 p-4 border border-slate-800 rounded-xl">
                    <label className="text-xs text-gray-400 font-bold block mb-1.5 leading-none">Simpan Prestasi Emas Anda (Nama Pemain):</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={12}
                        className="flex-grow p-2.5 bg-slate-900 border border-slate-700 text-yellow-500 font-bold rounded-xl text-sm font-mono text-center outline-none focus:border-yellow-500"
                        placeholder="Nama Monyet"
                      />
                      <button 
                        onClick={submitHighscore}
                        className="px-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs active:scale-95 cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 text-xs text-emerald-400 font-bold font-mono py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    ✓ Rekor Legendaris Anda Berhasil Terukir di Papan Skor!
                  </div>
                )}

                <button
                  onClick={() => { onWinLevel(level.id, score, totalBananasCollectedInLevel); }}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-500 via-emerald-500 to-yellow-600 hover:brightness-110 text-slate-950 font-sans font-black text-sm tracking-wide rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center space-x-2 cursor-pointer border-b-2 border-emerald-700"
                >
                  <span>LANJUT KE PETA PETUALANGAN</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE ONSCREEN JOYSTICK OVERLAYS - RENDERED ONLY FOR TOUCH DEVICES */}
      {isTouchDevice && gameState === 'playing' && (
        <div className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-2 gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/20 backdrop-blur-[2px]">
          {/* Left Side: Directional Joystick Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onTouchStart={() => { touchJoystickActive.current.left = true; }}
              onTouchEnd={() => { touchJoystickActive.current.left = false; }}
              className="w-14 h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-lg font-black font-mono flex items-center justify-center select-none active:bg-yellow-500 active:text-slate-950"
            >
              ◀
            </button>
            <div className="flex flex-col space-y-1">
              <button
                onTouchStart={() => { touchJoystickActive.current.up = true; }}
                onTouchEnd={() => { touchJoystickActive.current.up = false; }}
                className="w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-sm flex items-center justify-center select-none active:bg-yellow-500 active:text-slate-950"
              >
                ▲
              </button>
              <button
                onTouchStart={() => { touchJoystickActive.current.down = true; }}
                onTouchEnd={() => { touchJoystickActive.current.down = false; }}
                className="w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-sm flex items-center justify-center select-none active:bg-yellow-500 active:text-slate-950"
              >
                ▼
              </button>
            </div>
            <button
              onTouchStart={() => { touchJoystickActive.current.right = true; }}
              onTouchEnd={() => { touchJoystickActive.current.right = false; }}
              className="w-14 h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-lg font-black font-mono flex items-center justify-center select-none active:bg-yellow-500 active:text-slate-950"
            >
              ▶
            </button>
          </div>

          {/* Right Side: Action Trigger Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onTouchStart={fireCoconut}
              className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-500 text-white font-black text-xs rounded-full flex flex-col items-center justify-center tracking-tighter active:scale-95"
            >
              <span className="text-base">🥥</span>
              <span>TEMBAK</span>
            </button>
            <button
              onTouchStart={() => { touchJoystickActive.current.up = true; }}
              onTouchEnd={() => { touchJoystickActive.current.up = false; }}
              className="w-16 h-16 bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 border-2 border-yellow-400 text-slate-950 font-black text-xs rounded-full flex flex-col items-center justify-center tracking-tighter active:scale-95"
            >
              <span className="text-emerald-950 text-base">🦘</span>
              <span>LOMPAT</span>
            </button>
          </div>
        </div>
      )}

      {/* FOOTER TIPS */}
      <div className="relative z-10 text-[10px] text-gray-500 text-center font-mono max-w-5xl mx-auto flex justify-between items-center w-full px-2 mt-1">
        <span>Kontrol Keyboard: Arrow / WASD + Space untuk gerak. Z / J / F untuk melempar kelapa. P untuk jeda.</span>
        <span>Petualangan Miko • 2026.</span>
      </div>
    </div>
  );
}
