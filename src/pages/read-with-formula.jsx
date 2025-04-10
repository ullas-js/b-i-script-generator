import { useState } from 'react';
import './page.css';
import { readExcelFile } from '../utils/xl-fun';

const ReadFormula = () => {
    const [file, setFile] = useState(null);
    const [sqlOutput, setSqlOutput] = useState('');

    const downLoadSQL = () => {
        if (!sqlOutput) return;

        const blob = new Blob([sqlOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.sql';
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="read-formula-content">
            <h1>Read with Formula</h1>
            <input
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        readExcelFile(file, (sql) => setSqlOutput(sql));
                        setFile(file.name);
                    }
                }}
            />
            <button onClick={downLoadSQL} disabled={!sqlOutput} style={{ marginLeft: '1rem' }}>
                Download SQL
            </button>
            <code>{file}</code>
        </div>
    );
};

export default ReadFormula;
