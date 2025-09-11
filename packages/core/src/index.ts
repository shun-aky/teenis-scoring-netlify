
export type Player = "A" | "B";

export interface Point {
  player: Player;
  notation: string; // e.g., 'FSO' (Forehand Stroke Out)
}

export interface Game {
  server: Player;
  points: (Point | null)[];
  serviceInfo: boolean[]; // true = first serve fault
  gameScoreA: number;
  gameScoreB: number;
  totalBoxes: number;
}

export function createGame(): Game {
  return {
    server: "A",
    points: Array(8).fill(null),
    serviceInfo: Array(8).fill(false),
    gameScoreA: 0,
    gameScoreB: 0,
    totalBoxes: 8,
  };
}

export function addDeuceBoxes(game: Game): void {
  game.totalBoxes += 2;
  while (game.points.length < game.totalBoxes) game.points.push(null);
  while (game.serviceInfo.length < game.totalBoxes) game.serviceInfo.push(false);
}

export function removeDeuceBoxes(game: Game): void {
  if (game.totalBoxes <= 8) return;
  game.totalBoxes -= 2;
}

export function toggleServer(game: Game, player: Player): void {
  game.server = player;
}

export function toggleServiceInfo(game: Game, index: number): void {
  if (index < 0 || index >= game.totalBoxes) return;
  game.serviceInfo[index] = !game.serviceInfo[index];
}

export function setPoint(game: Game, index: number, player: Player, notation: string): void {
  if (index < 0 || index >= game.totalBoxes) return;
  game.points[index] = { player, notation };
}

export function clearPoint(game: Game, index: number): void {
  if (index < 0 || index >= game.totalBoxes) return;
  game.points[index] = null;
}

export function updateGameScore(game: Game, player: Player, value: number): void {
  const n = Number.isFinite(value) ? Math.max(0, Math.min(99, Math.floor(value))) : 0;
  if (player === "A") game.gameScoreA = n;
  else game.gameScoreB = n;
}
