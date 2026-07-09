import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import { Upload, Activity, Moon, Gauge, Users, HeartPulse, CalendarDays } from 'lucide-react';
import './style.css';

const samplePlayers = [
  { name: 'Demo Atleta', date: '2026-07-09', recovery: 97, hrv: 112, rhr: 44, sleep: 7.4, sleepScore: 79, strain: 0, respiration: 14.6, efficiency: 85 }
];

function numberFrom(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function getValue(row, key) {
  return row[key] ?? '';
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function minutesToHours(minutes) {
  const n = numberFrom(minutes);
  return n ? Number((n / 60).toFixed(1)) : 0;
}

function readCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: reject
    });
  });
}

function parseCicli(rows) {
  return rows.map((row, index) => ({
    id: `${formatDate(getValue(row, 'Ora di inizio ciclo'))}-${index}`,
    name: 'Atleta WHOOP',
    date: formatDate(getValue(row, 'Ora di inizio ciclo')),
    recovery: numberFrom(getValue(row, 'Punteggio di recupero %')),
    hrv: numberFrom(getValue(row, 'Variabilità della frequenza cardiaca (ms)')),
    rhr: numberFrom(getValue(row, 'Frequenza cardiaca a riposo (bpm)')),
    strain: numberFrom(getValue(row, 'Sforzo giornaliero')),
    spo2: numberFrom(getValue(row, 'Ossigeno nel sangue %')),
    skinTemp: numberFrom(getValue(row, 'Temp. cutanea (C)')),
    sleep: minutesToHours(getValue(row, 'Durata del sonno (min)')),
    sleepScore: numberFrom(getValue(row, 'Andamento del sonno %')),
    respiration: numberFrom(getValue(row, 'Frequenza respiratoria (rpm)')),
    efficiency: numberFrom(getValue(row, 'Efficienza del sonno %')),
    regularity: numberFrom(getValue(row, 'Regolarità del sonno %'))
  }));
}

function parseSonno(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const date = formatDate(getValue(row, 'Ora di inizio ciclo'));
    map.set(date, {
      date,
      sleep: minutesToHours(getValue(row, 'Durata del sonno (min)')),
      sleepScore: numberFrom(getValue(row, 'Andamento del sonno %')),
      respiration: numberFrom(getValue(row, 'Frequenza respiratoria (rpm)')),
      efficiency: numberFrom(getValue(row, 'Efficienza del sonno %')),
      regularity: numberFrom(getValue(row, 'Regolarità del sonno %')),
      rem: minutesToHours(getValue(row, 'Durata REM (min)')),
      deep: minutesToHours(getValue(row, 'Durata profondo (SWS) (min)')),
      awake: minutesToHours(getValue(row, 'Durata del risveglio (min)')),
      nap: String(getValue(row, 'Riposo breve')).toLowerCase() === 'true'
    });
  });
  return map;
}

function mergeWhoop(cicliRows, sonnoRows) {
  const sonnoByDate = parseSonno(sonnoRows);
  return parseCicli(cicliRows)
    .map((cycle) => ({ ...cycle, ...(sonnoByDate.get(cycle.date) || {}) }))
    .filter((row) => row.date !== '-')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function status(player) {
  if (player.recovery && player.recovery < 40) return 'red';
  if (player.sleep && player.sleep < 6) return 'yellow';
  if (player.strain && player.strain > 16) return 'yellow';
  return 'green';
}

function App() {
  const [cicliFile, setCicliFile] = useState(null);
  const [sonnoFile, setSonnoFile] = useState(null);
  const [players, setPlayers] = useState(samplePlayers);
  const [message, setMessage] = useState('Carica cicli_fisiologici.csv e sonno.csv, poi premi Analizza.');

  const totals = useMemo(() => ({
    days: players.length,
    recovery: Math.round(players.reduce((s, p) => s + (p.recovery || 0), 0) / players.length || 0),
    sleep: (players.reduce((s, p) => s + (p.sleep || 0), 0) / players.length || 0).toFixed(1),
    strain: (players.reduce((s, p) => s + (p.strain || 0), 0) / players.length || 0).toFixed(1)
  }), [players]);

  async function analyzeFiles() {
    if (!cicliFile || !sonnoFile) {
      setMessage('Mancano i file: devi caricare sia cicli_fisiologici.csv sia sonno.csv.');
      return;
    }

    try {
      const [cicliRows, sonnoRows] = await Promise.all([readCsv(cicliFile), readCsv(sonnoFile)]);
      const merged = mergeWhoop(cicliRows, sonnoRows);
      setPlayers(merged.length ? merged : samplePlayers);
      setMessage(`Import completato: ${merged.length} giorni WHOOP elaborati.`);
    } catch (error) {
      setMessage('Errore durante la lettura dei CSV. Controlla i file e riprova.');
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Versione 1.1</p>
          <h1>Davide Player Analytics</h1>
          <p>Import WHOOP semplificato: cicli fisiologici + sonno. Niente caos, solo dati utili.</p>
        </div>
        <div className="badge">Coach mode</div>
      </header>

      <section className="upload-grid">
        <label className="upload-card">
          <Upload />
          <strong>Cicli fisiologici</strong>
          <span>{cicliFile ? cicliFile.name : 'Carica cicli_fisiologici.csv'}</span>
          <input type="file" accept=".csv" onChange={e => setCicliFile(e.target.files?.[0] || null)} />
        </label>

        <label className="upload-card">
          <Moon />
          <strong>Sonno</strong>
          <span>{sonnoFile ? sonnoFile.name : 'Carica sonno.csv'}</span>
          <input type="file" accept=".csv" onChange={e => setSonnoFile(e.target.files?.[0] || null)} />
        </label>
      </section>

      <div className="actions">
        <button onClick={analyzeFiles}>Analizza file WHOOP</button>
        <p className="message">{message}</p>
      </div>

      <section className="cards">
        <div className="card"><CalendarDays /><span>Giorni importati</span><strong>{totals.days}</strong></div>
        <div className="card"><Activity /><span>Recovery medio</span><strong>{totals.recovery}%</strong></div>
        <div className="card"><Moon /><span>Sonno medio</span><strong>{totals.sleep}h</strong></div>
        <div className="card"><Gauge /><span>Strain medio</span><strong>{totals.strain}</strong></div>
      </section>

      <section className="panel">
        <h2>Dashboard WHOOP</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Stato</th>
                <th>Recovery</th>
                <th>HRV</th>
                <th>FC riposo</th>
                <th>Strain</th>
                <th>Sonno</th>
                <th>Sonno %</th>
                <th>Efficienza</th>
                <th>Resp.</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id || p.date}>
                  <td>{p.date}</td>
                  <td><span className={`dot ${status(p)}`}></span></td>
                  <td>{p.recovery ? `${p.recovery}%` : '-'}</td>
                  <td>{p.hrv || '-'}</td>
                  <td>{p.rhr || '-'}</td>
                  <td>{p.strain || '-'}</td>
                  <td>{p.sleep ? `${p.sleep}h` : '-'}</td>
                  <td>{p.sleepScore ? `${p.sleepScore}%` : '-'}</td>
                  <td>{p.efficiency ? `${p.efficiency}%` : '-'}</td>
                  <td>{p.respiration || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
