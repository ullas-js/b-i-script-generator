import { useCallback, useState } from 'react';
import './page.css';
import { readExcelFile } from '../utils/xl-fun';
import { Link } from 'react-router-dom';
import RecordTable from '../components/table';

const ReadFormula = () => {
    const [file, setFile] = useState(null);
    const [sqlOutput, setSqlOutput] = useState({});

    const [instructions, setInstructions] = useState({
        headers: [],
        rows: []
    });
    const [ingredients, setIngredients] = useState({
        headers: [],
        rows: []
    });

    const handleSetRows = useCallback((rows) => {
        setInstructions(prev => ({ ...prev, rows }));
    }, []);

    const handleSetHeaders = useCallback((headers) => {
        setInstructions(prev => ({ ...prev, headers }));
    }, []);

    const handleSetIngredientRows = useCallback((rows) => {
        setIngredients(prev => ({ ...prev, rows }));
    }, []);

    const handleSetIngredientHeaders = useCallback((headers) => {
        setIngredients(prev => ({ ...prev, headers }));
    }, []);

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
                        setSqlOutput({});
                        setInstructions({
                            headers: [],
                            rows: []
                        });
                        setIngredients({
                            headers: [],
                            rows: []
                        });
                        readExcelFile(file, ({ sql, table }) => {
                            setSqlOutput(prev => ({
                                ...prev,
                                ...sql
                            }));
                            setInstructions(prev => ({
                                ...prev,
                                ...table.instructions
                            }));
                            setIngredients(prev => ({
                                ...prev,
                                ...table.ingredients
                            }));
                        });
                        setFile(file.name);
                    }
                }}
            />
            <button onClick={() => {
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
            }} disabled={!sqlOutput} style={{ marginLeft: '1rem' }}>
                Download SQL
            </button>
            <code>{file}</code>

            {instructions.rows.length > 0 && ingredients.rows.length > 0 && (
                <div className='table-block'>
                    <strong>Instructions:</strong>
                    <RecordTable
                        headers={instructions.headers}
                        rows={instructions.rows}
                        setHeaders={handleSetHeaders}
                        setRows={handleSetRows}
                        name="rcp_btch_card_instr"
                    />

                    <strong>Ingredients:</strong>
                    <RecordTable
                        headers={ingredients.headers}
                        rows={ingredients.rows}
                        setHeaders={handleSetIngredientHeaders}
                        setRows={handleSetIngredientRows}
                        name="rcp_batch_step_rm_dtl"
                    />
                </div>
            )}
        </div>
    );
};

export default ReadFormula;
