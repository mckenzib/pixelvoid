import { Entity, EntityType, ThemeConfig } from '../types';
import { CONFIG, TIER_SYSTEM, MAX_HOLE_RADIUS, EATING_BUFFER } from '../constants';

// Helper for random range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Generate unique ID
const uid = () => Math.random().toString(36).substr(2, 9);

export const createMapEntities = (count: number, theme: ThemeConfig): Entity[] => {
  const entities: Entity[] = [];
  
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let def = theme.defs.SMALL;
    let type = EntityType.OBSTACLE_SMALL;

    if (rand > 0.9) { def = theme.defs.HUGE; type = EntityType.OBSTACLE_HUGE; }
    else if (rand > 0.7) { def = theme.defs.LARGE; type = EntityType.OBSTACLE_LARGE; }
    else if (rand > 0.4) { def = theme.defs.MEDIUM; type = EntityType.OBSTACLE_MEDIUM; }

    entities.push({
      id: uid(),
      type,
      pos: { x: random(100, CONFIG.mapWidth - 100), y: random(100, CONFIG.mapHeight - 100) },
      velocity: { x: 0, y: 0 },
      radius: def.radius,
      xp: 0,
      color: def.color,
      scoreValue: def.score,
      isDead: false,
      scale: 1,
    });
  }
  return entities;
};

export const createBots = (count: number): Entity[] => {
  const bots: Entity[] = [];
  const names = ["PixelKing", "VoidWalker", "Glitch", "RetroRat", "BitMuncher", "CRT_Dream", "ArcadeFire"];
  
  for (let i = 0; i < count; i++) {
    bots.push({
      id: `bot-${i}`,
      type: EntityType.BOT,
      pos: { x: random(100, CONFIG.mapWidth - 100), y: random(100, CONFIG.mapHeight - 100) },
      velocity: { x: 0, y: 0 },
      radius: TIER_SYSTEM[0].radius, 
      xp: 0,
      color: '#ff0055', // Bot outline color
      scoreValue: 100, // Initial Score for eating a bot
      isDead: false,
      scale: 1,
      label: names[i % names.length],
      targetPos: { x: random(0, CONFIG.mapWidth), y: random(0, CONFIG.mapHeight) }
    });
  }
  return bots;
};

// Physics update
export const updateEntityPosition = (entity: Entity, dt: number) => {
  // Handle Dying/Swallow Animation
  if (entity.isDying) {
    if (entity.consumedBy) {
      // Move towards the center of the black hole
      const dx = entity.consumedBy.pos.x - entity.pos.x;
      const dy = entity.consumedBy.pos.y - entity.pos.y;
      
      // Lerp position
      entity.pos.x += dx * 5 * dt;
      entity.pos.y += dy * 5 * dt;
    }

    // Shrink
    entity.scale -= 2.0 * dt; // Shrink speed
    
    // Kill when invisible
    if (entity.scale <= 0.05) {
      entity.scale = 0;
      entity.isDead = true;
    }
    return; // Skip normal movement
  }

  // Normal Physics
  entity.pos.x += entity.velocity.x * dt;
  entity.pos.y += entity.velocity.y * dt;

  // Boundary checks
  entity.pos.x = Math.max(entity.radius, Math.min(CONFIG.mapWidth - entity.radius, entity.pos.x));
  entity.pos.y = Math.max(entity.radius, Math.min(CONFIG.mapHeight - entity.radius, entity.pos.y));
};

// Simple Bot AI
export const updateBotAI = (bot: Entity, entities: Entity[], player: Entity) => {
  if (bot.isDead || bot.isDying) return;

  const speed = 180; // Pixels per second
  const viewRange = 400;

  // Find nearest edible or threat
  let nearestTarget: Entity | null = null;
  let nearestThreat: Entity | null = null;
  let minTargetDist = Infinity;
  let minThreatDist = Infinity;

  // Combine player and other bots into potential threats/targets
  // Also include obstacles as targets
  const activeBots = entities.filter(e => e.type === EntityType.BOT && !e.isDead && !e.isDying && e.id !== bot.id);
  const obstacles = entities.filter(e => e.type !== EntityType.BOT && !e.isDead && !e.isDying);
  
  // Consider Player
  const threatsAndTargets = [...activeBots];
  if (!player.isDead && !player.isDying) threatsAndTargets.push(player);

  // Check threats/targets (Other Holes)
  for (const other of threatsAndTargets) {
    const dx = other.pos.x - bot.pos.x;
    const dy = other.pos.y - bot.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > viewRange) continue;

    if (other.radius < bot.radius - EATING_BUFFER) {
      // Edible Hole (We are strictly larger)
      if (dist < minTargetDist) {
        minTargetDist = dist;
        nearestTarget = other;
      }
    } else if (other.radius > bot.radius + EATING_BUFFER) {
      // Threat Hole (They are strictly larger)
      if (dist < minThreatDist) {
        minThreatDist = dist;
        nearestThreat = other;
      }
    }
  }

  // Check obstacles (Only if no better target found yet)
  if (!nearestTarget) {
     for (const obs of obstacles) {
        const dx = obs.pos.x - bot.pos.x;
        const dy = obs.pos.y - bot.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > viewRange) continue;
        
        // Only target if we can eat it (obstacle logic is simple > radius)
        if (bot.radius > obs.radius) {
             if (dist < minTargetDist) {
                minTargetDist = dist;
                nearestTarget = obs;
             }
        }
     }
  }

  let targetX = bot.targetPos?.x || bot.pos.x;
  let targetY = bot.targetPos?.y || bot.pos.y;

  if (nearestThreat) {
    // Flee
    const dx = bot.pos.x - nearestThreat.pos.x;
    const dy = bot.pos.y - nearestThreat.pos.y;
    // Normalize and run opposite
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      targetX = bot.pos.x + (dx / mag) * 500;
      targetY = bot.pos.y + (dy / mag) * 500;
    }
  } else if (nearestTarget) {
    // Chase
    targetX = nearestTarget.pos.x;
    targetY = nearestTarget.pos.y;
  } else {
    // Wander logic
    if (bot.targetPos) {
       const distToTarget = Math.sqrt(
           Math.pow(bot.targetPos.x - bot.pos.x, 2) + 
           Math.pow(bot.targetPos.y - bot.pos.y, 2)
       );
       
       // Pick new point if reached or randomly
       if (distToTarget < 50 || Math.random() < 0.02) {
           bot.targetPos = { 
               x: random(100, CONFIG.mapWidth - 100), 
               y: random(100, CONFIG.mapHeight - 100) 
           };
       }
    } else {
        bot.targetPos = { x: CONFIG.mapWidth/2, y: CONFIG.mapHeight/2 };
    }
    targetX = bot.targetPos.x;
    targetY = bot.targetPos.y;
  }

  // Update velocity based on target
  const dx = targetX - bot.pos.x;
  const dy = targetY - bot.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist > 10) {
    bot.velocity.x = (dx / dist) * speed;
    bot.velocity.y = (dy / dist) * speed;
  } else {
    bot.velocity.x = 0;
    bot.velocity.y = 0;
  }
};

const getRadiusFromXp = (xp: number): number => {
    let r = TIER_SYSTEM[0].radius;
    for (const tier of TIER_SYSTEM) {
        if (xp >= tier.minXp) {
            r = tier.radius;
        } else {
            break;
        }
    }
    return r;
}

export const checkCollisions = (
  player: Entity, 
  bots: Entity[], 
  obstacles: Entity[], 
  onEat: (predator: Entity, prey: Entity) => void
) => {
  // Collect all predators (Player + Bots)
  const predators: Entity[] = [];
  if (!player.isDead && !player.isDying) predators.push(player);
  bots.forEach(b => { if(!b.isDead && !b.isDying) predators.push(b); });

  // Iterate through predators to find what they eat
  predators.forEach(predator => {
    if (predator.isDead || predator.isDying) return;

    // Check against Obstacles
    obstacles.forEach(obs => {
      // Ignore dead or currently dying things
      if (obs.isDead || obs.isDying) return;
      
      const dx = predator.pos.x - obs.pos.x;
      const dy = predator.pos.y - obs.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Collision condition: Distance < Predator Radius AND Predator > Obstacle Radius
      if (dist < predator.radius && predator.radius > obs.radius) {
         // START SWALLOW ANIMATION
         obs.isDying = true;
         obs.consumedBy = predator;
         
         // Add XP
         predator.xp += obs.scoreValue;
         
         // Update Radius based on Tiers
         predator.radius = getRadiusFromXp(predator.xp);
         
         // Update Value of this hole (if it gets eaten)
         if (predator.type === EntityType.BOT || predator.type === EntityType.PLAYER) {
             predator.scoreValue = 100 + predator.xp;
         }

         onEat(predator, obs);
      }
    });

    // Check against Other Holes (Player/Bots)
    const otherHoles = [...bots];
    if (predator.id !== 'player' && !player.isDead && !player.isDying) otherHoles.push(player);

    otherHoles.forEach(prey => {
      if (prey.id === predator.id || prey.isDead || prey.isDying || predator.isDead || predator.isDying) return;

      const dx = predator.pos.x - prey.pos.x;
      const dy = predator.pos.y - prey.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hole vs Hole Logic
      if (dist < predator.radius) {
        if (predator.radius > prey.radius + EATING_BUFFER) {
            // START SWALLOW ANIMATION
            prey.isDying = true;
            prey.consumedBy = predator;
            
            // Massive XP Gain (Base + % of their XP)
            const xpGain = 200 + (prey.xp * 0.5);
            predator.xp += xpGain;
            
            // Hack to pass the calculated value to the scoreboard via the prey object temporarily
            // (or rely on prey.scoreValue being updated dynamically during their life)
            // We'll update the prey's scoreValue to reflect the total gain for the consumer
            prey.scoreValue = xpGain;

            // Update Radius based on Tiers
            predator.radius = getRadiusFromXp(predator.xp);
            
             // Update Value of this hole (if it gets eaten)
            if (predator.type === EntityType.BOT || predator.type === EntityType.PLAYER) {
                predator.scoreValue = 100 + predator.xp;
            }

            onEat(predator, prey);
        }
      }
    });
  });
};