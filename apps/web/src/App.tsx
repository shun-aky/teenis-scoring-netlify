import React, { useMemo, useState } from 'react'
import * as Core from '@tennis/core'
import jsPDF from 'jspdf'
import 'jspdf-autotable' // for nicer tables
import autoTable from 'jspdf-autotable'

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

  // === Controls ===
  function addGame() { setGames(gs => [...gs, Core.createGame()]) }
  function clearSheet() { setGames([]) }
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

  // === Stats ===
  function calculateStats() {
    let totalPointsA = 0, totalPointsB = 0
    let errorsA = 0, errorsB = 0
    let firstServeAttempts = { A: 0, B: 0 }
    let firstServeMakes = { A: 0, B: 0 }
    let firstServeWins = { A: 0, B: 0 }
    let secondServeAttempts = { A: 0, B: 0 }
    let secondServeMakes = { A: 0, B: 0 }
    let secondServeWins = { A: 0, B: 0 }

    games.forEach(game => {
      game.points.forEach((point, idx) => {
        if (!point) return

        if (point.player === 'A') totalPointsA++
        else totalPointsB++

        if (/O|N/.test(point.notation)) {
          if (point.player === 'A') errorsB++
          else errorsA++
        }

        const server = game.server
        const isFirstServeGood = !game.serviceInfo[idx]

        firstServeAttempts[server]++
        if (isFirstServeGood) {
          firstServeMakes[server]++
          if (point.player === server) firstServeWins[server]++
        } else {
          secondServeAttempts[server]++
          secondServeMakes[server]++
          if (point.player === server) secondServeWins[server]++
        }
      })
    })

    return {
      totalPointsA, totalPointsB,
      errorsA, errorsB,
      firstServeAttempts, firstServeMakes, firstServeWins,
      secondServeAttempts, secondServeMakes, secondServeWins,
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
      }
    }
  }

  const stats = calculateStats()

    // === PDF Export (styled with autoTable, safe finalY) ===
    function exportPDF() {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text("Tennis Match Report", 105, 20, { align: "center" })

      doc.setFontSize(12)
      doc.text(`Player A: ${playerA}`, 20, 40)
      doc.text(`Player B: ${playerB}`, 20, 55)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 70)

      // Games
      games.forEach((game, gi) => {
        const rows = game.points.map((pt, i) => {
          if (!pt) return []
          const service = !game.serviceInfo[i] ? "1st In" : "2nd In"
          return [i+1, pt.player === "A" ? playerA : playerB, pt.notation, service]
        }).filter(r => r.length)

        if (rows.length) {
          autoTable(doc, {
            startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 90,
            head: [[`Game ${gi+1} (Server: ${game.server})`, "", "", ""]],
            body: [["", `${playerA}: ${game.gameScoreA}`, `${playerB}: ${game.gameScoreB}`, ""]],
            theme: 'plain'
          })
          autoTable(doc, {
            startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : 110,
            head: [["#", "Winner", "Notation", "Service"]],
            body: rows,
            styles: { fontSize: 10, halign: "center" },
            headStyles: { fillColor: [200,200,200], textColor: 20, halign: "center" }
          })
        }
      })

      // Summary
      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 120,
        head: [["Metric", playerA, playerB]],
        body: [
          ["Points Won", stats.totalPointsA, stats.totalPointsB],
          ["Errors (Out/Net)", stats.errorsA, stats.errorsB],
          ["First Serve Makes", stats.firstServeMakes.A, stats.firstServeMakes.B],
          ["First Serve In %", stats.firstServeInPct.A + "%", stats.firstServeInPct.B + "%"],
          ["First Serve Win %", stats.firstServeWinPct.A + "%", stats.firstServeWinPct.B + "%"],
          ["Second Serve Makes", stats.secondServeMakes.A, stats.secondServeMakes.B],
          ["Second Serve In %", stats.secondServeInPct.A + "%", stats.secondServeInPct.B + "%"],
          ["Second Serve Win %", stats.secondServeWinPct.A + "%", stats.secondServeWinPct.B + "%"]
        ],
        styles: { fontSize: 11, halign: "center" },
        headStyles: { fillColor: [41,128,185], textColor: [255,255,255], halign: "center" },
        columnStyles: { 0: { halign: "left" } }
      })

      doc.save("match_report.pdf")
    }


  return (
    <div className="container">
      <h1>Tennis Scoresheet (Web)</h1>
      <div className="players">
        <div className="player-input">
          <label>Player A:</label>
          <input value={playerA} onChange={e=>setPlayerA(e.target.value)} />
        </div>
        <div className="player-input">
          <label>Player B:</label>
          <input value={playerB} onChange={e=>setPlayerB(e.target.value)} />
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
            <div className="points-container">
              {/* Player A row */}
              <div className="player-section">
                <div className={"server-marker " + (game.server==='A'?'active':'')}
                     onClick={()=>toggleServer(gi,'A')}>{initials.A}</div>
                {Array.from({length:game.totalBoxes}).map((_,i)=>(
                  <div key={'A-'+i}
                       className={"point-box " + ((game.points[i]?.player==='A')?'filled':'')}
                       onClick={()=>openPointInput(gi,i,'A')}>
                    {game.points[i]?.player==='A'?game.points[i]?.notation:''}
                  </div>
                ))}
              </div>

              {/* Service row */}
              <div className="service-section">
                <div style={{width:25}}/>
                {Array.from({length:game.totalBoxes}).map((_,i)=>(
                  <div key={'S-'+i}
                       className="service-box"
                       onClick={()=>toggleServiceInfo(gi,i)}>
                    {game.serviceInfo[i]?'●':''}
                  </div>
                ))}
              </div>

              {/* Player B row */}
              <div className="player-section">
                <div className={"server-marker " + (game.server==='B'?'active':'')}
                     onClick={()=>toggleServer(gi,'B')}>{initials.B}</div>
                {Array.from({length:game.totalBoxes}).map((_,i)=>(
                  <div key={'B-'+i}
                       className={"point-box " + ((game.points[i]?.player==='B')?'filled':'')}
                       onClick={()=>openPointInput(gi,i,'B')}>
                    {game.points[i]?.player==='B'?game.points[i]?.notation:''}
                  </div>
                ))}
              </div>
            </div>

            {/* Game score */}
            <div className="game-score-container">
              <div className="score-inputs">
                <input className="score-inp" type="number" min={0} max={99}
                       value={game.gameScoreA}
                       onChange={e=>updateGameScore(gi,'A',parseInt(e.target.value||'0'))}/>
                <span className="hyphen">-</span>
                <input className="score-inp" type="number" min={0} max={99}
                       value={game.gameScoreB}
                       onChange={e=>updateGameScore(gi,'B',parseInt(e.target.value||'0'))}/>
              </div>
              <div style={{marginTop:8}}>
                <button className="btn" style={{background:'#28a745'}} onClick={()=>addDeuceBoxes(gi)}>+</button>
                {game.totalBoxes>8 &&
                  <button className="btn" style={{background:'#dc3545'}} onClick={()=>removeDeuceBoxes(gi)}>−</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <h2 style={{ textAlign: "center", marginBottom: 12 }}>Match Stats</h2>
        <table className="stats-table">
          <thead>
            <tr><th></th><th>{playerA}</th><th>{playerB}</th></tr>
          </thead>
          <tbody>
            <tr><td>Points Won</td><td>{stats.totalPointsA}</td><td>{stats.totalPointsB}</td></tr>
            <tr><td>Errors (Out/Net)</td><td>{stats.errorsA}</td><td>{stats.errorsB}</td></tr>
            <tr><td>First Serve Makes</td><td>{stats.firstServeMakes.A}</td><td>{stats.firstServeMakes.B}</td></tr>
            <tr><td>First Serve In %</td><td>{stats.firstServeInPct.A}%</td><td>{stats.firstServeInPct.B}%</td></tr>
            <tr><td>First Serve Win %</td><td>{stats.firstServeWinPct.A}%</td><td>{stats.firstServeWinPct.B}%</td></tr>
            <tr><td>Second Serve Makes</td><td>{stats.secondServeMakes.A}</td><td>{stats.secondServeMakes.B}</td></tr>
            <tr><td>Second Serve In %</td><td>{stats.secondServeInPct.A}%</td><td>{stats.secondServeInPct.B}%</td></tr>
            <tr><td>Second Serve Win %</td><td>{stats.secondServeWinPct.A}%</td><td>{stats.secondServeWinPct.B}%</td></tr>
          </tbody>
        </table>
      </div>


      {/* Modal */}
      {modal?.open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Enter Point Details</h3>
            <div style={{display:'grid',gap:12}}>
              <div>
                <h4>Hand</h4>
                {['F','B'].map(v=>
                  <button key={v} className="btn"
                    style={{background:selected.hand===v?'#007bff':'#fff',
                            color:selected.hand===v?'#fff':'#007bff'}}
                    onClick={()=>setSelected(s=>({...s,hand:v}))}>
                    {v==='F'?'Forehand':'Backhand'}
                  </button>)}
              </div>
              <div>
                <h4>Shot</h4>
                {['S','V','R','C','P','L','Sr','DF','Sm','Dr'].map(v=>
                  <button key={v} className="btn"
                    style={{background:selected.shot===v?'#007bff':'#fff',
                            color:selected.shot===v?'#fff':'#007bff'}}
                    onClick={()=>setSelected(s=>({...s,shot:v}))}>
                    {v}
                  </button>)}
              </div>
              <div>
                <h4>Result</h4>
                {['A','O','N'].map(v=>
                  <button key={v} className="btn"
                    style={{background:selected.result===v?'#007bff':'#fff',
                            color:selected.result===v?'#fff':'#007bff'}}
                    onClick={()=>setSelected(s=>({...s,result:v}))}>
                    {v==='A'?'Ace':v==='O'?'Out':'Net'}
                  </button>)}
              </div>
            </div>
            <div style={{marginTop:12}}>
              <button className="btn secondary" onClick={cancelInput}>Cancel</button>
              <button className="btn" onClick={confirmInput}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
