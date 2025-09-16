import React, { useMemo, useState } from "react";
import * as Core from "@tennis/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ShotSel = { hand?: string; shot?: string; result?: string; actor?: string };

interface ModalState {
  open: boolean;
  gameIndex: number;
  pointIndex: number;
  player: Core.Player;
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

  function clearSheet() {
    setGames([]);
  }

  function openPointInput(gameIndex: number, pointIndex: number, player: Core.Player) {
    setSelected({});
    setModal({ open: true, gameIndex, pointIndex, player });
  }
  function cancelInput() {
    setModal(null);
  }
  function confirmInput() {
    if (!modal) return;
    const notation = `${selected.hand ?? ""}${selected.shot ?? ""}${selected.result ?? ""}`;
    if (!notation) {
      setModal(null);
      return;
    }
    setGames((gs) => {
      const copy = gs.slice();
      const g = { ...copy[modal.gameIndex] };
      copy[modal.gameIndex] = g;
      // set point via core helper
      Core.setPoint(g, modal.pointIndex, modal.player, notation);
      // attach actor (use `any` to avoid TS type mismatch on Core.Point)
      const pt = (g.points[modal.pointIndex] as any) || {};
      pt.actor = selected.actor;
      g.points[modal.pointIndex] = pt;
      return copy;
    });
    setModal(null);
  }

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

  // helper: map actor name to team letter "A"|"B" or null
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

  // All player names for actor selection
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
        g.serverPlayer = undefined;
      }
      copy[gameIndex] = g;
      return copy;
    });
  }


  // === Stats (teams + per-player detailed contributions) ===
  function calculateStats() {
    // Team-level
    let totalPointsA = 0,
      totalPointsB = 0;
    let errorsA = 0,
      errorsB = 0;
    let firstServeAttempts = { A: 0, B: 0 };
    let firstServeMakes = { A: 0, B: 0 };
    let firstServeWins = { A: 0, B: 0 };
    let secondServeAttempts = { A: 0, B: 0 };
    let secondServeMakes = { A: 0, B: 0 };
    let secondServeWins = { A: 0, B: 0 };

    // Individual tracking (actor-based). We'll initialize for all possible players.
    const indiv: Record<
      string,
      {
        pointsMade: number; // points contributed (actor was on winning side)
        errors: number; // actor committed error (O or N)
        firstServePoints: number; // actor contributed to a point that was won on 1st serve
        secondServePoints: number; // actor contributed to a point that was won on 2nd serve
      }
    > = {};

    allPlayerNames().forEach((n) => {
      indiv[n] = { pointsMade: 0, errors: 0, firstServePoints: 0, secondServePoints: 0 };
    });

    // iterate
    games.forEach((game) => {
      game.points.forEach((point, idx) => {
        if (!point) return;
        // team totals
        if (point.player === "A") totalPointsA++;
        else totalPointsB++;

        // team errors (loser gets the error)
        if (/O|N/.test(point.notation)) {
          if (point.player === "A") errorsB++;
          else errorsA++;
        }

        // actor details
        const actor = (point as any).actor as string | undefined;
        const actorTeam = actorToTeam(actor);

        if (actor) {
          // ensure exist
          if (!indiv[actor]) indiv[actor] = { pointsMade: 0, errors: 0, firstServePoints: 0, secondServePoints: 0 };
          // if actor made final action and was on winning team
          if (actorTeam && actorTeam === point.player) {
            indiv[actor].pointsMade++;
          }
          // if actor committed an error (notation shows O or N), count it
          if (/O|N/.test(point.notation)) {
            // actor is the one who performed last action -> they committed the error
            indiv[actor].errors++;
          }
        }

        // service info (team-level)
        const server = game.server; // 'A' or 'B'
        const isFirstServeGood = !game.serviceInfo[idx];

        firstServeAttempts[server]++;
        if (isFirstServeGood) {
          firstServeMakes[server]++;
          if (point.player === server) firstServeWins[server]++;
          // attribute first-serve-win involvement to actor if actor belongs to winning team
          if (actor && actorToTeam(actor) === point.player) {
            indiv[actor] = indiv[actor] || { pointsMade: 0, errors: 0, firstServePoints: 0, secondServePoints: 0 };
            indiv[actor].firstServePoints++;
          }
        } else {
          secondServeAttempts[server]++;
          secondServeMakes[server]++;
          if (point.player === server) secondServeWins[server]++;
          if (actor && actorToTeam(actor) === point.player) {
            indiv[actor] = indiv[actor] || { pointsMade: 0, errors: 0, firstServePoints: 0, secondServePoints: 0 };
            indiv[actor].secondServePoints++;
          }
        }
      });
    });

    // build per-individual percentage summaries
    const indivDetailed: Record<
      string,
      {
        pointsMade: number;
        errors: number;
        pointsShareOfTeamPct: string;
        firstServePoints: number;
        firstServeContributionPct: string;
        secondServePoints: number;
        secondServeContributionPct: string;
      }
    > = {};

    const teamTotals = { A: totalPointsA, B: totalPointsB };

    for (const name of Object.keys(indiv)) {
      const data = indiv[name];
      const team = actorToTeam(name);
      const teamFirstMakes = team ? firstServeMakes[team] : 0;
      const teamSecondMakes = team ? secondServeMakes[team] : 0;
      const teamPoints = team ? teamTotals[team] : 0;

      indivDetailed[name] = {
        pointsMade: data.pointsMade,
        errors: data.errors,
        pointsShareOfTeamPct:
          teamPoints > 0 ? ((data.pointsMade / teamPoints) * 100).toFixed(1) + "%" : "0.0%",
        firstServePoints: data.firstServePoints,
        firstServeContributionPct:
          teamFirstMakes > 0 ? ((data.firstServePoints / teamFirstMakes) * 100).toFixed(1) + "%" : "0.0%",
        secondServePoints: data.secondServePoints,
        secondServeContributionPct:
          teamSecondMakes > 0 ? ((data.secondServePoints / teamSecondMakes) * 100).toFixed(1) + "%" : "0.0%",
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
      indiv,
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
    } as const;
  }

  const stats = calculateStats();

  // === PDF Export ===
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Tennis Match Report", 105, 20, { align: "center" });

    doc.setFontSize(12);
    if (mode === "singles") {
      doc.text(`Player A: ${playerA}`, 20, 40);
      doc.text(`Player B: ${playerB}`, 20, 55);
    } else {
      doc.text(`Team A: ${playerA1} / ${playerA2}`, 20, 40);
      doc.text(`Team B: ${playerB1} / ${playerB2}`, 20, 55);
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 70);

    // Team summary
    autoTable(doc, {
      startY: 90,
      head: [["Metric", mode === "singles" ? playerA : "Team A", mode === "singles" ? playerB : "Team B"]],
      body: [
        ["Points Won", stats.totalPointsA, stats.totalPointsB],
        ["Errors (Out/Net)", stats.errorsA, stats.errorsB],
        ["First Serve Makes", stats.firstServeMakes.A, stats.firstServeMakes.B],
        ["First Serve In %", stats.firstServeInPct.A + "%", stats.firstServeInPct.B + "%"],
        ["First Serve Win %", stats.firstServeWinPct.A + "%", stats.firstServeWinPct.B + "%"],
        ["Second Serve Makes", stats.secondServeMakes.A, stats.secondServeMakes.B],
        ["Second Serve In %", stats.secondServeInPct.A + "%", stats.secondServeInPct.B + "%"],
        ["Second Serve Win %", stats.secondServeWinPct.A + "%", stats.secondServeWinPct.B + "%"],
      ],
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      styles: { halign: "center" },
      columnStyles: { 0: { halign: "left" } },
    });

    // Per-game detailed point list (winner, notation, actor, service)
    games.forEach((game, gi) => {
      const rows = game.points
        .map((pt, i) => {
          if (!pt) return null;
          const service = !game.serviceInfo[i] ? "1st In" : "2nd In";
          const winnerLabel = pt.player === "A" ? (mode === "singles" ? playerA : "Team A") : mode === "singles" ? playerB : "Team B";
          return [String(i + 1), winnerLabel, pt.notation, (pt as any).actor ?? "", service];
        })
        .filter(Boolean) as string[][];

      if (rows.length) {
        autoTable(doc, {
          startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : undefined,
          head: [[`Game ${gi + 1} (Server: ${game.server})`, "", "", "", ""]],
          body: [["", `${mode === "singles" ? playerA : "Team A"}: ${game.gameScoreA}`, `${mode === "singles" ? playerB : "Team B"}: ${game.gameScoreB}`, "", ""]],
          theme: "plain",
        });

        autoTable(doc, {
          startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 6 : undefined,
          head: [["#", "Winner", "Notation", "Actor", "Service"]],
          body: rows,
          headStyles: { fillColor: [200, 200, 200] },
          styles: { fontSize: 10, halign: "center" },
        });
      }
    });

    // Individual stats (if doubles show all 4; if singles show two)
    const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : undefined;
    const indivNames = allPlayerNames();
    const indivRows = indivNames.map((n) => {
      const d = stats.indivDetailed?.[n];
      if (!d) {
        return [n, "0", "0.0%", "0", "0 (0.0%)", "0", "0 (0.0%)"];
      }
      return [
        n,
        String(d.pointsMade),
        d.pointsShareOfTeamPct,
        String(d.errors),
        `${d.firstServePoints} (${d.firstServeContributionPct})`,
        String(d.secondServePoints),
        `${d.secondServeContributionPct}`,
      ];
    });

    autoTable(doc, {
      startY,
      head: [["Player", "Points", "% of Team", "Errors", "1stServePts (share)", "2ndServePts", "2ndServe (share)"]],
      body: indivRows,
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      styles: { fontSize: 10, halign: "center" },
      columnStyles: { 0: { halign: "left" } },
    });

    doc.save("match_report.pdf");
  }

  // short helper for display inside boxes (trim long names)
  function shortName(n?: string) {
    if (!n) return "";
    if (n.length <= 4) return n;
    return n.split(" ").map((s) => s[0]).join("") || n.slice(0, 4);
  }

  return (
    <div className="container">
      <h1>Tennis Scoresheet (Web)</h1>

      {/* Mode */}
      <div style={{ marginBottom: 12 }}>
        <label>
          <input type="radio" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles
        </label>
        <label style={{ marginLeft: 12 }}>
          <input type="radio" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles
        </label>
      </div>

      {/* Player inputs */}
      {mode === "singles" ? (
        <div className="players">
          <div className="player-input">
            <label>Player A:</label>
            <input value={playerA} onChange={(e) => setPlayerA(e.target.value)} />
          </div>
          <div className="player-input">
            <label>Player B:</label>
            <input value={playerB} onChange={(e) => setPlayerB(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="players">
          <div className="player-input">
            <label>A1:</label>
            <input value={playerA1} onChange={(e) => setPlayerA1(e.target.value)} />
          </div>
          <div className="player-input">
            <label>A2:</label>
            <input value={playerA2} onChange={(e) => setPlayerA2(e.target.value)} />
          </div>
          <div className="player-input">
            <label>B1:</label>
            <input value={playerB1} onChange={(e) => setPlayerB1(e.target.value)} />
          </div>
          <div className="player-input">
            <label>B2:</label>
            <input value={playerB2} onChange={(e) => setPlayerB2(e.target.value)} />
          </div>
        </div>
      )}

      <div className="controls">
        <button className="btn" onClick={addGame}>
          Add Game
        </button>
        <button className="btn secondary" onClick={clearSheet}>
          Clear Sheet
        </button>
        <button className="btn" onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {/* Scoresheet */}
      <div className="scoresheet">
        {games.map((game, gi) => (
          <div className="game-row" key={gi}>
            <div className="points-container">
              {/* Player A row */}
              <div className="player-section">
                <div className={"server-marker " + (game.server === "A" ? "active" : "")} onClick={() => toggleServer(gi, "A")}>
                  {initials.A}
                </div>
                {Array.from({ length: game.totalBoxes }).map((_, i) => {
                  const p = game.points[i];
                  const filled = p && p.player === "A";
                  const deuce = i >= 6 && i % 2 === 1;
                  return (
                    <div
                      key={"A-" + i}
                      className={"point-box " + (filled ? "filled " : "") + (deuce ? "deuce" : "")}
                      onClick={() => openPointInput(gi, i, "A")}
                    >
                      {filled ? <span className="notation">{(p as any).notation}</span> : null}
                      {(p as any)?.actor ? <span className="actor">{shortName((p as any).actor)}</span> : null}
                    </div>
                  );
                })}
              </div>

              {/* Service row */}
              <div className="service-section">
                {mode === "doubles" && game.server === "A" && (
                  <div>
                    <label>Server:</label>
                    <select
                      value={game.serverPlayer || ""}
                      onChange={(e) => setServer(gi, "A", e.target.value)}
                    >
                      <option value="">--Select--</option>
                      <option value={playerA1}>{playerA1}</option>
                      <option value={playerA2}>{playerA2}</option>
                    </select>
                  </div>
                )}
                {mode === "doubles" && game.server === "B" && (
                  <div>
                    <label>Server:</label>
                    <select
                      value={game.serverPlayer || ""}
                      onChange={(e) => setServer(gi, "B", e.target.value)}
                    >
                      <option value="">--Select--</option>
                      <option value={playerB1}>{playerB1}</option>
                      <option value={playerB2}>{playerB2}</option>
                    </select>
                  </div>
                )}
              </div>


              {/* Player B row */}
              <div className="player-section">
                <div className={"server-marker " + (game.server === "B" ? "active" : "")} onClick={() => toggleServer(gi, "B")}>
                  {initials.B}
                </div>
                {Array.from({ length: game.totalBoxes }).map((_, i) => {
                  const p = game.points[i];
                  const filled = p && p.player === "B";
                  const deuce = i >= 6 && i % 2 === 1;
                  return (
                    <div
                      key={"B-" + i}
                      className={"point-box " + (filled ? "filled " : "") + (deuce ? "deuce" : "")}
                      onClick={() => openPointInput(gi, i, "B")}
                    >
                      {filled ? <span className="notation">{(p as any).notation}</span> : null}
                      {(p as any)?.actor ? <span className="actor">{shortName((p as any).actor)}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Game score */}
            <div className="game-score-container">
              <div className="score-inputs">
                <input
                  className="score-inp"
                  type="number"
                  min={0}
                  max={99}
                  value={game.gameScoreA}
                  onChange={(e) => updateGameScore(gi, "A", parseInt(e.target.value || "0", 10))}
                />
                <span className="hyphen">-</span>
                <input
                  className="score-inp"
                  type="number"
                  min={0}
                  max={99}
                  value={game.gameScoreB}
                  onChange={(e) => updateGameScore(gi, "B", parseInt(e.target.value || "0", 10))}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "row", gap: "8px", marginTop: "8px" }}>
                <button className="btn" style={{ background: "#28a745", padding: "4px 12px" }} title="Add 2 deuce boxes" onClick={() => addDeuceBoxes(gi)}>
                  +
                </button>
                {game.totalBoxes > 8 && (
                  <button className="btn" style={{ background: "#dc3545", padding: "4px 12px" }} title="Remove 2 deuce boxes" onClick={() => removeDeuceBoxes(gi)}>
                    −
                  </button>
                )}
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
              <th>1st Serve %</th>
              <th>2nd Serve Pts</th>
              <th>2nd Serve %</th>
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
                  <td>{d.secondServePoints}</td>
                  <td>{d.secondServeContributionPct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
