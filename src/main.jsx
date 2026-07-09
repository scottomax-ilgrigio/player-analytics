import React, { useState } from "react";

import { createRoot } from "react-dom/client";

import Papa from "papaparse";

import "./style.css";

function App() {

  const [files, setFiles] = useState([]);

  const [result, setResult] = useState(null);

  const handleFiles = (event) => {

    setFiles(Array.from(event.target.files));

    setResult(null);

  };

  const analyzeFiles = async () => {

    const cicli = files.find(f => f.name.toLowerCase().includes("cicli"));

    const sonno = files.find(f => f.name.toLowerCase().includes("sonno"));

    if (!cicli || !sonno) {

      alert("Devi caricare sia cicli_fisiologici.csv sia sonno.csv");

      return;

    }

    const readCsv = (file) =>

      new Promise((resolve) => {

        Papa.parse(file, {

          header: true,

          skipEmptyLines: true,

          complete: (res) => resolve(res.data),

        });

      });

    const cicliData = await readCsv(cicli);

    const sonnoData = await readCsv(sonno);

    setResult({

      cicliRows: cicliData.length,

      sonnoRows: sonnoData.length,

      cicliPreview: cicliData.slice(0, 5),

      sonnoPreview: sonnoData.slice(0, 5),

    });

  };

  return (

    <div className="app">

      <div className="card">

        <h1>Davide Player Analytics</h1>

        <p>Importa i file WHOOP necessari: cicli fisiologici e sonno.</p>

        <label className="upload">

          Seleziona CSV WHOOP

          <input

            type="file"

            accept=".csv"

            multiple

            onChange={handleFiles}

          />

        </label>

        <div className="file-list">

          {files.map((file) => (

            <div key={file.name}>✅ {file.name}</div>

          ))}

        </div>

        <button onClick={analyzeFiles}>Analizza</button>

        {result && (

          <div className="results">

            <h2>Risultato importazione</h2>

            <p>Righe cicli fisiologici: <b>{result.cicliRows}</b></p>

            <p>Righe sonno: <b>{result.sonnoRows}</b></p>

            <h3>Anteprima cicli fisiologici</h3>

            <pre>{JSON.stringify(result.cicliPreview, null, 2)}</pre>

            <h3>Anteprima sonno</h3>

            <pre>{JSON.stringify(result.sonnoPreview, null, 2)}</pre>

          </div>

        )}

      </div>

    </div>

  );

}

createRoot(document.getElementById("root")).render(<App />);
