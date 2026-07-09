import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import { Upload, Activity, Moon, Gauge, Users, FileSpreadsheet } from 'lucide-react';
import './style.css';

const samplePlayers = [
  { name: 'Demo Atleta 1', recovery: 72, sleep: 7.4, strain: 12.8, km: 6.3, sprint: 14, acc: 4, dec: 6 },
  { name: 'Demo Atleta 2', recovery: 38, sleep: 5.8, strain: 16.1, km: 8.1, sprint: 21, acc: 9, dec: 11 },
  { name: 'Demo Atleta 3', recovery: 55, sleep: 6.6, strain: 10.2, km: 5.4, sprint: 8, acc: 2, dec: 3 }
];

function numberFrom(value) {
  if (value === undefined || value === null) return 0;
  const cleaned = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function findValue(row, keys) {
  const normalized = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase().trim()] = row[key];
    return acc;
  }, {});
  for (const key of keys) {
    const found = Object.keys(normalized).find(k => k.includes(key));
    if (found) return normalized[found];
  }
  return undefined;
}

function parseWhoop(rows) {
  return rows.map((row, i) => ({
    name: findValue(row, ['name', 'athlete', 'atleta', 'user']) || `Atleta ${i + 1}`,
    recovery: numberFrom(findValue(row, ['recovery', 'recupero'])),
    sleep: numberFrom(findValue(row, ['sleep', 'sonno', 'asleep'])),
    strain: numberFrom(findValue(row, ['strain', 'carico']))
  }));
}

function parseGps(rows) {
  return rows.map((row, i) => ({
    name: findValue(row, ['name', 'athlete', 'atleta', 'player']) || `Atleta ${i + 1}`,
    km: numberFrom(findValue(row, ['km', 'distance', 'distanza'])) || numberFrom(findValue(row, ['meter', 'metri'])) / 1000,
    sprint: numberFrom(findValue(row, ['sprint'])),
    acc: numberFrom(findValue(row, ['acc', 'accelerazioni', 'acceleration'])),
    dec: numberFrom(findValue(row, ['dec', 'decelerazioni', 'deceleration']))
  }));
}

function status(player) {
  if (player.recovery && player.recovery < 40) return 'red';
  if (player.sleep && player.sleep < 6) return 'yellow';
  if (player.acc > 8 || player.dec > 8) return 'yellow';
  return 'green';
}

function App() {
  const [whoop, setWhoop] = useState([]);
  const [gps, setGps] = useState([]);
  const [message, setMessage] = useState('Carica i CSV oppure usa i dati demo già presenti.');

  const players = useMemo(() => {
    if (!whoop.length && !gps.length) return samplePlayers;
    const map = new Map();
    whoop.forEach(p => map.set(p.name, { name: p.name, recovery: p.recovery, sleep: p.sleep, strain: p.strain, km: 0, sprint: 0, acc: 0, dec: 0 }));
    gps.forEach(p => {
      const old = map.get(p.name) || { name: p.name, recovery: 0, sleep: 0, strain: 0 };
      map.set(p.name, { ...old, km: p.km, sprint: p.sprint, acc: p.acc, dec: p.dec });
    });
    return [...map.values()];
  }, [whoop, gps]);

  const totals = useMemo(() => ({
    players: players.length,
    recovery: Math.round(players.reduce((s, p) => s + (p.recovery || 0), 0) / players.length || 0),
    sleep: (players.reduce((s, p) => s + (p.sleep || 0), 0) / players.length || 0).toFixed(1),
    km: players.reduce((s, p) => s + (p.km || 0), 0).toFixed(1)
  }), [players]);

  function handleFile(file, type) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (type === 'whoop') setWhoop(parseWhoop(result.data));
        if (type === 'gps') setGps(parseGps(result.data));
        setMessage(`${file.name} caricato correttamente.`);
      },
      error: () => setMessage('Errore nel caricamento del CSV.')
    });
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Versione 1.0</p>
          <h1>Davide Player Analytics</h1>
          <p>Dashboard semplice per leggere CSV WHOOP e GPS K-Sport e trasformarli in dati utili.</p>
        </div>
        <div className="badge">Coach mode</div>
      </header>

      <section className="upload-grid">
        <label className="upload-card">
          <Upload />
          <strong>Carica CSV WHOOP</strong>
          <span>Recovery, sonno, strain</span>
          <input type="file" accept=".csv" onChange={e => e.target.files[0] && handleFile(e.target.files[0], 'whoop')} />
        </label>
        <label className="upload-card">
          <FileSpreadsheet />
          <strong>Carica CSV K-Sport GPS</strong>
          <span>Km, sprint, accelerazioni, decelerazioni</span>
          <input type="file" accept=".csv" onChange={e => e.target.files[0] && handleFile(e.target.files[0], 'gps')} />
        </label>
      </section>

      <p className="message">{message}</p>

      <section className="cards">
        <div className="card"><Users /><span>Atleti</span><strong>{totals.players}</strong></div>
        <div className="card"><Activity /><span>Recovery medio</span><strong>{totals.recovery}%</strong></div>
        <div className="card"><Moon /><span>Sonno medio</span><strong>{totals.sleep}h</strong></div>
        <div className="card"><Gauge /><span>Km totali</span><strong>{totals.km}</strong></div>
      </section>

      <section className="panel">
        <h2>Dashboard squadra</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Atleta</th><th>Stato</th><th>Recovery</th><th>Sonno</th><th>Strain</th><th>Km</th><th>Sprint</th><th>Acc &gt; 3,5</th><th>Dec &lt; -3,5</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => <tr key={p.name}>
                <td>{p.name}</td>
                <td><span className={`dot ${status(p)}`}></span></td>
                <td>{p.recovery || '-'}</td>
                <td>{p.sleep || '-'}</td>
                <td>{p.strain || '-'}</td>
                <td>{p.km || '-'}</td>
                <td>{p.sprint || '-'}</td>
                <td>{p.acc || '-'}</td>
                <td>{p.dec || '-'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
