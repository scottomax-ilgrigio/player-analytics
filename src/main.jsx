import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import { Upload, Activity, Moon, Gauge, HeartPulse, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import './style.css';

function numberFrom(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function hoursFromMinutes(value) {
  const minutes = numberFrom(value);
  return minutes ? +(minutes / 60).toFixed(1) : 0;
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function normalizeRows(rows) {
  return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''));
}

function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(normalizeRows(result.data)),
      error: reject,
    });
  });
}

function latestByDate(rows, dateField) {
  return [...rows].sort((a, b) => String(b[dateField] || '').localeCompare(String(a[dateField] || '')))[0] || null;
}

function getStatus(row) {
  if (!row) return 'yellow';
  if (row.recovery && row.recovery < 40) return 'red';
  if (row.sleepHours && row.sleepHours < 6) return 'yellow';
  if (row.strain && row.strain > 18) return 'yellow';
  return 'green';
}

function statusLabel(status) {
  if (status === 'red') return 'Da monitorare';
  if (status === 'yellow') return 'Attenzione';
  return 'Ok';
}

function App() {
  const [cicliFile, setCicliFile] = useState(null);
  const [sonnoFile, setSonnoFile] = useState(null);
  const [cicliRows, setCicliRows] = useState([]);
  const [sonnoRows, setSonnoRows] = useState([]);
  const [message, setMessage] = useState('Carica cicli_fisiologici.csv e sonno.csv per iniziare.');
  const [isLoading, setIsLoading] = useState(false);

  async function handleWhoopFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const cicli = selectedFiles.find((file) => file.name.toLowerCase().includes('cicli'));
    const sonno = selectedFiles.find((file) => file.name.toLowerCase().includes('sonno'));

    if (!cicli || !sonno) {
      setMessage('Mi servono entrambi i file: cicli_fisiologici.csv e sonno.csv.');
      return;
    }

    setIsLoading(true);
    setMessage('Sto leggendo i CSV WHOOP...');

    try {
      const [parsedCicli, parsedSonno] = await Promise.all([
        parseCsvFile(cicli),
        parseCsvFile(sonno),
      ]);

      setCicliFile(cicli);
      setSonnoFile(sonno);
      setCicliRows(parsedCicli);
      setSonnoRows(parsedSonno);
      setMessage(`Import completato: ${parsedCicli.length} righe cicli fisiologici e ${parsedSonno.length} righe sonno.`);
    } catch (error) {
      console.error(error);
      setMessage('Errore durante la lettura dei CSV. Controlla i file e riprova.');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  }

  const latestCycle = useMemo(() => latestByDate(cicliRows, 'Ora di inizio ciclo'), [cicliRows]);
  const latestSleep = useMemo(() => latestByDate(sonnoRows, 'Inizio del sonno'), [sonnoRows]);

  const dashboardRow = useMemo(() => {
    if (!latestCycle && !latestSleep) return null;

    return {
      athlete: 'Atleta WHOOP',
      date: formatDate(latestCycle?.['Ora di inizio ciclo'] || latestSleep?.['Inizio del sonno']),
      recovery: numberFrom(latestCycle?.['Punteggio di recupero %']),
      hrv: numberFrom(latestCycle?.['Variabilità della frequenza cardiaca (ms)']),
      rhr: numberFrom(latestCycle?.['Frequenza cardiaca a riposo (bpm)']),
      strain: numberFrom(latestCycle?.['Sforzo giornaliero']),
      sleepHours: hoursFromMinutes(latestSleep?.['Durata del sonno (min)'] || latestCycle?.['Durata del sonno (min)']),
      sleepPerformance: numberFrom(latestSleep?.['Andamento del sonno %'] || latestCycle?.['Andamento del sonno %']),
      sleepEfficiency: numberFrom(latestSleep?.['Efficienza del sonno %'] || latestCycle?.['Efficienza del sonno %']),
      respiratoryRate: numberFrom(latestSleep?.['Frequenza respiratoria (rpm)'] || latestCycle?.['Frequenza respiratoria (rpm)']),
    };
  }, [latestCycle, latestSleep]);

  const rows = useMemo(() => {
    if (!cicliRows.length && !sonnoRows.length) return [];
    return cicliRows.slice(0, 10).map((cycle, index) => {
      const sleep = sonnoRows[index] || {};
      return {
        date: formatDate(cycle['Ora di inizio ciclo']),
        recovery: numberFrom(cycle['Punteggio di recupero %']),
        hrv: numberFrom(cycle['Variabilità della frequenza cardiaca (ms)']),
        rhr: numberFrom(cycle['Frequenza cardiaca a riposo (bpm)']),
        strain: numberFrom(cycle['Sforzo giornaliero']),
        sleepHours: hoursFromMinutes(sleep['Durata del sonno (min)'] || cycle['Durata del sonno (min)']),
        sleepPerformance: numberFrom(sleep['Andamento del sonno %'] || cycle['Andamento del sonno %']),
        sleepEfficiency: numberFrom(sleep['Efficienza del sonno %'] || cycle['Efficienza del sonno %']),
      };
    });
  }, [cicliRows, sonnoRows]);

  const status = getStatus(dashboardRow);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Versione 1.2</p>
          <h1>Davide Player Analytics</h1>
          <p>Import WHOOP semplificato: usa solo cicli fisiologici e sonno.</p>
        </div>
        <div className="badge">Coach mode</div>
      </header>

      <section className="upload-grid one-column">
        <label className="upload-card">
          <Upload />
          <strong>Carica CSV WHOOP</strong>
          <span>Seleziona insieme cicli_fisiologici.csv e sonno.csv</span>
          <input type="file" accept=".csv" multiple onChange={handleWhoopFiles} />
        </label>
      </section>

      <section className="file-status">
        <div className={cicliFile ? 'file-ok' : 'file-missing'}>
          {cicliFile ? <CheckCircle2 /> : <AlertTriangle />}
          <span>{cicliFile ? cicliFile.name : 'cicli_fisiologici.csv non caricato'}</span>
        </div>
        <div className={sonnoFile ? 'file-ok' : 'file-missing'}>
          {sonnoFile ? <CheckCircle2 /> : <AlertTriangle />}
          <span>{sonnoFile ? sonnoFile.name : 'sonno.csv non caricato'}</span>
        </div>
      </section>

      <p className="message">{isLoading ? '⏳ ' : ''}{message}</p>

      <section className="cards">
        <div className="card"><FileSpreadsheet /><span>Righe cicli</span><strong>{cicliRows.length}</strong></div>
        <div className="card"><Moon /><span>Righe sonno</span><strong>{sonnoRows.length}</strong></div>
        <div className="card"><Activity /><span>Recovery ultimo</span><strong>{dashboardRow?.recovery ? `${dashboardRow.recovery}%` : '-'}</strong></div>
        <div className="card"><Gauge /><span>Sonno ultimo</span><strong>{dashboardRow?.sleepHours ? `${dashboardRow.sleepHours}h` : '-'}</strong></div>
      </section>

      <section className="panel">
        <h2>Dashboard ultimo dato disponibile</h2>
        {!dashboardRow ? (
          <div className="empty-state">Carica i due CSV WHOOP per vedere il riepilogo.</div>
        ) : (
          <div className="summary-grid">
            <div><span>Data</span><strong>{dashboardRow.date}</strong></div>
            <div><span>Stato</span><strong><i className={`dot ${status}`}></i> {statusLabel(status)}</strong></div>
            <div><span>Recovery</span><strong>{dashboardRow.recovery || '-'}%</strong></div>
            <div><span>HRV</span><strong>{dashboardRow.hrv || '-'} ms</strong></div>
            <div><span>FC riposo</span><strong>{dashboardRow.rhr || '-'} bpm</strong></div>
            <div><span>Strain</span><strong>{dashboardRow.strain || '-'}</strong></div>
            <div><span>Sonno</span><strong>{dashboardRow.sleepHours || '-'} h</strong></div>
            <div><span>Efficienza sonno</span><strong>{dashboardRow.sleepEfficiency || '-'}%</strong></div>
            <div><span>Frequenza respiratoria</span><strong>{dashboardRow.respiratoryRate || '-'} rpm</strong></div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Ultimi dati importati</h2>
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
                <th>Andamento sonno</th>
                <th>Efficienza</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="9" className="empty-row">Nessun dato importato.</td></tr>
              ) : rows.map((row, index) => {
                const rowStatus = getStatus(row);
                return (
                  <tr key={`${row.date}-${index}`}>
                    <td>{row.date}</td>
                    <td><span className={`dot ${rowStatus}`}></span> {statusLabel(rowStatus)}</td>
                    <td>{row.recovery || '-'}</td>
                    <td>{row.hrv || '-'}</td>
                    <td>{row.rhr || '-'}</td>
                    <td>{row.strain || '-'}</td>
                    <td>{row.sleepHours || '-'} h</td>
                    <td>{row.sleepPerformance || '-'}%</td>
                    <td>{row.sleepEfficiency || '-'}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel roadmap">
        <HeartPulse />
        <div>
          <h2>Prossimo step</h2>
          <p>Nel prossimo aggiornamento collegheremo questi dati al profilo atleta e poi aggiungeremo K-Sport GPS.</p>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
