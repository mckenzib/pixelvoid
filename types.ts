export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  BOT = 'BOT',
  OBSTACLE_SMALL = 'OBSTACLE_SMALL', // Cones, hydrants
  OBSTACLE_MEDIUM = 'OBSTACLE_MEDIUM', // Cars, trees
  OBSTACLE_LARGE = 'OBSTACLE_LARGE', // Houses
  OBSTACLE_HUGE = 'OBSTACLE_HUGE' // Skyscrapers
}

export type ThemeType = 'CITY' | 'CANDY' | 'CYBER';

export interface EntityDef {
  radius: number;
  score: number;
  color: string;
  prob: number;
  label: string;
}

export interface ThemeConfig {
  name: string;
  background: string;
  grid: string;
  defs: {
    SMALL: EntityDef;
    MEDIUM: EntityDef;
    LARGE: EntityDef;
    HUGE: EntityDef;
  }
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  velocity: Vector2;
  radius: number; // For collision
  xp: number; // For tier progression
  color: string;
  targetPos?: Vector2; // For bots
  scoreValue: number;
  isDead: boolean;
  scale: number; // For eating animation
  label?: string; // For player/bot names
  
  // Animation states
  isDying?: boolean;
  consumedBy?: Entity; // Reference to the predator
}

export interface PlayerStats {
  score: number;
  kills: number;
  maxSize: number;
  rank: number;
}

export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  roundTime: number; // Seconds
  botCount: number;
}