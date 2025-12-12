import { GameConfig, ThemeConfig, ThemeType } from './types';

export const CONFIG: GameConfig = {
  mapWidth: 6000,
  mapHeight: 6000,
  roundTime: 150,
  botCount: 15,
};

export const COLORS = {
  background: '#2d2d2d',
  grid: '#3d3d3d',
  player: '#000000', // The void is black
  playerOutline: '#00ff00',
  botOutline: '#ff0055',
  uiText: '#ffffff',
  uiAccent: '#facc15',
};

// Physics
export const EATING_BUFFER = 2; // Radius difference required to eat another hole
export const SWALLOW_SPEED = 5; // Speed at which objects are sucked in
export const MAX_HOLE_RADIUS = 500;

// Tier System for Step Growth
export interface TierDef {
    name: string;
    minXp: number;
    radius: number;
}

export const TIER_SYSTEM: TierDef[] = [
  { name: 'MICRO VOID', minXp: 0, radius: 30 },
  { name: 'TRASH PANDA', minXp: 150, radius: 55 },
  { name: 'STREET SHARK', minXp: 500, radius: 85 },
  { name: 'BLOCK BUSTER', minXp: 1500, radius: 140 },
  { name: 'CITY SLICKER', minXp: 4000, radius: 220 },
  { name: 'EARTH EATER', minXp: 10000, radius: 350 },
  { name: 'GALACTIC GULP', minXp: 25000, radius: 500 },
];

// Theme Definitions
export const THEMES: Record<ThemeType, ThemeConfig> = {
  CITY: {
    name: 'NEON CITY',
    background: '#1e1e24',
    grid: '#3d3d3d',
    defs: {
      SMALL: { radius: 10, score: 5, color: '#fca5a5', prob: 0.4, label: 'CONES' },
      MEDIUM: { radius: 25, score: 15, color: '#60a5fa', prob: 0.3, label: 'CARS' },
      LARGE: { radius: 60, score: 50, color: '#a78bfa', prob: 0.2, label: 'HOUSES' },
      HUGE: { radius: 120, score: 150, color: '#34d399', prob: 0.1, label: 'TOWERS' },
    }
  },
  CANDY: {
    name: 'SUGAR RUSH',
    background: '#fff1f2', // Pink tint
    grid: '#fda4af',
    defs: {
      SMALL: { radius: 10, score: 5, color: '#f43f5e', prob: 0.4, label: 'LOLLIPOP' },
      MEDIUM: { radius: 25, score: 15, color: '#d946ef', prob: 0.3, label: 'DONUT' },
      LARGE: { radius: 60, score: 50, color: '#f59e0b', prob: 0.2, label: 'GINGERBREAD' },
      HUGE: { radius: 120, score: 150, color: '#ec4899', prob: 0.1, label: 'CAKE CASTLE' },
    }
  },
  CYBER: {
    name: 'CYBERSPACE',
    background: '#020617', // Deep slate
    grid: '#1e293b',
    defs: {
      SMALL: { radius: 10, score: 5, color: '#22c55e', prob: 0.4, label: 'BIT' },
      MEDIUM: { radius: 25, score: 15, color: '#ef4444', prob: 0.3, label: 'BUG' },
      LARGE: { radius: 60, score: 50, color: '#3b82f6', prob: 0.2, label: 'SERVER' },
      HUGE: { radius: 120, score: 150, color: '#8b5cf6', prob: 0.1, label: 'MAINFRAME' },
    }
  }
};