import { useMemo, useState, useEffect } from "react";
import Modal from "./modal";
import { replaceHeader, generateInsertQuery, generateCreateTableSQL } from "../utils/sql";

const BatchExtraction = ({ columns, selectedSheet, isOpen, onClose }) => {
    const [selected, setSelected] = useState([]);
    const [headers, setHeaders] = useState(
        columns?.[0]?.map((item, index) => ({ label: item, value: index })) || []
    );

    useEffect(() => {
        setHeaders(columns?.[0]?.map((item, index) => ({ label: item, value: index })) || []);
    }, [columns]);

    const normalizedSelectedHeaders = useMemo(
        () => selected.map(index => replaceHeader(headers[index]?.label)).filter(Boolean),
        [selected, headers]
    );

    const generateSQL = () => {
        const sql = generateCreateTableSQL({ headers, selected });
        const insert = generateInsertQuery({ columns, headers, selected });
        const fullSQL = `${sql}${insert}`;

        const blob = new Blob([fullSQL], { type: "text/sql" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const time = new Date().getTime();
        a.download = `${selectedSheet.toLowerCase().replace(/\s+/g, '_')}_batch_instructions_${time}.sql`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="1000px">
            <div className="instruction-m-container" style={{ marginTop: "1rem" }}>
                <div className="instruction-modal">
                    <div>
                        <h2>Batch Instruction</h2>
                        <p><strong>Sheet:</strong> {selectedSheet}</p>
                    </div>
                    <div className="sql-preview">
                        <h4>Preview:</h4>
                        <pre>
                            <code>{selected.length > 0 ?
                                `CREATE TABLE \`batch_instructions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY 
    ${normalizedSelectedHeaders.map(h => `\`${h}\` VARCHAR(255)`).join(',\n  ')}
);` : '-- No columns selected --'}
                            </code></pre>
                    </div>
                </div>

                <div className="check-box-wrapper">
                    <h3>Select Columns</h3>
                    <div className="checkbox-container">
                        {headers.map((header, index) => (
                            <div key={index}>
                                <label className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        value={index}
                                        checked={selected.includes(index)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setSelected(prev =>
                                                checked
                                                    ? [...prev, index]
                                                    : prev.filter(i => i !== index)
                                            );
                                        }}
                                    />
                                    {header.label}
                                </label>
                                <input
                                    type="text"
                                    value={header.label}
                                    disabled={!selected.includes(index)}
                                    onChange={(e) => {
                                        const newLabel = e.target.value;
                                        setHeaders(prev =>
                                            prev.map((h, i) =>
                                                i === index ? { ...h, label: newLabel } : h
                                            )
                                        );
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sheet-buttons" style={{ marginTop: "1rem" }}>
                    <button className="btn active" onClick={onClose}>Cancel</button>
                    <button className="btn active" onClick={generateSQL} disabled={selected.length === 0}>
                        Generate SQL
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BatchExtraction;

