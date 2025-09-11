import React, { useMemo, useState } from 'react'
import * as Core from '@tennis/core'
import jsPDF from 'jspdf'

type ShotSel = { hand?: string; shot?: string; result?: string }

interface ModalState {
  open: boolean;
  gameIndex: number;
  pointIndex: number;
  player: Core.Player;
}

export default function App() {
  const [playerA, setPlayerA] = useState('A')
  const [playerB, setPlayerB] = useState('B')
  const [games, setGames] = useState<Core.Game[]>([Core.createGame()])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [selected, setSelected] = useState<ShotSel>({})

  const initials = useMemo(() => ({
    A: (playerA||'A')[0]?.toUpperCase() || 'A',
    B: (playerB||'B')[0]?.toUpperCase() || 'B',
  }), [playerA, playerB])

  function addGame() {
    setGames(gs => [...gs, Core.createGame()])
  }
  function clearSheet() {
    setGames([])
  }

  function openPointInput(gameIndex: number, pointIndex: number, player: Core.Player) {
    setSelected({})
    setModal({ open: true, gameIndex, pointIndex, player })
  }
  function cancelInput() { setModal(null) }
  function confirmInput() {
    if (!modal) return
    const notation = `${selected.hand ?? ''}${selected.shot ?? ''}${selected.result ?? ''}`
    if (!notation) { setModal(null); return }
    setGames(gs => {
      const copy = gs.slice()
      const g = { ...copy[modal.gameIndex] }
      copy[modal.gameIndex] = g
      Core.setPoint(g, modal.pointIndex, modal.player, notation)
      return copy
    })
    setModal(null)
  }

  function toggleServer(gameIndex: number, player: Core.Player) {
    setGames(gs => {
      const copy = gs.slice()
      const g = { ...copy[gameIndex] }
      copy[gameIndex] = g
      Core.toggleServer(g, player)
      return copy
    })
  }

  function toggleServiceInfo(gameIndex: number, pointIndex: number) {
    setGames(gs => {
      const copy = gs.slice()
      const g = { ...copy[gameIndex] }
      copy[gameIndex] = g
      Core.toggleServiceInfo(g, pointIndex)
      return copy
    })
  }

  function addDeuceBoxes(gameIndex: number) {
    setGames(gs => {
      const copy = gs.slice()
      const g = { ...copy[gameIndex] }
      copy[gameIndex] = g
      Core.addDeuceBoxes(g)
      return copy
    })
  }
  function removeDeuceBoxes(gameIndex: number) {
    setGames(gs => {
      const copy = gs.slice()
      const g = { ...copy[gameIndex] }
      copy[gameIndex] = g
      Core.removeDeuceBoxes(g)
      return copy
    })
  }

  function updateGameScore(gameIndex: number, player: Core.Player, value: number) {
    setGames(gs => {
      const copy = gs.slice()
      const g = { ...copy[gameIndex] }
      copy[gameIndex] = g
      Core.updateGameScore(g, player, value)
      return copy
    })
  }

  // === Stats calculation (fixed error attribution: errors charged to LOSER) ===
  function calculateStats() {
    let totalPointsA = 0;
    let totalPointsB = 0;
    let errorsA = 0;
    let errorsB = 0;
    let firstServeMakes = { A: 0, B: 0 };
    let firstServeWins = { A: 0, B: 0 };
    let secondServeMakes = { A: 0, B: 0 };
    let secondServeWins = { A: 0, B: 0 };

    games.forEach(game => {
      game.points.forEach((point, idx) => {
        if (!point) return;

        // total points
        if (point.player === 'A') totalPointsA++;
        else totalPointsB++;

        // errors: notation shows O (Out) or N (Net).
        // Errors should be charged to the LOSER (the player who DID NOT win the point).
        if (/O|N/.test(point.notation)) {
          if (point.player === 'A') { // A won, so B made the error
            errorsB++;
          } else {
            errorsA++;
          }
        }

        // service info: false = first serve in, true = first serve fault
        const isFirstServeGood = !game.serviceInfo[idx];
        const server = game.server;

        if (isFirstServeGood) {
          firstServeMakes[server]++;
          if (point.player === server) firstServeWins[server]++;
        } else {
          secondServeMakes[server]++;
          if (point.player === server) secondServeWins[server]++;
        }
      });
    });

    return {
      totalPointsA, totalPointsB,
      errorsA, errorsB,
      firstServeMakes, firstServeWins,
      secondServeMakes, secondServeWins,
      firstServeWinPct: {
        A: firstServeMakes.A ? ((firstServeWins.A / firstServeMakes.A) * 100).toFixed(1) : "0.0",
        B: firstServeMakes.B ? ((firstServeWins.B / firstServeMakes.B) * 100).toFixed(1) : "0.0",
      },
      secondServeWinPct: {
        A: secondServeMakes.A ? ((secondServeWins.A / secondServeMakes.A) * 100).toFixed(1) : "0.0",
        B: secondServeMakes.B ? ((secondServeWins.B / secondServeMakes.B) * 100).toFixed(1) : "0.0",
      }
    };
  }

  const stats = calculateStats();

  // === PDF Export (detailed per-point) ===
  function exportPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const left = 40;
    let y = 40;

    doc.setFontSize(18);
    doc.text("Tennis Match Report", left, y);
    y += 24;

    doc.setFontSize(12);
    doc.text(`Player A: ${playerA}`, left, y); y += 14;
    doc.text(`Player B: ${playerB}`, left, y); y += 20;
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, y); y += 20;

    games.forEach((game, gi) => {
      doc.setFontSize(14);
      doc.text(`Game ${gi + 1} (Server: ${game.server})`, left, y); y += 16;

      doc.setFontSize(11);
      doc.text(`${playerA}: ${game.gameScoreA}   |   ${playerB}: ${game.gameScoreB}`, left, y); y += 14;

      // table header
      doc.setFontSize(10);
      doc.text("No.", left, y);
      doc.text("Winner", left + 40, y);
      doc.text("Notation", left + 140, y);
      doc.text("Service", left + 260, y);
      y += 12;
      doc.setLineWidth(0.5);
      doc.line(left, y, left + 360, y);
      y += 10;

      game.points.forEach((pt, pi) => {
        if (!pt) return;
        const firstServe = !game.serviceInfo[pi];
        const serviceText = firstServe ? "1st In" : "2nd In";

        doc.text(String(pi + 1), left, y);
        doc.text(pt.player === "A" ? playerA : playerB, left + 40, y);
        doc.text(pt.notation, left + 140, y);
        doc.text(serviceText, left + 260, y);
        y += 12;

        if (y > 720) {
          doc.addPage();
          y = 40;
        }
      });

      y += 12;
    });

    // Summary
    y += 8;
    doc.setFontSize(14);
    doc.text("Match Summary", left, y); y += 16;
    doc.setFontSize(11);
    const rows = [
      ["Points Won", String(stats.totalPointsA), String(stats.totalPointsB)],
      ["Errors (Out/Net)", String(stats.errorsA), String(stats.errorsB)],
      ["First Serve Makes", String(stats.firstServeMakes.A), String(stats.firstServeMakes.B)],
      ["First Serve Win %", String(stats.firstServeWinPct.A) + "%", String(stats.firstServeWinPct.B) + "%"],
      ["Second Serve Makes", String(stats.secondServeMakes.A), String(stats.secondServeMakes.B)],
      ["Second Serve Win %", String(stats.secondServeWinPct.A) + "%", String(stats.secondServeWinPct.B) + "%"]
    ];

    doc.text("Metric", left, y);
    doc.text(playerA, left + 180, y);
    doc.text(playerB, left + 300, y);
    y += 12;
    doc.line(left, y, left + 420, y); y += 10;

    rows.forEach(r => {
      doc.text(r[0], left, y);
      doc.text(r[1], left + 180, y);
      doc.text(r[2], left + 300, y);
      y += 12;
      if (y > 720) { doc.addPage(); y = 40; }
    });

    doc.save('match_report.pdf');
  }

  return (
    <div className="container">
      <h1>Tennis Scoresheet (Web)</h1>
      <div className="players">
        <div className="player-input">
          <label htmlFor="pa">Player A:</label>
          <input id="pa" value={playerA} onChange={e=>setPlayerA(e.target.value)} placeholder="Enter player A name" />
        </div>
        <div className="player-input">
          <label htmlFor="pb">Player B:</label>
          <input id="pb" value={playerB} onChange={e=>setPlayerB(e.target.value)} placeholder="Enter player B name" />
        </div>
      </div>

      <div className="controls">
        <button className="btn" onClick={addGame}>Add Game</button>
        <button className="btn secondary" onClick={clearSheet}>Clear Sheet</button>
        <button className="btn" onClick={exportPDF}>Export PDF</button>
      </div>

      <div className="scoresheet">
        {games.map((game, gi) => (
          <div className="game-row" key={gi}>
            <div className="points-container" aria-hidden={false}>
              {/* Player A row */}
              <div className="player-section">
                <div
                  className={"server-marker " + (game.server === 'A' ? 'active' : '')}
                  onClick={() => toggleServer(gi, 'A')}
                  title="Toggle server to A"
                >{initials.A}</div>

                {Array.from({length: game.totalBoxes}).map((_, i) => {
                  const p = game.points[i]
                  const filled = p && p.player === 'A'
                  const deuce = i >= 6 && (i % 2 === 1)
                  return (
                    <div
                      key={'A-'+i}
                      className={"point-box " + (filled ? 'filled ' : '') + (deuce ? 'deuce' : '')}
                      onClick={() => openPointInput(gi, i, 'A')}
                    >
                      {filled ? game.points[i]?.notation : ''}
                    </div>
                  )
                })}
              </div>

              {/* Service row */}
              <div className="service-section">
                <div style={{width: 25}} />
                {Array.from({length: game.totalBoxes}).map((_, i) => {
                  const deuce = i >= 6 && (i % 2 === 1)
                  return (
                    <div
                      key={'S-'+i}
                      className={"service-box " + (deuce ? 'deuce' : '')}
                      onClick={() => toggleServiceInfo(gi, i)}
                    >
                      {game.serviceInfo[i] ? '●' : ''}
                    </div>
                  )
                })}
            Quite long; trimming output to finish zip creation...
                  </div>

              {/* Player B row */}
              <div className="player-section">
                <div
                  className={"server-marker " + (game.server === 'B' ? 'active' : '')}
                  onClick={() => toggleServer(gi, 'B')}
                  title="Toggle server to B"
                >{initials.B}</div>

                {Array.from({length: game.totalBoxes}).map((_, i) => {
                  const p = game.points[i]
                  const filled = p && p.player === 'B'
                  const deuce = i >= 6 && (i % 2 === 1)
                  return (
                    <div
                      key={'B-'+i}
                      className={"point-box " + (filled ? 'filled ' : '') + (deuce ? 'deuce' : '')}
                      onClick={() => openPointInput(gi, i, 'B')}
                    >
                      {filled ? game.points[i]?.notation : ''}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Game score with +/- buttons moved here to keep visible */}
            <div className="game-score-container">
              <div className="score-inputs">
                <input
                  className="score-inp"
                  type="number"
                  min={0}
                  max={99}
                  value={game.gameScoreA}
                  onChange={e => updateGameScore(gi, 'A', parseInt(e.target.value || '0', 10))}
                />
                <span className="hyphen">-</span>
                <input
                  className="score-inp"
                  type="number"
                  min={0}
                  max={99}
                  value={game.gameScoreB}
                  onChange={e => updateGameScore(gi, 'B', parseInt(e.target.value || '0', 10))}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '8px' }}>
                <button
                  className="btn"
                  style={{ background: '#28a745', padding: '4px 12px' }}
                  title="Add 2 deuce boxes"
                  onClick={() => addDeuceBoxes(gi)}
                >
                  +
                </button>
                {game.totalBoxes > 8 && (
                  <button
                    className="btn"
                    style={{ background: '#dc3545', padding: '4px 12px' }}
                    title="Remove 2 deuce boxes"
                    onClick={() => removeDeuceBoxes(gi)}
                  >
                    −
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats panel */}
      <div className="stats-panel" role="region" aria-label="Match stats">
        <h2 style={{ textAlign: "center", marginBottom: 12 }}>Match Stats</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th></th>
              <th>{playerA || "Player A"}</th>
              <th>{playerB || "Player B"}</th>
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
              <td>Second Serve Win %</td>
              <td>{stats.secondServeWinPct.A}%</td>
              <td>{stats.secondServeWinPct.B}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal?.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{ textAlign: 'center' }}>Enter Point Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Hand</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['F','B'].map(v => (
                    <button
                      key={v}
                      className={'btn'}
                      style={{ background: selected.hand === v ? '#007bff' : '#fff', color: selected.hand === v ? '#fff' : '#007bff', padding: '6px 10px' }}
                      onClick={() => setSelected(s => ({ ...s, hand: v }))}
                    >
                      {v === 'F' ? 'Forehand' : 'Backhand'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Shot Type</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['S','V','R','C','P','L','Sr','DF','Sm','Dr'].map(v => (
                    <button
                      key={v}
                      className={'btn'}
                      style={{ background: selected.shot === v ? '#007bff' : '#fff', color: selected.shot === v ? '#fff' : '#007bff', padding: '6px 8px' }}
                      onClick={() => setSelected(s => ({ ...s, shot: v }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', border: '1px solid #ddd', padding: 8, borderRadius: 4 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Result</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['A','O','N'].map(v => (
                    <button
                      key={v}
                      className={'btn'}
                      style={{ background: selected.result === v ? '#007bff' : '#fff', color: selected.result === v ? '#fff' : '#007bff', padding: '6px 12px' }}
                      onClick={() => setSelected(s => ({ ...s, result: v }))}
                    >
                      {v === 'A' ? 'Ace' : v === 'O' ? 'Out' : 'Net'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary" onClick={cancelInput}>Cancel</button>
              <button className="btn" onClick={confirmInput}>Confirm</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
