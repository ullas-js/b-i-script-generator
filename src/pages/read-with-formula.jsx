import { useState } from 'react';
import './page.css';
import { readExcelFile } from '../utils/xl-fun';
import { Link } from 'react-router-dom';

const ReadFormula = () => {
    const [file, setFile] = useState(null);
    const [sqlOutput, setSqlOutput] = useState({});

    const downLoadSQL = () => {
        if (!sqlOutput || Object.keys(sqlOutput).length === 0) return;

        const combinedSQL = [
            sqlOutput.instructions?.create,
            sqlOutput.instructions?.insert,
            sqlOutput.ingredients?.create,
            sqlOutput.ingredients?.insert,
            sqlOutput.templates?.create,
            sqlOutput.templates?.insert
        ].filter(Boolean).join('\n\n');

        const blob = new Blob([combinedSQL], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.sql';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="read-formula-content">
            <Link to={'/'}>Go Back</Link>
            <h1>Read with Formula</h1>
            <input
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        readExcelFile(file, (sql) => {
                            setSqlOutput(prev => ({
                                ...prev,
                                ...sql
                            }));
                        });
                        setFile(file.name);
                    }
                }}
            />
            <button onClick={downLoadSQL} disabled={!sqlOutput} style={{ marginLeft: '1rem' }}>
                Download SQL
            </button>
            <code>{file}</code>

            <div className='code-block'>
                <strong>SQL Output:</strong>
                <br />
                {sqlOutput && Object.keys(sqlOutput).length > 0 ? (
                    <div>
                        <strong>Instructions:</strong>
                        <pre>{sqlOutput.instructions?.create}</pre>
                        <pre>{sqlOutput.instructions?.insert}</pre>
                        <strong>Ingredients:</strong>
                        <pre>{sqlOutput.ingredients?.create}</pre>
                        <pre>{sqlOutput.ingredients?.insert}</pre>
                        <strong>Templates:</strong>
                        <pre>{sqlOutput.templates?.create}</pre>
                        <pre>{sqlOutput.templates?.insert}</pre>
                    </div>
                ) : (
                    'No SQL output yet.'
                )}
                <br />
            </div>
        </div>
    );
};

export default ReadFormula;
