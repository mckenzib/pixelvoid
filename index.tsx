import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameState, Entity, EntityType, PlayerStats, ThemeType } from './types';
import { CONFIG, COLORS, TIER_THRESHOLDS, MAX_HOLE_RADIUS, THEMES } from './constants';
import { createMapEntities, createBots, updateEntityPosition, updateBotAI, checkCollisions } from './services/gameLogic';
import { generateGameCommentary } from './services/geminiService';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (Mutable for game loop performance)
  const gameStateRef = useRef<GameState>(GameState.MENU);
  const playerRef = useRef<Entity | null>(null);
  const botsRef = useRef<Entity[]>([]);
  const obstaclesRef = useRef<Entity[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const timeRef = useRef(CONFIG.roundTime);
  const scoreRef = useRef(0);
  const killsRef = useRef(0);
  
  // React State for UI
  const [uiState, setUiState] = useState<GameState>(GameState.MENU);
  const [timeLeft, setTimeLeft] = useState(CONFIG.roundTime);
  const [score, setScore] = useState(0);
  const [finalStats, setFinalStats] = useState<PlayerStats | null>(null);
  const [commentary, setCommentary] = useState<string>('');
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  
  // Level State
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('CITY');

  // Pattern Ref
  const patternRef = useRef<CanvasPattern | null>(null);

  const initGame = () => {
    const theme = THEMES[selectedTheme];
    
    // Create Pattern for the selected theme
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (selectedTheme === 'CITY') patternRef.current = createCityPattern();
        else if (selectedTheme === 'CANDY') patternRef.current = createCandyPattern();
        else if (selectedTheme === 'CYBER') patternRef.current = createCyberPattern();
      }
    }

    const player: Entity = {
      id: 'player',
      type: EntityType.PLAYER,
      pos: { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 },
      velocity: { x: 0, y: 0 },
      radius: 30,
      color: COLORS.player,
      scoreValue: 0,
      isDead: false,
      scale: 1,
      label: 'YOU'
    };
    
    playerRef.current = player;
    botsRef.current = createBots(CONFIG.botCount);
    // Pass theme for entity generation
    obstaclesRef.current = createMapEntities(250, theme); 
    timeRef.current = CONFIG.roundTime;
    scoreRef.current = 0;
    killsRef.current = 0;
    
    mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    gameStateRef.current = GameState.PLAYING;
    setUiState(GameState.PLAYING);
    setCommentary('');
  };

  const handleGameOver = async (won: boolean) => {
    gameStateRef.current = GameState.GAME_OVER;
    setUiState(GameState.GAME_OVER);
    
    const allPlayers = [playerRef.current!, ...botsRef.current];
    allPlayers.sort((a, b) => b.radius - a.radius); 
    const rank = allPlayers.findIndex(p => p.id === 'player') + 1;

    const stats = {
      score: scoreRef.current,
      kills: killsRef.current,
      maxSize: Math.floor(playerRef.current?.radius || 0),
      rank: playerRef.current?.isDead ? 99 : rank
    };
    
    setFinalStats(stats);
    setLoadingCommentary(true);
    
    const comment = await generateGameCommentary(stats, rank === 1 && !playerRef.current?.isDead);
    setCommentary(comment);
    setLoadingCommentary(false);
  };

  useEffect(() => {
    // Initial pattern
    patternRef.current = createCityPattern();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1); 
      lastTime = now;

      if (gameStateRef.current === GameState.PLAYING && playerRef.current) {
        // Logic (Timer, Physics, AI, Collision) same as before...
        timeRef.current -= dt;
        if (timeRef.current <= 0) {
          timeRef.current = 0;
          handleGameOver(true);
        }
        if (Math.floor(timeRef.current) !== Math.floor(timeLeft)) {
          setTimeLeft(Math.floor(timeRef.current));
        }

        if (!playerRef.current.isDead && !playerRef.current.isDying) {
          const speed = 250;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const dx = mouseRef.current.x - centerX;
          const dy = mouseRef.current.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 10) { 
            playerRef.current.velocity.x = (dx / dist) * speed;
            playerRef.current.velocity.y = (dy / dist) * speed;
          } else {
            playerRef.current.velocity.x = 0;
            playerRef.current.velocity.y = 0;
          }
          updateEntityPosition(playerRef.current, dt);
        } else if (playerRef.current.isDying) {
           updateEntityPosition(playerRef.current, dt);
        }

        botsRef.current.forEach(bot => {
          updateBotAI(bot, obstaclesRef.current.concat(botsRef.current), playerRef.current!);
          updateEntityPosition(bot, dt);
        });

        obstaclesRef.current.forEach(obs => {
            if (obs.isDying) {
                updateEntityPosition(obs, dt);
            }
        });

        checkCollisions(playerRef.current, botsRef.current, obstaclesRef.current, (predator, prey) => {
          if (predator.id === 'player') {
            scoreRef.current += prey.scoreValue;
            setScore(scoreRef.current);
            if (prey.type === EntityType.BOT) killsRef.current++;
          }
        });

        if (playerRef.current.isDead) {
            handleGameOver(false);
        }

        if (playerRef.current) {
          cameraRef.current.x = playerRef.current.pos.x - canvas.width / 2;
          cameraRef.current.y = playerRef.current.pos.y - canvas.height / 2;
        }
      }

      // --- RENDERING ---
      
      const activeTheme = THEMES[selectedTheme];

      if (patternRef.current) {
        ctx.fillStyle = patternRef.current;
        ctx.save();
        ctx.translate(-cameraRef.current.x, -cameraRef.current.y);
        ctx.fillRect(cameraRef.current.x, cameraRef.current.y, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.fillStyle = activeTheme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);
      
      // Map Borders
      ctx.strokeStyle = selectedTheme === 'CYBER' ? '#00ff00' : (selectedTheme === 'CANDY' ? '#ff69b4' : '#ff0000');
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, CONFIG.mapWidth, CONFIG.mapHeight);

      // Draw Grid
      ctx.strokeStyle = activeTheme.grid;
      ctx.lineWidth = 1;
      const gridSize = 100;
      const startX = Math.floor(cameraRef.current.x / gridSize) * gridSize;
      const startY = Math.floor(cameraRef.current.y / gridSize) * gridSize;
      
      for (let x = startX; x < cameraRef.current.x + canvas.width + gridSize; x += gridSize) {
        if (x < 0 || x > CONFIG.mapWidth) continue;
        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, cameraRef.current.y));
        ctx.lineTo(x, Math.min(CONFIG.mapHeight, cameraRef.current.y + canvas.height));
        ctx.stroke();
      }
      for (let y = startY; y < cameraRef.current.y + canvas.height + gridSize; y += gridSize) {
        if (y < 0 || y > CONFIG.mapHeight) continue;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, cameraRef.current.x), y);
        ctx.lineTo(Math.min(CONFIG.mapWidth, cameraRef.current.x + canvas.width), y);
        ctx.stroke();
      }

      // Draw Obstacles
      obstaclesRef.current.forEach(obs => {
        if (obs.isDead) return;
        drawPixelEntity(ctx, obs, selectedTheme);
      });

      // Draw Bots
      botsRef.current.forEach(bot => {
        if (bot.isDead && !bot.isDying) return; 
        if (bot.isDying) drawHole(ctx, bot, COLORS.botOutline, now); 
      });

      botsRef.current.forEach(bot => {
        if (bot.isDead || bot.isDying) return;
        drawHole(ctx, bot, COLORS.botOutline, now);
      });

      if (playerRef.current) {
        if (!playerRef.current.isDead) {
             drawHole(ctx, playerRef.current, COLORS.playerOutline, now);
        }
      }
      
      ctx.restore();

      // --- UI OVERLAYS ---
      if (gameStateRef.current === GameState.PLAYING && playerRef.current && !playerRef.current.isDead && !playerRef.current.isDying) {
         drawInputIndicator(ctx, canvas.width/2, canvas.height/2, mouseRef.current);
         drawHUD(ctx, playerRef.current.radius, canvas.width, canvas.height);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedTheme]); // Re-bind if theme changes

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); 
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
     e.preventDefault();
     if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  return (
    <div 
      className="w-full h-screen overflow-hidden relative touch-none select-none" 
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }} 
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* UI LAYERS */}
      
      {uiState === GameState.MENU && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center w-full max-w-2xl px-4">
            <h1 className="text-4xl md:text-6xl text-green-400 mb-8 tracking-widest" style={{ textShadow: '4px 4px #ff00ff' }}>PIXEL.VOID</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(Object.keys(THEMES) as ThemeType[]).map((theme) => (
                <button
                  key={theme}
                  onClick={(e) => { e.stopPropagation(); setSelectedTheme(theme); }}
                  onTouchEnd={(e) => { e.stopPropagation(); setSelectedTheme(theme); }}
                  className={`p-4 border-2 font-bold transition-all transform hover:scale-105 active:scale-95 ${
                    selectedTheme === theme 
                      ? 'bg-purple-600 border-purple-300 text-white scale-110 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="text-sm mb-1 opacity-70">LEVEL</div>
                  <div className="text-lg">{THEMES[theme].name}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                initGame();
              }}
              onTouchEnd={(e) => {
                 e.stopPropagation();
                 initGame();
              }}
              className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 border-b-4 border-green-800 active:border-green-600 active:transform active:translate-y-1 transition-all text-xl animate-bounce"
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {uiState === GameState.PLAYING && (
        <div className="absolute inset-0 pointer-events-none p-4">
          <div className="flex justify-between items-start">
            <div className="bg-black/50 p-4 border-2 border-white/20 backdrop-blur-sm">
              <p className="text-yellow-400 text-xl font-bold" style={{textShadow: '2px 2px #000'}}>SCORE: {score}</p>
              <p className="text-red-400 text-sm mt-1">KILLS: {killsRef.current}</p>
            </div>
            <div className={`bg-black/50 p-4 border-2 backdrop-blur-sm ${timeLeft < 10 ? 'border-red-500 animate-pulse' : 'border-white/20'}`}>
              <p className="text-white text-3xl font-bold" style={{textShadow: '2px 2px #000'}}>{timeLeft}</p>
            </div>
          </div>
        </div>
      )}

      {uiState === GameState.GAME_OVER && finalStats && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="bg-gray-800 p-8 border-4 border-green-500 max-w-lg w-full text-center shadow-[0_0_20px_rgba(74,222,128,0.5)]">
            <h2 className="text-4xl text-white mb-6">ROUND OVER</h2>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6 font-mono text-sm">
              <div className="text-gray-400">FINAL RANK</div>
              <div className="text-yellow-400 text-right text-xl">#{finalStats.rank}</div>
              
              <div className="text-gray-400">SCORE</div>
              <div className="text-white text-right">{finalStats.score} pts</div>
              
              <div className="text-gray-400">MASS CONSUMED</div>
              <div className="text-white text-right">{finalStats.maxSize} kg</div>
            </div>

            <div className="bg-black p-4 mb-6 border border-gray-600 min-h-[80px] flex items-center justify-center">
              {loadingCommentary ? (
                <span className="animate-pulse text-green-500">AWAITING SYSTEM JUDGEMENT...</span>
              ) : (
                <p className="text-green-400 leading-relaxed text-sm">"{commentary}"</p>
              )}
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                initGame();
              }}
              onTouchEnd={(e) => {
                 e.stopPropagation();
                 initGame();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 border-b-4 border-blue-800 active:border-blue-600 text-lg"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- PATTERN GENERATORS ---

const createCityPattern = () => {
  const size = 128;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = size;
  pCanvas.height = size;
  const ctx = pCanvas.getContext('2d');
  if(!ctx) return null;

  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0,0,size,size);

  for(let i=0; i<40; i++) {
     ctx.fillStyle = Math.random() > 0.5 ? '#252530' : '#15151a';
     const w = Math.random() * 4 + 2;
     const h = Math.random() * 4 + 2;
     ctx.fillRect(Math.random()*size, Math.random()*size, w, h);
  }

  ctx.strokeStyle = '#2a2a35';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size/2);
  ctx.lineTo(size, size/2);
  ctx.stroke();
  
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  ctx.strokeRect(0,0,size,size);
  
  return ctx.createPattern(pCanvas, 'repeat');
}

const createCandyPattern = () => {
  const size = 64;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = size;
  pCanvas.height = size;
  const ctx = pCanvas.getContext('2d');
  if(!ctx) return null;

  ctx.fillStyle = '#fff1f2';
  ctx.fillRect(0,0,size,size);
  
  // Checkerboard
  ctx.fillStyle = '#fce7f3'; // Slightly darker pink
  ctx.fillRect(0,0,size/2,size/2);
  ctx.fillRect(size/2,size/2,size/2,size/2);

  return ctx.createPattern(pCanvas, 'repeat');
}

const createCyberPattern = () => {
  const size = 64;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = size;
  pCanvas.height = size;
  const ctx = pCanvas.getContext('2d');
  if(!ctx) return null;

  ctx.fillStyle = '#020617';
  ctx.fillRect(0,0,size,size);

  // Digital Rain style dots
  ctx.fillStyle = '#172554';
  ctx.fillRect(10, 10, 4, 4);
  ctx.fillRect(40, 50, 4, 4);
  
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(0,0,size,size);

  return ctx.createPattern(pCanvas, 'repeat');
}

// --- RENDERING HELPERS ---

const drawPixelEntity = (ctx: CanvasRenderingContext2D, entity: Entity, theme: ThemeType) => {
  const pixelSize = 4;
  const s = entity.radius * entity.scale; 
  if (s <= 1) return;

  ctx.fillStyle = entity.color;
  
  // --- CITY THEME ---
  if (theme === 'CITY') {
    if (entity.type === EntityType.OBSTACLE_SMALL) {
      // Cone
      ctx.fillRect(entity.pos.x - s/2, entity.pos.y, s, s);
      ctx.fillRect(entity.pos.x - s/4, entity.pos.y - s/2, s/2, s/2);
    } else if (entity.type === EntityType.OBSTACLE_MEDIUM) {
      // Car
      ctx.fillStyle = entity.color;
      ctx.fillRect(entity.pos.x - s, entity.pos.y - s/2, s*2, s);
      ctx.fillStyle = '#000';
      ctx.fillRect(entity.pos.x - s/2, entity.pos.y - s/2, s, s/2);
    } else if (entity.type === EntityType.OBSTACLE_LARGE) {
      // House
      ctx.fillStyle = '#666';
      ctx.fillRect(entity.pos.x - s, entity.pos.y - s/2, s*2, s*1.5);
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.moveTo(entity.pos.x - s - 5*entity.scale, entity.pos.y - s/2);
      ctx.lineTo(entity.pos.x + s + 5*entity.scale, entity.pos.y - s/2);
      ctx.lineTo(entity.pos.x, entity.pos.y - s*1.5);
      ctx.fill();
    } else {
      // Skyscraper
      ctx.fillRect(entity.pos.x - s, entity.pos.y - s, s*2, s*2);
      ctx.fillStyle = '#ccf';
      for(let i = -s + 5; i < s; i+= 15 * entity.scale) {
        for(let j = -s + 5; j < s; j+= 20 * entity.scale) {
          ctx.fillRect(entity.pos.x + i, entity.pos.y + j, 5 * entity.scale, 10 * entity.scale);
        }
      }
    }
  } 
  // --- CANDY THEME ---
  else if (theme === 'CANDY') {
     if (entity.type === EntityType.OBSTACLE_SMALL) {
        // Lollipop
        ctx.beginPath();
        ctx.arc(entity.pos.x, entity.pos.y - s/2, s/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(entity.pos.x-2, entity.pos.y, 4, s);
     } else if (entity.type === EntityType.OBSTACLE_MEDIUM) {
        // Donut
        ctx.beginPath();
        ctx.arc(entity.pos.x, entity.pos.y, s, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff1f2'; // Hole color
        ctx.beginPath();
        ctx.arc(entity.pos.x, entity.pos.y, s/3, 0, Math.PI*2);
        ctx.fill();
     } else if (entity.type === EntityType.OBSTACLE_LARGE) {
        // Gingerbread
        ctx.fillRect(entity.pos.x - s, entity.pos.y - s, s*2, s*2);
        ctx.fillStyle = '#fff'; // Icing
        ctx.fillRect(entity.pos.x - s, entity.pos.y - s, s*2, 4);
     } else {
        // Cake Castle
        ctx.fillRect(entity.pos.x - s, entity.pos.y, s*2, s); // Base
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(entity.pos.x - s*0.7, entity.pos.y - s, s*1.4, s); // Mid
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(entity.pos.x - s*0.3, entity.pos.y - s*2, s*0.6, s); // Top
     }
  }
  // --- CYBER THEME ---
  else if (theme === 'CYBER') {
     if (entity.type === EntityType.OBSTACLE_SMALL) {
        // Bit (Floating Cube)
        ctx.fillRect(entity.pos.x - s/2, entity.pos.y - s/2, s, s);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(entity.pos.x - s/2, entity.pos.y - s/2, s, s);
     } else if (entity.type === EntityType.OBSTACLE_MEDIUM) {
        // Bug (Glitchy Diamond)
        ctx.beginPath();
        ctx.moveTo(entity.pos.x, entity.pos.y - s);
        ctx.lineTo(entity.pos.x + s, entity.pos.y);
        ctx.lineTo(entity.pos.x, entity.pos.y + s);
        ctx.lineTo(entity.pos.x - s, entity.pos.y);
        ctx.fill();
     } else if (entity.type === EntityType.OBSTACLE_LARGE) {
        // Server Rack
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(entity.pos.x - s, entity.pos.y - s*1.5, s*2, s*3);
        // Lights
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.pos.x - s + 5, entity.pos.y - s, 5, 5);
        ctx.fillRect(entity.pos.x - s + 5, entity.pos.y, 5, 5);
     } else {
        // Mainframe
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(entity.pos.x - s, entity.pos.y - s, s*2, s*2);
        // Neon lines
        ctx.strokeStyle = entity.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(entity.pos.x - s + 5, entity.pos.y - s + 5, s*2 - 10, s*2 - 10);
        ctx.beginPath();
        ctx.moveTo(entity.pos.x, entity.pos.y - s + 5);
        ctx.lineTo(entity.pos.x, entity.pos.y + s - 5);
        ctx.stroke();
     }
  }
};

const drawHole = (ctx: CanvasRenderingContext2D, entity: Entity, outlineColor: string, time: number) => {
  const r = entity.radius * entity.scale;
  if (r <= 0) return;

  ctx.beginPath();
  ctx.arc(entity.pos.x, entity.pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  ctx.beginPath();
  const numPoints = 20;
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const jitter = Math.sin(time / 100 + i * 132) * 3 * entity.scale; 
    const jR = r + (2 * entity.scale) + jitter;
    const x = entity.pos.x + Math.cos(angle) * jR;
    const y = entity.pos.y + Math.sin(angle) * jR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 3 * entity.scale;
  ctx.stroke();

  if (entity.label && entity.scale > 0.5) {
    ctx.fillStyle = '#fff';
    ctx.font = `${10 * entity.scale}px "Press Start 2P"`;
    ctx.textAlign = 'center';
    ctx.fillText(entity.label, entity.pos.x, entity.pos.y - r - 10);
  }
};

const drawInputIndicator = (ctx: CanvasRenderingContext2D, cx: number, cy: number, mouse: {x: number, y: number}) => {
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 10) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const segments = 10;
        for(let i=0; i<segments; i++) {
           if(i%2===0) {
               ctx.lineTo(cx + (dx/segments)*(i+1), cy + (dy/segments)*(i+1));
           } else {
               ctx.moveTo(cx + (dx/segments)*(i+1), cy + (dy/segments)*(i+1));
           }
        }
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.stroke();
    }
}

const drawHUD = (ctx: CanvasRenderingContext2D, radius: number, width: number, height: number) => {
    let currentTier = TIER_THRESHOLDS[0];
    let prevThreshold = 0;
    
    for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
        if (radius < TIER_THRESHOLDS[i].threshold) {
            currentTier = TIER_THRESHOLDS[i];
            break;
        }
        prevThreshold = TIER_THRESHOLDS[i].threshold;
        if (i === TIER_THRESHOLDS.length - 1) {
            currentTier = TIER_THRESHOLDS[i];
        }
    }

    const progress = Math.min(1, Math.max(0, (radius - prevThreshold) / (currentTier.threshold - prevThreshold)));
    
    const barWidth = Math.min(400, width - 40);
    const barHeight = 24;
    const x = (width - barWidth) / 2;
    const y = height - 50;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#a855f7'; 
    ctx.fillRect(x + 2, y + 2, (barWidth - 4) * progress, barHeight - 4);

    if (Math.random() > 0.9) {
        ctx.fillStyle = '#fff';
        const gx = x + Math.random() * barWidth;
        ctx.fillRect(gx, y, 4, barHeight);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    let label = `NEXT: ${currentTier.label}`;
    if (radius >= MAX_HOLE_RADIUS) label = "MAX SIZE REACHED";
    
    ctx.fillStyle = '#000';
    ctx.fillText(label, width / 2 + 2, y - 10 + 2);
    ctx.fillStyle = '#fbbf24'; 
    ctx.fillText(label, width / 2, y - 10);
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);