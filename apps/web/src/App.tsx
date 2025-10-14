import React, { useMemo, useState } from "react";
import * as Core from "@tennis/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// type ShotSel = { hand?: string; shot?: string; result?: string; actor?: string };
// type ShotSel = { hand?: string; shot?: string; result?: string; actor?: string; returner?: string };
type ShotSel = { hand?: string; shot?: string; result?: string; actor?: string; returner?: string; server?: string };
// interface ModalState {
//   open: boolean;
//   gameIndex: number;
//   pointIndex: number;
//   player: Core.Player;
// }

interface ModalState {
  open: boolean;
  gameIndex: number;
  pointIndex: number;
  player: Core.Player;
  isTieBreak?: boolean;  // ADD THIS LINE
}

export default function App() {
  const [mode, setMode] = useState<"singles" | "doubles">("singles");

  // singles names
  const [playerA, setPlayerA] = useState("A");
  const [playerB, setPlayerB] = useState("B");

  // doubles names
  const [playerA1, setPlayerA1] = useState("A1");
  const [playerA2, setPlayerA2] = useState("A2");
  const [playerB1, setPlayerB1] = useState("B1");
  const [playerB2, setPlayerB2] = useState("B2");

  const [games, setGames] = useState<Core.Game[]>([Core.createGame()]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selected, setSelected] = useState<ShotSel>({});
const [tieBreaks, setTieBreaks] = useState<Array<{ points: any[], scoreA: number, scoreB: number, totalBoxes: number }>>([]);

  const initials = useMemo(
    () => ({
      A: (mode === "singles" ? playerA : playerA1)[0]?.toUpperCase() || "A",
      B: (mode === "singles" ? playerB : playerB1)[0]?.toUpperCase() || "B",
    }),
    [mode, playerA, playerB, playerA1, playerB1]
  );

  function addGame() {
    setGames((gs) => [...gs, { ...Core.createGame(), serverPlayer: undefined }]);
  }

function addTieBreak() {
  setTieBreaks((tbs) => [...tbs, { points: Array(12).fill(null), scoreA: 0, scoreB: 0, totalBoxes: 12 }]);
}

function addTieBreakBoxes(tieBreakIndex: number) {
  setTieBreaks((tbs) => {
    const copy = tbs.slice();
    const tb = { ...copy[tieBreakIndex] };
    copy[tieBreakIndex] = tb;
    tb.totalBoxes += 2;
    tb.points = [...tb.points, null, null];
    return copy;
  });
}

function removeTieBreakBoxes(tieBreakIndex: number) {
  setTieBreaks((tbs) => {
    const copy = tbs.slice();
    const tb = { ...copy[tieBreakIndex] };
    copy[tieBreakIndex] = tb;
    if (tb.totalBoxes > 12) {
      tb.totalBoxes -= 2;
      tb.points = tb.points.slice(0, tb.totalBoxes);
    }
    return copy;
  });
}

function clearSheet() {
  setGames([]);
  setTieBreaks([]);  // ADD THIS LINE
}

  function openPointInput(gameIndex: number, pointIndex: number, player: Core.Player) {
    setSelected({});
    setModal({ open: true, gameIndex, pointIndex, player });
  }

  function openTieBreakPointInput(tieBreakIndex: number, pointIndex: number, player: Core.Player) {
  setSelected({});
  setModal({ open: true, gameIndex: tieBreakIndex, pointIndex, player, isTieBreak: true });
}

  function cancelInput() {
    setModal(null);
  }
//   function confirmInput() {
//   if (!modal) return;
//   const notation = `${selected.hand ?? ""}${selected.shot ?? ""}${selected.result ?? ""}`;
//   if (!notation) {
//     setModal(null);
//     return;
//   }
//   setGames((gs) => {
//     const copy = gs.slice();
//     const g = { ...copy[modal.gameIndex] };
//     copy[modal.gameIndex] = g;
//     Core.setPoint(g, modal.pointIndex, modal.player, notation);
//     const pt = (g.points[modal.pointIndex] as any) || {};
//     pt.actor = selected.actor;
//     pt.returner = selected.returner; // Store returner info
//     g.points[modal.pointIndex] = pt;
//     return copy;
//   });
//   setModal(null);
// }
// function confirmInput() {
//   if (!modal) return;
//   const notation = `${selected.hand ?? ""}${selected.shot ?? ""}${selected.result ?? ""}`;
//   if (!notation) {
//     setModal(null);
//     return;
//   }
  
//   if (modal.isTieBreak) {
//     // Handle tie break point
//     setTieBreaks((tbs) => {
//       const copy = tbs.slice();
//       const tb = { ...copy[modal.gameIndex] };
//       copy[modal.gameIndex] = tb;
      
//       const pointData = {
//         player: modal.player,
//         notation: notation,
//         actor: selected.actor,
//         returner: selected.returner,
//         server: selected.actor // In tie break, actor is the server
//       };
      
//       tb.points[modal.pointIndex] = pointData;
      
//       // Update score
//       if (modal.player === "A") {
//         tb.scoreA = (tb.scoreA || 0) + 1;
//       } else {
//         tb.scoreB = (tb.scoreB || 0) + 1;
//       }
      
//       return copy;
//     });
//   } else {
//     // Handle regular game point
//     setGames((gs) => {
//       const copy = gs.slice();
//       const g = { ...copy[modal.gameIndex] };
//       copy[modal.gameIndex] = g;
//       Core.setPoint(g, modal.pointIndex, modal.player, notation);
//       const pt = (g.points[modal.pointIndex] as any) || {};
//       pt.actor = selected.actor;
//       pt.returner = selected.returner;
//       g.points[modal.pointIndex] = pt;
//       return copy;
//     });
//   }
//   setModal(null);
// }

function confirmInput() {
  if (!modal) return;
  const notation = `${selected.hand ?? ""}${selected.shot ?? ""}${selected.result ?? ""}`;
  if (!notation) {
    setModal(null);
    return;
  }
  
  if (modal.isTieBreak) {
    // Handle tie break point
    setTieBreaks((tbs) => {
      const copy = tbs.slice();
      const tb = { ...copy[modal.gameIndex] };
      copy[modal.gameIndex] = tb;
      
      const pointData = {
        player: modal.player,
        notation: notation,
        actor: selected.actor,
        returner: selected.returner,
        server: selected.server // Use separate server field
      };
      
      tb.points[modal.pointIndex] = pointData;
      
      // Update score
      if (modal.player === "A") {
        tb.scoreA = (tb.scoreA || 0) + 1;
      } else {
        tb.scoreB = (tb.scoreB || 0) + 1;
      }
      
      return copy;
    });
  } else {
    // Handle regular game point
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[modal.gameIndex] };
      copy[modal.gameIndex] = g;
      Core.setPoint(g, modal.pointIndex, modal.player, notation);
      const pt = (g.points[modal.pointIndex] as any) || {};
      pt.actor = selected.actor;
      pt.returner = selected.returner;
      g.points[modal.pointIndex] = pt;
      return copy;
    });
  }
  setModal(null);
}
  // function confirmInput() {
  //   if (!modal) return;
  //   const notation = `${selected.hand ?? ""}${selected.shot ?? ""}${selected.result ?? ""}`;
  //   if (!notation) {
  //     setModal(null);
  //     return;
  //   }
  //   setGames((gs) => {
  //     const copy = gs.slice();
  //     const g = { ...copy[modal.gameIndex] };
  //     copy[modal.gameIndex] = g;
  //     Core.setPoint(g, modal.pointIndex, modal.player, notation);
  //     const pt = (g.points[modal.pointIndex] as any) || {};
  //     pt.actor = selected.actor;
  //     g.points[modal.pointIndex] = pt;
  //     return copy;
  //   });
  //   setModal(null);
  // }

  function toggleServer(gameIndex: number, player: Core.Player) {
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[gameIndex] };
      copy[gameIndex] = g;
      Core.toggleServer(g, player);
      return copy;
    });
  }
  function toggleServiceInfo(gameIndex: number, pointIndex: number) {
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[gameIndex] };
      copy[gameIndex] = g;
      Core.toggleServiceInfo(g, pointIndex);
      return copy;
    });
  }
  function addDeuceBoxes(gameIndex: number) {
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[gameIndex] };
      copy[gameIndex] = g;
      Core.addDeuceBoxes(g);
      return copy;
    });
  }
  function removeDeuceBoxes(gameIndex: number) {
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[gameIndex] };
      copy[gameIndex] = g;
      Core.removeDeuceBoxes(g);
      return copy;
    });
  }
  function updateGameScore(gameIndex: number, player: Core.Player, value: number) {
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[gameIndex] };
      copy[gameIndex] = g;
      Core.updateGameScore(g, player, value);
      return copy;
    });
  }

  function actorToTeam(actor?: string) {
    if (!actor) return null;
    if (mode === "singles") {
      if (actor === playerA) return "A";
      if (actor === playerB) return "B";
      return null;
    } else {
      if (actor === playerA1 || actor === playerA2) return "A";
      if (actor === playerB1 || actor === playerB2) return "B";
      return null;
    }
  }

  function allPlayerNames(): string[] {
    if (mode === "singles") return [playerA, playerB];
    return [playerA1, playerA2, playerB1, playerB2];
  }

  function setServer(gameIndex: number, team: Core.Player, playerName?: string) {
    setGames((gs) => {
      const copy = gs.slice();
      const g: any = { ...copy[gameIndex] };
      g.server = team;
      if (mode === "doubles" && playerName) {
        g.serverPlayer = playerName;
      } else {
        g.serverPlayer = team;
      }
      copy[gameIndex] = g;
      return copy;
    });
  }

  // === Stats ===
//   function calculateStats() {
//   let totalPointsA = 0,
//     totalPointsB = 0;
//   let errorsA = 0,
//     errorsB = 0;

//   // Team serve aggregates
//   let firstServeAttempts = { A: 0, B: 0 };
//   let firstServeMakes = { A: 0, B: 0 };
//   let firstServeWins = { A: 0, B: 0 };
//   let secondServeAttempts = { A: 0, B: 0 };
//   let secondServeMakes = { A: 0, B: 0 };
//   let secondServeWins = { A: 0, B: 0 };

//   // Per-player tracking (includes serve attempts/makes)
//   const indiv: Record<
//     string,
//     {
//       pointsMade: number;
//       errors: number;
//       firstServePoints: number;
//       secondServePoints: number;
//       firstServeAttempts: number;
//       firstServeMakes: number;
//       secondServeAttempts: number;
//       secondServeMakes: number;
//       shots: Record<string, { points: number; errors: number }>;
//       firstReturnIn: number;
//       firstReturnOut: number;
//       firstReturnPointsWon: number;
//       firstReturnOpportunities: number;
//       secondReturnIn: number;
//       secondReturnOut: number;
//       secondReturnPointsWon: number;
//       secondReturnOpportunities: number;
//     }
//   > = {};

//   allPlayerNames().forEach((n) => {
//     indiv[n] = {
//       pointsMade: 0,
//       errors: 0,
//       firstServePoints: 0,
//       secondServePoints: 0,
//       firstServeAttempts: 0,
//       firstServeMakes: 0,
//       secondServeAttempts: 0,
//       secondServeMakes: 0,
//       shots: {},
//       firstReturnIn: 0,
//       firstReturnOut: 0,
//       firstReturnPointsWon: 0,
//       firstReturnOpportunities: 0,
//       secondReturnIn: 0,
//       secondReturnOut: 0,
//       secondReturnPointsWon: 0,
//       secondReturnOpportunities: 0,
//     };
//   });

//   games.forEach((game) => {
//     game.points.forEach((point, idx) => {
//       if (!point) return;

//       // team totals
//       if (point.player === "A") totalPointsA++;
//       else totalPointsB++;

//       // team errors (loser gets the 'error' count)
//       if (/O|N/.test(point.notation)) {
//         if (point.player === "A") errorsB++;
//         else errorsA++;
//       }

//       // actor-based counts (points/errors)
//       const actor = (point as any).actor as string | undefined;
//       if (actor && actorToTeam(actor) === point.player) {
//         indiv[actor].pointsMade++;
        
//         // Track shot type for points - extract shot from notation (e.g., "FLO" -> "L", "BSA" -> "S")
//         const notation = point.notation;
//         const hand = notation.match(/^[FB]/)?.[0] || "";
//         const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
//         const shotLabel = hand + shot; // e.g., "FL", "BS", "FV"
        
//         if (!indiv[actor].shots[shotLabel]) {
//           indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
//         }
//         indiv[actor].shots[shotLabel].points++;
//       }
//       if (actor && /O|N/.test(point.notation)) {
//         indiv[actor].errors++;
        
//         // Track shot type for errors
//         const notation = point.notation;
//         const hand = notation.match(/^[FB]/)?.[0] || "";
//         const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
//         const shotLabel = hand + shot; // e.g., "FL", "BS", "FV"
        
//         if (!indiv[actor].shots[shotLabel]) {
//           indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
//         }
//         indiv[actor].shots[shotLabel].errors++;
//       }

//       // Serve logic
//       const serverTeam = game.server; // 'A' | 'B'
//       const receiverTeam = serverTeam === "A" ? "B" : "A";
      
//       // If serverPlayer explicitly set (doubles) use it; otherwise, in singles attribute to that player
//       const servingPlayerName =
//         (game as any).serverPlayer ??
//         (mode === "singles" ? (serverTeam === "A" ? playerA : playerB) : undefined);

//       const isFirstServeGood = !game.serviceInfo[idx]; // true => 1st in, false => 1st missed -> 2nd serve
//       const isDoubleFault = /DF/i.test(point.notation); // double fault hit on this point?
//       const isServiceAce = /SrA/i.test(point.notation); // service ace

//       // --- Team-level serve attempts ---
//       firstServeAttempts[serverTeam]++;

//       // --- Individual-level: first serve attempt always increments for the server (if known) ---
//       if (servingPlayerName) {
//         indiv[servingPlayerName].firstServeAttempts++;
//       }

//       if (isFirstServeGood) {
//         // first serve was in
//         firstServeMakes[serverTeam]++;

//         if (servingPlayerName) {
//           indiv[servingPlayerName].firstServeMakes++;
//         }

//         // Track return stats for receiver(s)
//         const receiverNames = mode === "singles" 
//           ? [receiverTeam === "A" ? playerA : playerB]
//           : receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
        
//         receiverNames.forEach((receiverName) => {
//           indiv[receiverName].firstReturnOpportunities++;
          
//           if (isServiceAce) {
//             // Return was out (couldn't return the ace)
//             indiv[receiverName].firstReturnOut++;
//           } else {
//             // Return was in
//             indiv[receiverName].firstReturnIn++;
            
//             // Check if receiver won the point
//             if (point.player === receiverTeam) {
//               indiv[receiverName].firstReturnPointsWon++;
//             }
//           }
//         });

//         if (point.player === serverTeam) {
//           // server's side won the point on 1st serve
//           firstServeWins[serverTeam]++;
//           if (servingPlayerName) indiv[servingPlayerName].firstServePoints++;
//         }
//       } else {
//         // first serve missed -> second serve happened (or DF)
//         secondServeAttempts[serverTeam]++;
//         if (servingPlayerName) {
//           indiv[servingPlayerName].secondServeAttempts++;
//         }

//         if (isDoubleFault) {
//           // double fault: second serve was missed — DO NOT increment secondServeMakes
//           // (point is awarded to receiver; we don't increment secondServeMakes or secondServeWins)
//           // note: we don't auto-increment indiv[servingPlayerName].errors here to avoid double-counting
//           // if an actor was already set; actor-based error handling remains in place above.
//         } else {
//           // second serve was in
//           secondServeMakes[serverTeam]++;
//           if (servingPlayerName) {
//             indiv[servingPlayerName].secondServeMakes++;
//           }

//           // Track return stats for receiver(s) on second serve
//           const receiverNames = mode === "singles" 
//             ? [receiverTeam === "A" ? playerA : playerB]
//             : receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
          
//           receiverNames.forEach((receiverName) => {
//             indiv[receiverName].secondReturnOpportunities++;
            
//             if (isServiceAce) {
//               // Return was out (couldn't return the ace)
//               indiv[receiverName].secondReturnOut++;
//             } else {
//               // Return was in
//               indiv[receiverName].secondReturnIn++;
              
//               // Check if receiver won the point
//               if (point.player === receiverTeam) {
//                 indiv[receiverName].secondReturnPointsWon++;
//               }
//             }
//           });

//           if (point.player === serverTeam) {
//             // server's side won the point on 2nd serve
//             secondServeWins[serverTeam]++;
//             if (servingPlayerName) indiv[servingPlayerName].secondServePoints++;
//           }
//         }
//       }
//     });
//   });

//   // build per-player summary (including per-player serve-in %)
//   const teamTotals = { A: totalPointsA, B: totalPointsB };
//   const indivDetailed: Record<string, any> = {};
//   for (const name of Object.keys(indiv)) {
//     const data = indiv[name];
//     const team = actorToTeam(name);
//     const teamFirstMakes = team ? firstServeMakes[team] : 0;
//     const teamSecondMakes = team ? secondServeMakes[team] : 0;
//     const teamPoints = team ? teamTotals[team] : 0;

//     indivDetailed[name] = {
//       pointsMade: data.pointsMade,
//       errors: data.errors,
//       pointsShareOfTeamPct: teamPoints > 0 ? ((data.pointsMade / teamPoints) * 100).toFixed(1) + "%" : "0.0%",
//       // server-point contributions (as before)
//       firstServePoints: data.firstServePoints,
//       firstServeContributionPct: data.firstServeAttempts > 0 ? ((data.firstServePoints / data.firstServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       secondServePoints: data.secondServePoints,
//       secondServeContributionPct: data.secondServeAttempts > 0 ? ((data.secondServePoints / data.secondServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       // per-player serve-in rates + raw attempts/makes
//       firstServeAttempts: data.firstServeAttempts,
//       firstServeMakes: data.firstServeMakes,
//       firstServeInPct: data.firstServeAttempts > 0 ? ((data.firstServeMakes / data.firstServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       secondServeAttempts: data.secondServeAttempts,
//       secondServeMakes: data.secondServeMakes,
//       secondServeInPct: data.secondServeAttempts > 0 ? ((data.secondServeMakes / data.secondServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       shots: data.shots,
//       // Return stats
//       firstReturnIn: data.firstReturnIn,
//       firstReturnOut: data.firstReturnOut,
//       firstReturnOpportunities: data.firstReturnOpportunities,
//       firstReturnInPct: data.firstReturnOpportunities > 0 ? ((data.firstReturnIn / data.firstReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//       firstReturnPointsWon: data.firstReturnPointsWon,
//       firstReturnWinPct: data.firstReturnOpportunities > 0 ? ((data.firstReturnPointsWon / data.firstReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//       secondReturnIn: data.secondReturnIn,
//       secondReturnOut: data.secondReturnOut,
//       secondReturnOpportunities: data.secondReturnOpportunities,
//       secondReturnInPct: data.secondReturnOpportunities > 0 ? ((data.secondReturnIn / data.secondReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//       secondReturnPointsWon: data.secondReturnPointsWon,
//       secondReturnWinPct: data.secondReturnOpportunities > 0 ? ((data.secondReturnPointsWon / data.secondReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//     };
//   }

//   return {
//     totalPointsA,
//     totalPointsB,
//     errorsA,
//     errorsB,
//     firstServeAttempts,
//     firstServeMakes,
//     firstServeWins,
//     secondServeAttempts,
//     secondServeMakes,
//     secondServeWins,
//     indivDetailed,
//     firstServeInPct: {
//       A: firstServeAttempts.A ? ((firstServeMakes.A / firstServeAttempts.A) * 100).toFixed(1) : "0.0",
//       B: firstServeAttempts.B ? ((firstServeMakes.B / firstServeAttempts.B) * 100).toFixed(1) : "0.0",
//     },
//     firstServeWinPct: {
//       A: firstServeMakes.A ? ((firstServeWins.A / firstServeMakes.A) * 100).toFixed(1) : "0.0",
//       B: firstServeMakes.B ? ((firstServeWins.B / firstServeMakes.B) * 100).toFixed(1) : "0.0",
//     },
//     secondServeInPct: {
//       A: secondServeAttempts.A ? ((secondServeMakes.A / secondServeAttempts.A) * 100).toFixed(1) : "0.0",
//       B: secondServeAttempts.B ? ((secondServeMakes.B / secondServeAttempts.B) * 100).toFixed(1) : "0.0",
//     },
//     secondServeWinPct: {
//       A: secondServeMakes.A ? ((secondServeWins.A / secondServeMakes.A) * 100).toFixed(1) : "0.0",
//       B: secondServeMakes.B ? ((secondServeWins.B / secondServeMakes.B) * 100).toFixed(1) : "0.0",
//     },
//   };
// }
function calculateStats() {
  let totalPointsA = 0,
    totalPointsB = 0;
  let errorsA = 0,
    errorsB = 0;

  // Team serve aggregates
  let firstServeAttempts = { A: 0, B: 0 };
  let firstServeMakes = { A: 0, B: 0 };
  let firstServeWins = { A: 0, B: 0 };
  let secondServeAttempts = { A: 0, B: 0 };
  let secondServeMakes = { A: 0, B: 0 };
  let secondServeWins = { A: 0, B: 0 };

  // Per-player tracking (includes serve attempts/makes)
  const indiv: Record<
    string,
    {
      pointsMade: number;
      errors: number;
      firstServePoints: number;
      secondServePoints: number;
      firstServeAttempts: number;
      firstServeMakes: number;
      secondServeAttempts: number;
      secondServeMakes: number;
      shots: Record<string, { points: number; errors: number }>;
      firstReturnIn: number;
      firstReturnOut: number;
      firstReturnPointsWon: number;
      firstReturnOpportunities: number;
      secondReturnIn: number;
      secondReturnOut: number;
      secondReturnPointsWon: number;
      secondReturnOpportunities: number;
    }
  > = {};

  allPlayerNames().forEach((n) => {
    indiv[n] = {
      pointsMade: 0,
      errors: 0,
      firstServePoints: 0,
      secondServePoints: 0,
      firstServeAttempts: 0,
      firstServeMakes: 0,
      secondServeAttempts: 0,
      secondServeMakes: 0,
      shots: {},
      firstReturnIn: 0,
      firstReturnOut: 0,
      firstReturnPointsWon: 0,
      firstReturnOpportunities: 0,
      secondReturnIn: 0,
      secondReturnOut: 0,
      secondReturnPointsWon: 0,
      secondReturnOpportunities: 0,
    };
  });

  games.forEach((game) => {
    game.points.forEach((point, idx) => {
      if (!point) return;

      // team totals
      if (point.player === "A") totalPointsA++;
      else totalPointsB++;

      // team errors (loser gets the 'error' count)
      if (/O|N/.test(point.notation)) {
        if (point.player === "A") errorsB++;
        else errorsA++;
      }

      // actor-based counts (points/errors)
      const actor = (point as any).actor as string | undefined;
      if (actor && actorToTeam(actor) === point.player) {
        indiv[actor].pointsMade++;
        
        // Track shot type for points - extract shot from notation (e.g., "FLO" -> "L", "BSA" -> "S")
        const notation = point.notation;
        const hand = notation.match(/^[FB]/)?.[0] || "";
        const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
        const shotLabel = hand + shot; // e.g., "FL", "BS", "FV"
        
        if (!indiv[actor].shots[shotLabel]) {
          indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
        }
        indiv[actor].shots[shotLabel].points++;
      }
      if (actor && /O|N/.test(point.notation)) {
        indiv[actor].errors++;
        
        // Track shot type for errors
        const notation = point.notation;
        const hand = notation.match(/^[FB]/)?.[0] || "";
        const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
        const shotLabel = hand + shot; // e.g., "FL", "BS", "FV"
        
        if (!indiv[actor].shots[shotLabel]) {
          indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
        }
        indiv[actor].shots[shotLabel].errors++;
      }

      // Serve logic
      const serverTeam = game.server; // 'A' | 'B'
      const receiverTeam = serverTeam === "A" ? "B" : "A";
      
      // If serverPlayer explicitly set (doubles) use it; otherwise, in singles attribute to that player
      const servingPlayerName =
        (game as any).serverPlayer ??
        (mode === "singles" ? (serverTeam === "A" ? playerA : playerB) : undefined);

      const isFirstServeGood = !game.serviceInfo[idx]; // true => 1st in, false => 1st missed -> 2nd serve
      const isDoubleFault = /DF/i.test(point.notation); // double fault hit on this point?
      const isServiceAce = /SrA/i.test(point.notation); // service ace

      // --- Team-level serve attempts ---
      firstServeAttempts[serverTeam]++;

      // --- Individual-level: first serve attempt always increments for the server (if known) ---
      if (servingPlayerName) {
        indiv[servingPlayerName].firstServeAttempts++;
      }

      if (isFirstServeGood) {
        // first serve was in
        firstServeMakes[serverTeam]++;

        if (servingPlayerName) {
          indiv[servingPlayerName].firstServeMakes++;
        }

        // Track return stats for receiver(s) - only if serve was in
        const returnerFromPoint = (point as any).returner as string | undefined;
        let receiverNames: string[];
        
        if (mode === "doubles" && returnerFromPoint) {
          // In doubles, use the specific returner if recorded
          receiverNames = [returnerFromPoint];
        } else if (mode === "singles") {
          // In singles, use the receiving player
          receiverNames = [receiverTeam === "A" ? playerA : playerB];
        } else {
          // Fallback: distribute to both players on receiving team (shouldn't happen if returner is always set)
          receiverNames = receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
        }
        
        receiverNames.forEach((receiverName) => {
          indiv[receiverName].firstReturnOpportunities++;
          
          if (isServiceAce) {
            // Return was out (couldn't return the ace)
            indiv[receiverName].firstReturnOut++;
          } else {
            // Return was in
            indiv[receiverName].firstReturnIn++;
            
            // Check if receiver won the point
            if (point.player === receiverTeam) {
              indiv[receiverName].firstReturnPointsWon++;
            }
          }
        });

        if (point.player === serverTeam) {
          // server's side won the point on 1st serve
          firstServeWins[serverTeam]++;
          if (servingPlayerName) indiv[servingPlayerName].firstServePoints++;
        }
      } else {
        // first serve missed -> second serve happened (or DF)
        secondServeAttempts[serverTeam]++;
        if (servingPlayerName) {
          indiv[servingPlayerName].secondServeAttempts++;
        }

        if (isDoubleFault) {
          // double fault: second serve was missed — DO NOT track return stats
          // (returner never got a chance to return)
          return;
        } else {
          // second serve was in
          secondServeMakes[serverTeam]++;
          if (servingPlayerName) {
            indiv[servingPlayerName].secondServeMakes++;
          }

          // Track return stats for receiver(s) on second serve - only if serve was in (not DF)
          const returnerFromPoint = (point as any).returner as string | undefined;
          let receiverNames: string[];
          
          if (mode === "doubles" && returnerFromPoint) {
            // In doubles, use the specific returner if recorded
            receiverNames = [returnerFromPoint];
          } else if (mode === "singles") {
            // In singles, use the receiving player
            receiverNames = [receiverTeam === "A" ? playerA : playerB];
          } else {
            // Fallback: distribute to both players on receiving team
            receiverNames = receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
          }
          
          receiverNames.forEach((receiverName) => {
            indiv[receiverName].secondReturnOpportunities++;
            
            if (isServiceAce) {
              // Return was out (couldn't return the ace)
              indiv[receiverName].secondReturnOut++;
            } else {
              // Return was in
              indiv[receiverName].secondReturnIn++;
              
              // Check if receiver won the point
              if (point.player === receiverTeam) {
                indiv[receiverName].secondReturnPointsWon++;
              }
            }
          });

          if (point.player === serverTeam) {
            // server's side won the point on 2nd serve
            secondServeWins[serverTeam]++;
            if (servingPlayerName) indiv[servingPlayerName].secondServePoints++;
          }
        }
      }
    });
  });

  // Process tie breaks
  tieBreaks.forEach((tb) => {
    tb.points.forEach((point) => {
      if (!point) return;

      // team totals
      if (point.player === "A") totalPointsA++;
      else totalPointsB++;

      // team errors
      if (/O|N/.test(point.notation)) {
        if (point.player === "A") errorsB++;
        else errorsA++;
      }

      // actor-based counts
      const actor = point.actor as string | undefined;
      if (actor && actorToTeam(actor) === point.player) {
        indiv[actor].pointsMade++;
        
        const notation = point.notation;
        const hand = notation.match(/^[FB]/)?.[0] || "";
        const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
        const shotLabel = hand + shot;
        
        if (!indiv[actor].shots[shotLabel]) {
          indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
        }
        indiv[actor].shots[shotLabel].points++;
      }
      if (actor && /O|N/.test(point.notation)) {
        indiv[actor].errors++;
        
        const notation = point.notation;
        const hand = notation.match(/^[FB]/)?.[0] || "";
        const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
        const shotLabel = hand + shot;
        
        if (!indiv[actor].shots[shotLabel]) {
          indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
        }
        indiv[actor].shots[shotLabel].errors++;
      }

      // Serve logic for tie breaks
      const servingPlayerName = point.server as string | undefined;
      if (!servingPlayerName) return;
      
      const serverTeam = actorToTeam(servingPlayerName);
      if (!serverTeam) return;
      
      const receiverTeam = serverTeam === "A" ? "B" : "A";
      
      // In tie breaks, we don't track service info (1st/2nd serve)
      // For simplicity, treat all tie break serves as first serves
      const isServiceAce = /SrA/i.test(point.notation);
      const isDoubleFault = /DF/i.test(point.notation);
      
      firstServeAttempts[serverTeam]++;
      indiv[servingPlayerName].firstServeAttempts++;
      
      if (!isDoubleFault) {
        firstServeMakes[serverTeam]++;
        indiv[servingPlayerName].firstServeMakes++;
        
        // Track return stats
        const returnerFromPoint = point.returner as string | undefined;
        let receiverNames: string[];
        
        if (mode === "doubles" && returnerFromPoint) {
          receiverNames = [returnerFromPoint];
        } else if (mode === "singles") {
          receiverNames = [receiverTeam === "A" ? playerA : playerB];
        } else {
          receiverNames = receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
        }
        
        receiverNames.forEach((receiverName) => {
          indiv[receiverName].firstReturnOpportunities++;
          
          if (isServiceAce) {
            indiv[receiverName].firstReturnOut++;
          } else {
            indiv[receiverName].firstReturnIn++;
            
            if (point.player === receiverTeam) {
              indiv[receiverName].firstReturnPointsWon++;
            }
          }
        });

        if (point.player === serverTeam) {
          firstServeWins[serverTeam]++;
          indiv[servingPlayerName].firstServePoints++;
        }
      }
    });
  });

  // build per-player summary (including per-player serve-in %)
  const teamTotals = { A: totalPointsA, B: totalPointsB };
  const indivDetailed: Record<string, any> = {};
  for (const name of Object.keys(indiv)) {
    const data = indiv[name];
    const team = actorToTeam(name);
    const teamFirstMakes = team ? firstServeMakes[team] : 0;
    const teamSecondMakes = team ? secondServeMakes[team] : 0;
    const teamPoints = team ? teamTotals[team] : 0;

    indivDetailed[name] = {
      pointsMade: data.pointsMade,
      errors: data.errors,
      pointsShareOfTeamPct: teamPoints > 0 ? ((data.pointsMade / teamPoints) * 100).toFixed(1) + "%" : "0.0%",
      // server-point contributions (as before)
      firstServePoints: data.firstServePoints,
      firstServeContributionPct: data.firstServeAttempts > 0 ? ((data.firstServePoints / data.firstServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
      secondServePoints: data.secondServePoints,
      secondServeContributionPct: data.secondServeAttempts > 0 ? ((data.secondServePoints / data.secondServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
      // per-player serve-in rates + raw attempts/makes
      firstServeAttempts: data.firstServeAttempts,
      firstServeMakes: data.firstServeMakes,
      firstServeInPct: data.firstServeAttempts > 0 ? ((data.firstServeMakes / data.firstServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
      secondServeAttempts: data.secondServeAttempts,
      secondServeMakes: data.secondServeMakes,
      secondServeInPct: data.secondServeAttempts > 0 ? ((data.secondServeMakes / data.secondServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
      shots: data.shots,
      // Return stats
      firstReturnIn: data.firstReturnIn,
      firstReturnOut: data.firstReturnOut,
      firstReturnOpportunities: data.firstReturnOpportunities,
      firstReturnInPct: data.firstReturnOpportunities > 0 ? ((data.firstReturnIn / data.firstReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
      firstReturnPointsWon: data.firstReturnPointsWon,
      firstReturnWinPct: data.firstReturnOpportunities > 0 ? ((data.firstReturnPointsWon / data.firstReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
      secondReturnIn: data.secondReturnIn,
      secondReturnOut: data.secondReturnOut,
      secondReturnOpportunities: data.secondReturnOpportunities,
      secondReturnInPct: data.secondReturnOpportunities > 0 ? ((data.secondReturnIn / data.secondReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
      secondReturnPointsWon: data.secondReturnPointsWon,
      secondReturnWinPct: data.secondReturnOpportunities > 0 ? ((data.secondReturnPointsWon / data.secondReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
    };
  }

  return {
    totalPointsA,
    totalPointsB,
    errorsA,
    errorsB,
    firstServeAttempts,
    firstServeMakes,
    firstServeWins,
    secondServeAttempts,
    secondServeMakes,
    secondServeWins,
    indivDetailed,
    firstServeInPct: {
      A: firstServeAttempts.A ? ((firstServeMakes.A / firstServeAttempts.A) * 100).toFixed(1) : "0.0",
      B: firstServeAttempts.B ? ((firstServeMakes.B / firstServeAttempts.B) * 100).toFixed(1) : "0.0",
    },
    firstServeWinPct: {
      A: firstServeMakes.A ? ((firstServeWins.A / firstServeMakes.A) * 100).toFixed(1) : "0.0",
      B: firstServeMakes.B ? ((firstServeWins.B / firstServeMakes.B) * 100).toFixed(1) : "0.0",
    },
    secondServeInPct: {
      A: secondServeAttempts.A ? ((secondServeMakes.A / secondServeAttempts.A) * 100).toFixed(1) : "0.0",
      B: secondServeAttempts.B ? ((secondServeMakes.B / secondServeAttempts.B) * 100).toFixed(1) : "0.0",
    },
    secondServeWinPct: {
      A: secondServeMakes.A ? ((secondServeWins.A / secondServeMakes.A) * 100).toFixed(1) : "0.0",
      B: secondServeMakes.B ? ((secondServeWins.B / secondServeMakes.B) * 100).toFixed(1) : "0.0",
    },
  };
}
// function calculateStats() {
//   let totalPointsA = 0,
//     totalPointsB = 0;
//   let errorsA = 0,
//     errorsB = 0;

//   // Team serve aggregates
//   let firstServeAttempts = { A: 0, B: 0 };
//   let firstServeMakes = { A: 0, B: 0 };
//   let firstServeWins = { A: 0, B: 0 };
//   let secondServeAttempts = { A: 0, B: 0 };
//   let secondServeMakes = { A: 0, B: 0 };
//   let secondServeWins = { A: 0, B: 0 };

//   // Per-player tracking (includes serve attempts/makes)
//   const indiv: Record<
//     string,
//     {
//       pointsMade: number;
//       errors: number;
//       firstServePoints: number;
//       secondServePoints: number;
//       firstServeAttempts: number;
//       firstServeMakes: number;
//       secondServeAttempts: number;
//       secondServeMakes: number;
//       shots: Record<string, { points: number; errors: number }>;
//       firstReturnIn: number;
//       firstReturnOut: number;
//       firstReturnPointsWon: number;
//       firstReturnOpportunities: number;
//       secondReturnIn: number;
//       secondReturnOut: number;
//       secondReturnPointsWon: number;
//       secondReturnOpportunities: number;
//     }
//   > = {};

//   allPlayerNames().forEach((n) => {
//     indiv[n] = {
//       pointsMade: 0,
//       errors: 0,
//       firstServePoints: 0,
//       secondServePoints: 0,
//       firstServeAttempts: 0,
//       firstServeMakes: 0,
//       secondServeAttempts: 0,
//       secondServeMakes: 0,
//       shots: {},
//       firstReturnIn: 0,
//       firstReturnOut: 0,
//       firstReturnPointsWon: 0,
//       firstReturnOpportunities: 0,
//       secondReturnIn: 0,
//       secondReturnOut: 0,
//       secondReturnPointsWon: 0,
//       secondReturnOpportunities: 0,
//     };
//   });

//   games.forEach((game) => {
//     game.points.forEach((point, idx) => {
//       if (!point) return;

//       // team totals
//       if (point.player === "A") totalPointsA++;
//       else totalPointsB++;

//       // team errors (loser gets the 'error' count)
//       if (/O|N/.test(point.notation)) {
//         if (point.player === "A") errorsB++;
//         else errorsA++;
//       }

//       // actor-based counts (points/errors)
//       const actor = (point as any).actor as string | undefined;
//       if (actor && actorToTeam(actor) === point.player) {
//         indiv[actor].pointsMade++;
        
//         // Track shot type for points - extract shot from notation (e.g., "FLO" -> "L", "BSA" -> "S")
//         const notation = point.notation;
//         const hand = notation.match(/^[FB]/)?.[0] || "";
//         const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
//         const shotLabel = hand + shot; // e.g., "FL", "BS", "FV"
        
//         if (!indiv[actor].shots[shotLabel]) {
//           indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
//         }
//         indiv[actor].shots[shotLabel].points++;
//       }
//       if (actor && /O|N/.test(point.notation)) {
//         indiv[actor].errors++;
        
//         // Track shot type for errors
//         const notation = point.notation;
//         const hand = notation.match(/^[FB]/)?.[0] || "";
//         const shot = notation.replace(/^[FB]/, "").replace(/[AON]$/, "") || "Unknown";
//         const shotLabel = hand + shot; // e.g., "FL", "BS", "FV"
        
//         if (!indiv[actor].shots[shotLabel]) {
//           indiv[actor].shots[shotLabel] = { points: 0, errors: 0 };
//         }
//         indiv[actor].shots[shotLabel].errors++;
//       }

//       // Serve logic
//       const serverTeam = game.server; // 'A' | 'B'
//       const receiverTeam = serverTeam === "A" ? "B" : "A";
      
//       // If serverPlayer explicitly set (doubles) use it; otherwise, in singles attribute to that player
//       const servingPlayerName =
//         (game as any).serverPlayer ??
//         (mode === "singles" ? (serverTeam === "A" ? playerA : playerB) : undefined);

//       const isFirstServeGood = !game.serviceInfo[idx]; // true => 1st in, false => 1st missed -> 2nd serve
//       const isDoubleFault = /DF/i.test(point.notation); // double fault hit on this point?
//       const isServiceAce = /SrA/i.test(point.notation); // service ace

//       // --- Team-level serve attempts ---
//       firstServeAttempts[serverTeam]++;

//       // --- Individual-level: first serve attempt always increments for the server (if known) ---
//       if (servingPlayerName) {
//         indiv[servingPlayerName].firstServeAttempts++;
//       }

//       if (isFirstServeGood) {
//         // first serve was in
//         firstServeMakes[serverTeam]++;

//         if (servingPlayerName) {
//           indiv[servingPlayerName].firstServeMakes++;
//         }

//         // Track return stats for receiver(s)
//         const returnerFromPoint = (point as any).returner as string | undefined;
//         let receiverNames: string[];
        
//         if (mode === "doubles" && returnerFromPoint) {
//           // In doubles, use the specific returner if recorded
//           receiverNames = [returnerFromPoint];
//         } else if (mode === "singles") {
//           // In singles, use the receiving player
//           receiverNames = [receiverTeam === "A" ? playerA : playerB];
//         } else {
//           // Fallback: distribute to both players on receiving team (shouldn't happen if returner is always set)
//           receiverNames = receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
//         }
        
//         receiverNames.forEach((receiverName) => {
//           indiv[receiverName].firstReturnOpportunities++;
          
//           if (isServiceAce) {
//             // Return was out (couldn't return the ace)
//             indiv[receiverName].firstReturnOut++;
//           } else {
//             // Return was in
//             indiv[receiverName].firstReturnIn++;
            
//             // Check if receiver won the point
//             if (point.player === receiverTeam) {
//               indiv[receiverName].firstReturnPointsWon++;
//             }
//           }
//         });

//         if (point.player === serverTeam) {
//           // server's side won the point on 1st serve
//           firstServeWins[serverTeam]++;
//           if (servingPlayerName) indiv[servingPlayerName].firstServePoints++;
//         }
//       } else {
//         // first serve missed -> second serve happened (or DF)
//         secondServeAttempts[serverTeam]++;
//         if (servingPlayerName) {
//           indiv[servingPlayerName].secondServeAttempts++;
//         }

//         if (isDoubleFault) {
//           // double fault: second serve was missed — DO NOT increment secondServeMakes
//           // (point is awarded to receiver; we don't increment secondServeMakes or secondServeWins)
//           // note: we don't auto-increment indiv[servingPlayerName].errors here to avoid double-counting
//           // if an actor was already set; actor-based error handling remains in place above.
//         } else {
//           // second serve was in
//           secondServeMakes[serverTeam]++;
//           if (servingPlayerName) {
//             indiv[servingPlayerName].secondServeMakes++;
//           }

//           // Track return stats for receiver(s) on second serve
//           const returnerFromPoint = (point as any).returner as string | undefined;
//           let receiverNames: string[];
          
//           if (mode === "doubles" && returnerFromPoint) {
//             // In doubles, use the specific returner if recorded
//             receiverNames = [returnerFromPoint];
//           } else if (mode === "singles") {
//             // In singles, use the receiving player
//             receiverNames = [receiverTeam === "A" ? playerA : playerB];
//           } else {
//             // Fallback: distribute to both players on receiving team
//             receiverNames = receiverTeam === "A" ? [playerA1, playerA2] : [playerB1, playerB2];
//           }
          
//           receiverNames.forEach((receiverName) => {
//             indiv[receiverName].secondReturnOpportunities++;
            
//             if (isServiceAce) {
//               // Return was out (couldn't return the ace)
//               indiv[receiverName].secondReturnOut++;
//             } else {
//               // Return was in
//               indiv[receiverName].secondReturnIn++;
              
//               // Check if receiver won the point
//               if (point.player === receiverTeam) {
//                 indiv[receiverName].secondReturnPointsWon++;
//               }
//             }
//           });

//           if (point.player === serverTeam) {
//             // server's side won the point on 2nd serve
//             secondServeWins[serverTeam]++;
//             if (servingPlayerName) indiv[servingPlayerName].secondServePoints++;
//           }
//         }
//       }
//     });
//   });

//   // build per-player summary (including per-player serve-in %)
//   const teamTotals = { A: totalPointsA, B: totalPointsB };
//   const indivDetailed: Record<string, any> = {};
//   for (const name of Object.keys(indiv)) {
//     const data = indiv[name];
//     const team = actorToTeam(name);
//     const teamFirstMakes = team ? firstServeMakes[team] : 0;
//     const teamSecondMakes = team ? secondServeMakes[team] : 0;
//     const teamPoints = team ? teamTotals[team] : 0;

//     indivDetailed[name] = {
//       pointsMade: data.pointsMade,
//       errors: data.errors,
//       pointsShareOfTeamPct: teamPoints > 0 ? ((data.pointsMade / teamPoints) * 100).toFixed(1) + "%" : "0.0%",
//       // server-point contributions (as before)
//       firstServePoints: data.firstServePoints,
//       firstServeContributionPct: data.firstServeAttempts > 0 ? ((data.firstServePoints / data.firstServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       secondServePoints: data.secondServePoints,
//       secondServeContributionPct: data.secondServeAttempts > 0 ? ((data.secondServePoints / data.secondServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       // per-player serve-in rates + raw attempts/makes
//       firstServeAttempts: data.firstServeAttempts,
//       firstServeMakes: data.firstServeMakes,
//       firstServeInPct: data.firstServeAttempts > 0 ? ((data.firstServeMakes / data.firstServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       secondServeAttempts: data.secondServeAttempts,
//       secondServeMakes: data.secondServeMakes,
//       secondServeInPct: data.secondServeAttempts > 0 ? ((data.secondServeMakes / data.secondServeAttempts) * 100).toFixed(1) + "%" : "0.0%",
//       shots: data.shots,
//       // Return stats
//       firstReturnIn: data.firstReturnIn,
//       firstReturnOut: data.firstReturnOut,
//       firstReturnOpportunities: data.firstReturnOpportunities,
//       firstReturnInPct: data.firstReturnOpportunities > 0 ? ((data.firstReturnIn / data.firstReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//       firstReturnPointsWon: data.firstReturnPointsWon,
//       firstReturnWinPct: data.firstReturnOpportunities > 0 ? ((data.firstReturnPointsWon / data.firstReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//       secondReturnIn: data.secondReturnIn,
//       secondReturnOut: data.secondReturnOut,
//       secondReturnOpportunities: data.secondReturnOpportunities,
//       secondReturnInPct: data.secondReturnOpportunities > 0 ? ((data.secondReturnIn / data.secondReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//       secondReturnPointsWon: data.secondReturnPointsWon,
//       secondReturnWinPct: data.secondReturnOpportunities > 0 ? ((data.secondReturnPointsWon / data.secondReturnOpportunities) * 100).toFixed(1) + "%" : "0.0%",
//     };
//   }

//   return {
//     totalPointsA,
//     totalPointsB,
//     errorsA,
//     errorsB,
//     firstServeAttempts,
//     firstServeMakes,
//     firstServeWins,
//     secondServeAttempts,
//     secondServeMakes,
//     secondServeWins,
//     indivDetailed,
//     firstServeInPct: {
//       A: firstServeAttempts.A ? ((firstServeMakes.A / firstServeAttempts.A) * 100).toFixed(1) : "0.0",
//       B: firstServeAttempts.B ? ((firstServeMakes.B / firstServeAttempts.B) * 100).toFixed(1) : "0.0",
//     },
//     firstServeWinPct: {
//       A: firstServeMakes.A ? ((firstServeWins.A / firstServeMakes.A) * 100).toFixed(1) : "0.0",
//       B: firstServeMakes.B ? ((firstServeWins.B / firstServeMakes.B) * 100).toFixed(1) : "0.0",
//     },
//     secondServeInPct: {
//       A: secondServeAttempts.A ? ((secondServeMakes.A / secondServeAttempts.A) * 100).toFixed(1) : "0.0",
//       B: secondServeAttempts.B ? ((secondServeMakes.B / secondServeAttempts.B) * 100).toFixed(1) : "0.0",
//     },
//     secondServeWinPct: {
//       A: secondServeMakes.A ? ((secondServeWins.A / secondServeMakes.A) * 100).toFixed(1) : "0.0",
//       B: secondServeMakes.B ? ((secondServeWins.B / secondServeMakes.B) * 100).toFixed(1) : "0.0",
//     },
//   };
// }
  const stats = calculateStats();

  function shortName(n?: string) {
    if (!n) return "";
    if (n.length <= 4) return n;
    return n.split(" ").map((s) => s[0]).join("") || n.slice(0, 4);
  }

  // === PDF Export ===
function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Tennis Match Report", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(mode === "singles" ? `Player A: ${playerA} | Player B: ${playerB}` : `Team A: ${playerA1}/${playerA2} | Team B: ${playerB1}/${playerB2}`, 20, 40);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 55);

    // Summary
    autoTable(doc, {
      startY: 70,
      head: [["Metric", "Team A", "Team B"]],
      body: [
        ["Points Won", stats.totalPointsA, stats.totalPointsB],
        ["Errors", stats.errorsA, stats.errorsB],
        ["1st Serve Makes", stats.firstServeMakes.A, stats.firstServeMakes.B],
        ["1st Serve In %", stats.firstServeInPct.A + "%", stats.firstServeInPct.B + "%"],
        ["1st Serve Win %", stats.firstServeWinPct.A + "%", stats.firstServeWinPct.B + "%"],
        ["2nd Serve Makes", stats.secondServeMakes.A, stats.secondServeMakes.B],
        ["2nd Serve In %", stats.secondServeInPct.A + "%", stats.secondServeInPct.B + "%"],
        ["2nd Serve Win %", stats.secondServeWinPct.A + "%", stats.secondServeWinPct.B + "%"],
      ],
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    });

    // Scoresheet grid
    games.forEach((game, gi) => {
      const cols = game.totalBoxes;
      const rowA = ["Team A"], rowS = [game.serverPlayer], rowB = ["Team B"];
      for (let i = 0; i < cols; i++) {
        const pt = game.points[i] as any;
        rowA.push(pt?.player === "A" ? `${pt.notation}${pt.actor ? " (" + shortName(pt.actor) + ")" : ""}` : "");
        rowB.push(pt?.player === "B" ? `${pt.notation}${pt.actor ? " (" + shortName(pt.actor) + ")" : ""}` : "");
        rowS.push(game.serviceInfo[i] ? "2" : "");
      }
      autoTable(doc, {
        startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 100,
        head: [[`Game ${gi + 1}  (Score: ${game.gameScoreA}-${game.gameScoreB})`, ...Array(cols - 1).fill("")]],
        body: [rowA, rowS, rowB],
        styles: { fontSize: 8, halign: "center", cellWidth: 15 },
      });
    });

    // Individual stats
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["Player", "Pts", "Errors", "% of Team", "1st Serve Pts", "1st Serve Win%", "1st Serve makes", "1st Serve In %", "2nd Serve Pts", "2nd Serve Win%", "2nd Serve makes", "2nd Serve In %"]],
      body: Object.entries(stats.indivDetailed).map(([n, s]: any) => [n, s.pointsMade, s.errors, s.pointsShareOfTeamPct, s.firstServePoints, s.firstServeContributionPct, s.firstServeMakes, s.firstServeInPct, s.secondServePoints, s.secondServeContributionPct, s.secondServeMakes, s.secondServeInPct]),
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      styles: { fontSize: 10 },
    });

    doc.save("match_report.pdf");
  }

  return (
    <div className="container">
      <h1>Tennis Scoresheet (Web)</h1>
      {/* Mode selection */}
      <div style={{ marginBottom: 12 }}>
        <label><input type="radio" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
        <label style={{ marginLeft: 12 }}><input type="radio" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
      </div>

      {/* Player inputs */}
      {mode === "singles" ? (
        <div className="players">
          <div><label>Player A:</label><input value={playerA} onChange={(e) => setPlayerA(e.target.value)} /></div>
          <div><label>Player B:</label><input value={playerB} onChange={(e) => setPlayerB(e.target.value)} /></div>
        </div>
      ) : (
        <div className="players">
          <div><label>A1:</label><input value={playerA1} onChange={(e) => setPlayerA1(e.target.value)} /></div>
          <div><label>A2:</label><input value={playerA2} onChange={(e) => setPlayerA2(e.target.value)} /></div>
          <div><label>B1:</label><input value={playerB1} onChange={(e) => setPlayerB1(e.target.value)} /></div>
          <div><label>B2:</label><input value={playerB2} onChange={(e) => setPlayerB2(e.target.value)} /></div>
        </div>
      )}

      <div className="controls">
        <button className="btn" onClick={addGame}>Add Game</button>
        <button className="btn" onClick={addTieBreak}>Add Tie Break</button>
        <button className="btn secondary" onClick={clearSheet}>Clear Sheet</button>
        <button className="btn" onClick={exportPDF}>Export PDF</button>
      </div>

      <div className="scoresheet">
        {games.map((game, gi) => (
          <div className="game-row" key={gi}>
            <div className="points-container">
              {/* Player A row */}
              <div className="player-section">
                <div className={"server-marker " + (game.server === "A" ? "active" : "")} onClick={() => toggleServer(gi, "A")}>{initials.A}</div>
                {Array.from({ length: game.totalBoxes }).map((_, i) => {
                  const p = game.points[i];
                  const filled = p && p.player === "A";
                  return (
                    <div key={"A-" + i} className={"point-box " + (filled ? "filled " : "")} onClick={() => openPointInput(gi, i, "A")}>
                      {filled ? <span className="notation">{(p as any).notation}</span> : null}
                      {filled && (p as any)?.actor ? <span className="actor">{shortName((p as any).actor)}</span> : null}
                    </div>
                  );
                })}
              </div>

              {/* Service row */}
              <div className="service-section">
                <div style={{ width: 25 }}>
                  {mode === "doubles" && game.server === "A" && (
                    <select value={game.serverPlayer || ""} onChange={(e) => setServer(gi, "A", e.target.value)}>
                      <option value="">--Select--</option>
                      <option value={playerA1}>{playerA1}</option>
                      <option value={playerA2}>{playerA2}</option>
                    </select>
                  )}
                  {mode === "doubles" && game.server === "B" && (
                    <select value={game.serverPlayer || ""} onChange={(e) => setServer(gi, "B", e.target.value)}>
                      <option value="">--Select--</option>
                      <option value={playerB1}>{playerB1}</option>
                      <option value={playerB2}>{playerB2}</option>
                    </select>
                  )}
                </div>
                {Array.from({ length: game.totalBoxes }).map((_, i) => (
                  <div key={"S-" + i} className="service-box" onClick={() => toggleServiceInfo(gi, i)}>
                    {game.serviceInfo[i] ? "●" : ""}
                  </div>
                ))}
              </div>

              {/* Player B row */}
              <div className="player-section">
                <div className={"server-marker " + (game.server === "B" ? "active" : "")} onClick={() => toggleServer(gi, "B")}>{initials.B}</div>
                {Array.from({ length: game.totalBoxes }).map((_, i) => {
                  const p = game.points[i];
                  const filled = p && p.player === "B";
                  return (
                    <div key={"B-" + i} className={"point-box " + (filled ? "filled " : "")} onClick={() => openPointInput(gi, i, "B")}>
                      {filled ? <span className="notation">{(p as any).notation}</span> : null}
                      {filled && (p as any)?.actor ? <span className="actor">{shortName((p as any).actor)}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="game-score-container">
              <div className="score-inputs">
                <input className="score-inp" type="number" min={0} max={99} value={game.gameScoreA} onChange={(e) => updateGameScore(gi, "A", parseInt(e.target.value || "0", 10))} />
                <span className="hyphen">-</span>
                <input className="score-inp" type="number" min={0} max={99} value={game.gameScoreB} onChange={(e) => updateGameScore(gi, "B", parseInt(e.target.value || "0", 10))} />
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" style={{ background: "#28a745" }} onClick={() => addDeuceBoxes(gi)}>+</button>
                {game.totalBoxes > 8 && <button className="btn" style={{ background: "#dc3545" }} onClick={() => removeDeuceBoxes(gi)}>−</button>}
              </div>
            </div>
          </div>
        ))}

        {/* Tie Break Grids */}
{tieBreaks.map((tb, tbi) => (
  <div className="game-row" key={`tb-${tbi}`} style={{ marginTop: 20, background: '#fffacd' }}>
    <h3 style={{ gridColumn: '1 / -1', textAlign: 'center', margin: '8px 0' }}>Tie Break {tbi + 1}</h3>
    <div className="points-container">
      {/* Player A row */}
      <div className="player-section">
        <div className="server-marker">{initials.A}</div>
        {Array.from({ length: tb.totalBoxes }).map((_, i) => {
          const p = tb.points[i];
          const filled = p && p.player === "A";
          return (
            <div key={`tba-${i}`} className={"point-box " + (filled ? "filled " : "")} onClick={() => openTieBreakPointInput(tbi, i, "A")}>
              {filled ? (
                <>
                  <span className="actor" style={{ fontSize: '10px', display: 'block' }}>{p.server ? shortName(p.server) : ''}</span>
                  <span className="notation">{p.notation}</span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Player B row */}
      <div className="player-section">
        <div className="server-marker">{initials.B}</div>
        {Array.from({ length: tb.totalBoxes }).map((_, i) => {
          const p = tb.points[i];
          const filled = p && p.player === "B";
          return (
            <div key={`tbb-${i}`} className={"point-box " + (filled ? "filled " : "")} onClick={() => openTieBreakPointInput(tbi, i, "B")}>
              {filled ? (
                <>
                  <span className="actor" style={{ fontSize: '10px', display: 'block' }}>{p.server ? shortName(p.server) : ''}</span>
                  <span className="notation">{p.notation}</span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>

    <div className="game-score-container">
      <div className="score-inputs">
        <input className="score-inp" type="number" min={0} max={99} value={tb.scoreA} readOnly />
        <span className="hyphen">-</span>
        <input className="score-inp" type="number" min={0} max={99} value={tb.scoreB} readOnly />
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn" style={{ background: "#28a745" }} onClick={() => addTieBreakBoxes(tbi)}>+</button>
        {tb.totalBoxes > 12 && <button className="btn" style={{ background: "#dc3545" }} onClick={() => removeTieBreakBoxes(tbi)}>−</button>}
      </div>
    </div>
  </div>
))}
      </div>

      {/* Stats Panel */}
      <div className="stats-panel" role="region" aria-label="Match stats">
        <h2 style={{ textAlign: "center", marginBottom: 12 }}>Match Stats</h2>

        {/* Team stats */}
        <table className="stats-table">
          <thead>
            <tr>
              <th></th>
              <th>{mode === "singles" ? playerA : "Team A"}</th>
              <th>{mode === "singles" ? playerB : "Team B"}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Points Won</td>
              <td>{stats.totalPointsA}</td>
              <td>{stats.totalPointsB}</td>
            </tr>
            <tr>
              <td>Errors (Out/Net)</td>
              <td>{stats.errorsA}</td>
              <td>{stats.errorsB}</td>
            </tr>
            <tr>
              <td>First Serve Makes</td>
              <td>{stats.firstServeMakes.A}</td>
              <td>{stats.firstServeMakes.B}</td>
            </tr>
            <tr>
              <td>First Serve In %</td>
              <td>{stats.firstServeInPct.A}%</td>
              <td>{stats.firstServeInPct.B}%</td>
            </tr>
            <tr>
              <td>First Serve Win %</td>
              <td>{stats.firstServeWinPct.A}%</td>
              <td>{stats.firstServeWinPct.B}%</td>
            </tr>
            <tr>
              <td>Second Serve Makes</td>
              <td>{stats.secondServeMakes.A}</td>
              <td>{stats.secondServeMakes.B}</td>
            </tr>
            <tr>
              <td>Second Serve In %</td>
              <td>{stats.secondServeInPct.A}%</td>
              <td>{stats.secondServeInPct.B}%</td>
            </tr>
            <tr>
              <td>Second Serve Win %</td>
              <td>{stats.secondServeWinPct.A}%</td>
              <td>{stats.secondServeWinPct.B}%</td>
            </tr>
          </tbody>
        </table>

        {/* Individual stats (doubles) or per-player (singles) */}
        <h3 style={{ marginTop: 16 }}>{mode === "singles" ? "Player Stats" : "Individual Stats (per player)"}</h3>

        <table className="stats-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Points</th>
              <th>% of Team</th>
              <th>Errors</th>
              <th>1st Serve Pts</th>
              <th>1st Serve Win %</th>
              <th>1st Serve Makes</th>
              <th>1st Serve Attempts</th>
              <th>1st Serve in %</th>
              <th>2nd Serve Pts</th>
              <th>2nd Serve Win %</th>
              <th>2nd Serve Makes</th>
              <th>2nd Serve Attempts</th>
              <th>2nd Serve in %</th>
              <th>1st Return In</th>
<th>1st Return In %</th>
<th>1st Return Pts Won</th>
<th>1st Return Win %</th>
<th>2nd Return In</th>
<th>2nd Return In %</th>
<th>2nd Return Pts Won</th>
<th>2nd Return Win %</th>
            </tr>
          </thead>
          <tbody>
            {allPlayerNames().map((n) => {
              const d = stats.indivDetailed?.[n];
              if (!d) {
                return (
                  <tr key={n}>
                    <td>{n}</td>
                    <td>0</td>
                    <td>0.0%</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0.0%</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0.0%</td>
                    <td>0</td>
                    <td>0.0%</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0.0%</td>
                                        <td>0</td>
                    <td>0.0%</td>
                    <td>0</td>
                    <td>0.0%</td>
                                        <td>0</td>
                    <td>0.0%</td>
                    <td>0</td>
                    <td>0.0%</td>
                  </tr>
                );
              }
              return (
                <tr key={n}>
                  <td>{n}</td>
                  <td>{d.pointsMade}</td>
                  <td>{d.pointsShareOfTeamPct}</td>
                  <td>{d.errors}</td>
                  <td>{d.firstServePoints}</td>
                  <td>{d.firstServeContributionPct}</td>
                  <td>{d.firstServeMakes}</td>
                  <td>{d.firstServeAttempts}</td>
                  <td>{d.firstServeInPct}</td>
                  <td>{d.secondServePoints}</td>
                  <td>{d.secondServeContributionPct}</td>
                  <td>{d.secondServeMakes}</td>
                  <td>{d.secondServeAttempts}</td>
                  <td>{d.secondServeInPct}</td>
                  <td>{d.firstReturnIn}</td>
<td>{d.firstReturnInPct}</td>
<td>{d.firstReturnPointsWon}</td>
<td>{d.firstReturnWinPct}</td>
<td>{d.secondReturnIn}</td>
<td>{d.secondReturnInPct}</td>
<td>{d.secondReturnPointsWon}</td>
<td>{d.secondReturnWinPct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 style={{ marginTop: 16 }}>Points & Errors by Shot Type</h3>
{allPlayerNames().map((n) => {
  const d = stats.indivDetailed?.[n];
  const shots = d?.shots || {};
  const shotEntries = Object.entries(shots);
  if (shotEntries.length === 0) return null;
  return (
    <div key={n} style={{ marginTop: 12 }}>
      <h4>{n}</h4>
      <table className="stats-table" style={{ marginTop: 4 }}>
        <thead>
          <tr>
            <th>Shot</th>
            <th>Points</th>
            <th>Errors</th>
          </tr>
        </thead>
        <tbody>
          {shotEntries.map(([shot, vals]) => (
            <tr key={shot}>
              <td>{shot}</td>
              <td>{vals.points}</td>
              <td>{vals.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
})}

      </div>

      {/* Modal */}
      {modal?.open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{ textAlign: "center" }}>Enter Point Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Hand</h4>
                <div style={{ display: "flex", gap: 6 }}>
                  {["F", "B"].map((v) => (
                    <button
                      key={v}
                      className={"btn"}
                      style={{ background: selected.hand === v ? "#007bff" : "#fff", color: selected.hand === v ? "#fff" : "#007bff", padding: "6px 10px" }}
                      onClick={() => setSelected((s) => ({ ...s, hand: v }))}
                    >
                      {v === "F" ? "Forehand" : "Backhand"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Shot Type</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["S", "V", "R", "C", "P", "L", "Sr", "DF", "Sm", "Dr"].map((v) => (
                    <button
                      key={v}
                      className={"btn"}
                      style={{ background: selected.shot === v ? "#007bff" : "#fff", color: selected.shot === v ? "#fff" : "#007bff", padding: "6px 8px" }}
                      onClick={() => setSelected((s) => ({ ...s, shot: v }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Result</h4>
                <div style={{ display: "flex", gap: 6 }}>
                  {["A", "O", "N"].map((v) => (
                    <button
                      key={v}
                      className={"btn"}
                      style={{ background: selected.result === v ? "#007bff" : "#fff", color: selected.result === v ? "#fff" : "#007bff", padding: "6px 12px" }}
                      onClick={() => setSelected((s) => ({ ...s, result: v }))}
                    >
                      {v === "A" ? "Ace" : v === "O" ? "Out" : "Net"}
                    </button>
                  ))}
                </div>
              </div>

{/* Server selection - only in tie breaks */}
{modal?.isTieBreak && (
  <div style={{ gridColumn: "1 / -1", border: "1px solid #ddd", padding: 8, borderRadius: 4, background: '#fffacd' }}>
    <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Who Served? (Required for Tie Break)</h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {allPlayerNames().map((p) => (
        <button
          key={p}
          className={"btn"}
          style={{ background: selected.server === p ? "#007bff" : "#fff", color: selected.server === p ? "#fff" : "#007bff", padding: "6px 10px" }}
          onClick={() => setSelected((s) => ({ ...s, server: p }))}
        >
          {p}
        </button>
      ))}
    </div>
  </div>
)}

              {/* Actor selection: always available (works for singles & doubles) */}
              <div style={{ gridColumn: "1 / -1", border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Last Actor (who made the final action)</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {allPlayerNames().map((p) => (
                    <button
                      key={p}
                      className={"btn"}
                      style={{ background: selected.actor === p ? "#007bff" : "#fff", color: selected.actor === p ? "#fff" : "#007bff", padding: "6px 10px" }}
                      onClick={() => setSelected((s) => ({ ...s, actor: p }))}
                    >
                      {p}
                    </button>
                  ))}
                  <button className="btn" style={{ background: selected.actor ? "#fff" : "#007bff", color: selected.actor ? "#007bff" : "#fff", padding: "6px 10px" }} onClick={() => setSelected((s) => ({ ...s, actor: undefined }))}>
                    None
                  </button>
                </div>
              </div>

{/* Returner selection: only in doubles mode when opponent is serving */}
{/* {mode === "doubles" && modal && (
  (() => {
    const serverTeam = games[modal.gameIndex]?.server;
    // Show returner selection for BOTH teams in doubles
    const receiverTeamA = serverTeam === "B" ? "A" : null;
    const receiverTeamB = serverTeam === "A" ? "B" : null;
    
    let receiverNames: string[] = [];
    if (receiverTeamA) {
      receiverNames = [playerA1, playerA2];
    } else if (receiverTeamB) {
      receiverNames = [playerB1, playerB2];
    }
    
    if (receiverNames.length > 0) {
      return (
        <div style={{ gridColumn: "1 / -1", border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Who Returned?</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {receiverNames.map((p) => (
              <button
                key={p}
                className={"btn"}
                style={{ background: selected.returner === p ? "#007bff" : "#fff", color: selected.returner === p ? "#fff" : "#007bff", padding: "6px 10px" }}
                onClick={() => setSelected((s) => ({ ...s, returner: p }))}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  })()
)} */}
{/* Returner selection: in doubles mode */}
{mode === "doubles" && modal && !modal.isTieBreak && (
  (() => {
    const serverTeam = games[modal.gameIndex]?.server;
    const receiverTeamA = serverTeam === "B" ? "A" : null;
    const receiverTeamB = serverTeam === "A" ? "B" : null;
    
    let receiverNames: string[] = [];
    if (receiverTeamA) {
      receiverNames = [playerA1, playerA2];
    } else if (receiverTeamB) {
      receiverNames = [playerB1, playerB2];
    }
    
    if (receiverNames.length > 0) {
      return (
        <div style={{ gridColumn: "1 / -1", border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Who Returned?</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {receiverNames.map((p) => (
              <button
                key={p}
                className={"btn"}
                style={{ background: selected.returner === p ? "#007bff" : "#fff", color: selected.returner === p ? "#fff" : "#007bff", padding: "6px 10px" }}
                onClick={() => setSelected((s) => ({ ...s, returner: p }))}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  })()
)}

{/* Returner selection for tie breaks - all players available */}
{mode === "doubles" && modal?.isTieBreak && (
  <div style={{ gridColumn: "1 / -1", border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
    <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Who Returned?</h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {allPlayerNames().map((p) => (
        <button
          key={p}
          className={"btn"}
          style={{ background: selected.returner === p ? "#007bff" : "#fff", color: selected.returner === p ? "#fff" : "#007bff", padding: "6px 10px" }}
          onClick={() => setSelected((s) => ({ ...s, returner: p }))}
        >
          {p}
        </button>
      ))}
    </div>
  </div>
)}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn secondary" onClick={cancelInput}>
                Cancel
              </button>
              <button className="btn" onClick={confirmInput}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
