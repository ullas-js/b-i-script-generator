import { useMemo, useState } from "react";
import * as XLSX from 'xlsx';
import ColumnSelector from "./columseletor";
import './ui.css';
import BatchExtraction from "./instruction";

const ConvertFile = () => {
    const [file, setFile] = useState(null);
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [selections, setSelections] = useState([]);
    const [hasHeader, setHasHeader] = useState(true);
    const [colDirection, setColDirection] = useState('horizontal');
    const [columns, setColumns] = useState({});
    const [html, setHtml] = useState({});
    const [checkMerge, setCheckMerge] = useState(false);

    const handleFile = (e) => setFile(e.target.files[0]);

    const sheetToHTMLWithCellNames = (sheet) => {
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        let html = '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse;">';

        // Column headers (A, B, C...)
        html += '<tr><th></th>';
        for (let c = range.s.c; c <= range.e.c; ++c) {
            html += `<th>${XLSX.utils.encode_col(c)}</th>`;
        }
        html += '</tr>';

        for (let r = range.s.r; r <= range.e.r; ++r) {
            html += `<tr><th>${r + 1}</th>`; // Row header (1, 2, 3...)
            for (let c = range.s.c; c <= range.e.c; ++c) {
                const cellAddress = { c, r };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                const cell = sheet[cellRef];
                const value = cell ? cell.v : '';
                html += `<td title="${cellRef}"><br/>${value}</td>`;
            }
            html += '</tr>';
        }

        html += '</table>';
        return html;
    }


    const handleConvert = () => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            setSheetNames(workbook.SheetNames);
            workbook.SheetNames.forEach(sheet => {
                setHtml(prev => ({
                    ...prev,
                    [sheet]: sheetToHTMLWithCellNames(workbook.Sheets[sheet])
                }))
            });

        };
        reader.readAsBinaryString(file);
    };

    const readSheetPart = ({ sheet, start, end }) => {
        if (!sheet || !start || !end || !/^[A-Z]+\d+$/i.test(start) || !/^[A-Z]+\d+$/i.test(end)) {
            console.warn("Invalid or incomplete range:", sheet, start, end);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
            const worksheet = workbook.Sheets[sheet];
            if (!worksheet) return;

            const range = XLSX.utils.decode_range(`${start}:${end}`);
            const result = [];

            for (let row = range.s.r; row <= range.e.r; row++) {
                const rowData = [];
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress];

                    if (!cell) {
                        rowData.push(null);
                    } else if (cell.t === 'd') {
                        rowData.push(cell.w || cell.v.toISOString());
                    } else if (cell.t === 'n' && cell.z?.includes('d')) {
                        const formatted = XLSX.SSF.format(cell.z, cell.v);
                        rowData.push(formatted);
                    } else {
                        rowData.push(cell.w ?? cell.v);
                    }
                }
                result.push(rowData);
            }

            setColumns(prev => ({
                ...prev,
                [sheet]: [...(prev[sheet] || []), ...result]
            }));
        };

        reader.readAsBinaryString(file);
    };


    const handleAddSelection = ({ start, end }) => {
        const exists = selections.some(sel =>
            sel.sheet === selectedSheet && sel.start === start && sel.end === end
        );
        if (exists) return;

        const newSelection = { sheet: selectedSheet, start, end };
        setSelections(prev => [...prev, newSelection]);
        readSheetPart(newSelection);
    };

    const handleRemoveSelection = (index) => {
        const toRemove = selections[index];
        setSelections(prev => prev.filter((_, i) => i !== index));
        setColumns(prev => {
            const updated = { ...prev };
            updated[toRemove.sheet] = updated[toRemove.sheet].filter(
                (row, rowIdx) => rowIdx < toRemove.start || rowIdx > toRemove.end
            );
            return updated;
        });
    };

    const mergedColumns = useMemo(() => (
        Object.values(columns).flat().filter(row => row.length > 0)
    ), [columns]);

    const getSqlType = (value) => {
        if (typeof value === "number") return Number.isInteger(value) ? "INT" : "FLOAT";
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return "DATE";
        return "VARCHAR(255)";
    };

    const replaceHeader = (header) => header ? header?.toString().toLowerCase().replace(/[\s\-()\/\\@#.,]+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+|_+$/g, '') : '';

    const generateSqlQuery = (list) => {
        if (list.length < 2) return;

        const tableName = selectedSheet.toLowerCase().replace(/\s+/g, '_');
        let headers = [];

        if (colDirection === 'horizontal') {
            headers = list[0].map((h, i) =>
                hasHeader
                    ? replaceHeader(h) || `col_${i}`
                    : `col_${i}`
            );
        } else {
            // Vertical headers (mapping
            //  from each row's first column)
            headers = list.map((row, i) =>
                hasHeader
                    ? replaceHeader(row[0]) || `col_${i}`
                    : `col_${i}`
            );
        }

        const createTable = headers.map((header, i) => {
            const value = list[1][i];
            return `\`${header}\` ${getSqlType(value)}`;
        }).join(",\n    ");

        const createQuery = `CREATE TABLE \`${tableName}\` (\n    ${createTable}\n);`;

        const values = (colDirection === 'horizontal'
            ? list.slice(hasHeader ? 1 : 0).map(row =>
                `(${row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '\\"').trim()}"`).join(', ')})`
            )
            : list[0].map((_, colIndex) =>
                `(${list.map(row =>
                    `"${(row[colIndex] ?? '').toString().replace(/"/g, '\\"').trim()}"`
                ).join(', ')})`
            ).splice(hasHeader ? 1 : 0)
        ).join(', ');

        const insertQuery = `INSERT INTO \`${tableName}\` (${headers.map(h => `\`${h}\``).join(', ')}) VALUES ${values};`;

        createSQLFile(createQuery, insertQuery);
    };

    const createSQLFile = (create, insert) => {
        const blob = new Blob([create, "\n\n", insert], { type: "text/sql" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const time = new Date().getTime();
        a.download = `${selectedSheet.toLowerCase().replace(/\s+/g, '_') + time}.sql`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadSheet = (list) => {
        const workbook = XLSX.utils.book_new();
        let headers = [];

        if (colDirection === 'horizontal') {
            headers = list[0].map((h, i) =>
                hasHeader
                    ? replaceHeader(h) || `col_${i}`
                    : `col_${i}`
            );
        } else {
            // Vertical headers (collecting from each row's first column)
            headers = list.map((row, i) =>
                hasHeader
                    ? replaceHeader(row[0]) || `col_${i}`
                    : `col_${i}`
            );
        }


        const data = colDirection === 'horizontal'
            ? list.slice(hasHeader ? 1 : 0).map(row =>
                row.map(cell => `${(cell ?? '').toString().replace(/"/g, '\\"')}`)
            )
            : list[0].map((_, colIndex) =>
                list.map(row =>
                    `${(row[colIndex] ?? '').toString().replace(/"/g, '\\"')}`
                )
            ).splice(hasHeader ? 1 : 0);


        const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        XLSX.utils.book_append_sheet(workbook, sheet, selectedSheet);
        XLSX.writeFile(workbook, `${selectedSheet}.xlsx`);
    };

    const handleMerge = () => {
        if (colDirection !== 'horizontal') {
            setCheckMerge(false);
            return;
        }

        setCheckMerge(true);
    }

    const [data, setData] = useState([]);

    return (
        <div className="converter-wrapper">
            <BatchExtraction columns={mergedColumns} setColumns={(e) => setData(e)} isOpen={checkMerge} onClose={() => setCheckMerge(false)} />
            <div className="sheet-buttons">
                <input type="file" className="btn" onChange={handleFile} />
                <button className="btn active" onClick={handleConvert}>Load Sheets</button>
            </div>

            <div className="sheet-buttons">
                {sheetNames.map(sheet => (
                    <button
                        key={sheet}
                        className={`btn ${selectedSheet === sheet ? 'active' : ''}`}
                        onClick={() => setSelectedSheet(sheet)}
                    >
                        {sheet}
                    </button>
                ))}
            </div>

            {/* <div key={selectedSheet} className="table-container">
                <div dangerouslySetInnerHTML={{ __html: html[selectedSheet] }} />
            </div> */}

            {selectedSheet && (
                <>
                    <h3>{selectedSheet}</h3>
                    <ColumnSelector onSubmit={handleAddSelection} />
                    <div className="selections">
                        {selections.map((sel, i) => (
                            <div className="selection-tag" key={`${sel.sheet}-${sel.start}-${sel.end}`}>
                                {sel.sheet} / {sel.start} to {sel.end}
                                <button onClick={() => handleRemoveSelection(i)}>✕</button>
                            </div>
                        ))}
                    </div>
                </>
            )}


            <div
                style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                <label>
                    <input
                        type="checkbox"
                        checked={hasHeader}
                        onChange={e => setHasHeader(e.target.checked)}
                    /> Include Header
                </label>

                <label>
                    <input type="checkbox"
                        checked={colDirection === 'horizontal'}
                        onChange={(e) => setColDirection(e.target.checked ? 'horizontal' : 'vertical')}
                    />
                    {colDirection === 'horizontal' ? 'Horizontal' : 'Vertical'}
                </label>

                <button className="btn merge-modal-button" onClick={handleMerge}>
                    Merge (Batch Instruction)
                </button>
            </div>

            <div className="table-container">
                {mergedColumns.length > 0 && (
                    colDirection === 'horizontal' ? (
                        <table>
                            <thead>
                                <tr>
                                    {hasHeader
                                        ? (data.length > 0 ? data : mergedColumns)[0].map((cell, i) => <th key={i}>{cell}</th>)
                                        : (data.length > 0 ? data : mergedColumns)[0].map((_, i) => <th key={i}>Column {i + 1}</th>)
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                {(data.length > 0 ? data : mergedColumns).slice(hasHeader ? 1 : 0).map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => <td key={j}>{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    {hasHeader
                                        ? (data.length > 0 ? data : mergedColumns).map((cell, i) => {
                                            return <th key={i}>{cell[0]}</th>;
                                        })
                                        :
                                        (data.length > 0 ? data : mergedColumns).map((_, i) => (
                                            <th key={i}>Row {i + 1}</th>
                                        ))
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {(data.length > 0 ? data : mergedColumns).map((cell, i) => {
                                        return <td key={i}>{cell[1]}</td>;
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    )
                )}
            </div>

            {mergedColumns.length > 0 && (
                <div className="btn-wrapper">
                    <button onClick={() => generateSqlQuery(data.length > 0 ? data : mergedColumns)}>Download SQL</button>
                    <button onClick={() => downloadSheet(data.length > 0 ? data : mergedColumns)}>Download Sheet</button>
                    <button onClick={() => {
                        if (data.length === 0) {
                            setSelections([]);
                            setColumns({});
                        } else {
                            setData([]);
                        }
                    }}>Reset</button>
                </div>
            )}
        </div>
    );
};

export default ConvertFile;
