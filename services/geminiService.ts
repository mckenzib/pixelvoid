import { PlayerStats } from "../types";

const WIN_QUOTES = [
  "ABSOLUTE DOMINATION! THE VOID BOWS TO YOU!",
  "PIXEL PERFECT VICTORY! YOU ATE THE WORLD!",
  "MAXIMUM OVERDRIVE! NOTHING LEFT BUT YOU!",
  "KING OF THE CRATER! UNSTOPPABLE FORCE!",
  "VOID CHAMPION! THE CITY IS YOUR SNACK!",
  "SENSATIONAL! YOU CONSUMED THE COMPETITION!",
  "GODLIKE GROWTH! A NEW BLACK HOLE IS BORN!",
  "VICTORY VORACIOUS! THE UNIVERSE IS YOURS!",
  "YOU ARE THE EVENT HORIZON! NOTHING ESCAPES!",
  "TOP TIER TRASH PANDA! YOU CLEANED HOUSE!"
];

const TOP_RANK_QUOTES = [ // Ranks 2-3
  "SO CLOSE! YET SO SMALL.",
  "BRONZE MEDAL? BETTER THAN NOTHING.",
  "ALMOST A TITAN. ALMOST.",
  "TOP 3! RESPECTABLE, BUT NOT LEGENDARY.",
  "YOU HAD POTENTIAL. WASTED POTENTIAL."
];

const LOSS_QUOTES = [
  "CRUSHED BY GRAVITY! TRY EATING FASTER.",
  "CONSUMED! THERE'S ALWAYS A BIGGER FISH.",
  "GAME OVER! YOU WERE JUST A SNACK.",
  "DEFEAT! BACK TO THE MICROSCOPIC REALM.",
  "WASTED! THE VOID REJECTS YOUR SMALLNESS.",
  "OBLITERATED! SIZE MATTERS IN THE VOID.",
  "SWALLOWED WHOLE! BETTER LUCK NEXT TIMELINE.",
  "INSIGNIFICANT SPECK! GROW BIGGER, FASTER!",
  "ELIMINATED! YOU WERE DELICIOUS THOUGH.",
  "TRY AGAIN! THE CITY ISN'T GOING TO EAT ITSELF."
];

export const generateGameCommentary = async (stats: PlayerStats, won: boolean): Promise<string> => {
  // Simulate a tiny delay for the 'computing' feel
  await new Promise(resolve => setTimeout(resolve, 600));

  if (won) {
    return WIN_QUOTES[Math.floor(Math.random() * WIN_QUOTES.length)];
  } else if (stats.rank <= 3 && stats.rank > 1) {
      // Mix of loss quotes and top rank quotes for 2nd/3rd place
      const pool = Math.random() > 0.5 ? TOP_RANK_QUOTES : LOSS_QUOTES;
      return pool[Math.floor(Math.random() * pool.length)];
  } else {
    return LOSS_QUOTES[Math.floor(Math.random() * LOSS_QUOTES.length)];
  }
};
