import { GameConfig, ThemeConfig, ThemeType } from './types';

export const CONFIG: GameConfig = {
  mapWidth: 3000,
  mapHeight: 3000,
  roundTime: 90,
  botCount: 7,
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

// Growth factors
export const INITIAL_HOLE_RADIUS = 30;
export const MAX_HOLE_RADIUS = 400;
export const GROWTH_FACTOR = 30; // Much higher so size increases are visible
export const EATING_BUFFER = 2; // Radius difference required to eat another hole (prevents same-size kills)
export const SWALLOW_SPEED = 5; // Speed at which objects are sucked in

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

// Ordered tiers for progression tracking (Using CITY radii as standard)
export const TIER_THRESHOLDS = [
  { threshold: THEMES.CITY.defs.SMALL.radius, label: 'TIER 1' },
  { threshold: THEMES.CITY.defs.MEDIUM.radius, label: 'TIER 2' },
  { threshold: THEMES.CITY.defs.LARGE.radius, label: 'TIER 3' },
  { threshold: THEMES.CITY.defs.HUGE.radius, label: 'TIER 4' },
  { threshold: MAX_HOLE_RADIUS, label: 'MAX LEVEL' }
];