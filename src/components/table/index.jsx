import './index.css';
import React, { createContext, useCallback, useState, useEffect, useMemo } from 'react';
import Row from './row';

export const TableContext = createContext();

// Debounce helper
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const TableProvider = ({ headers, rows = [], setHeaders, setRows }) => {
    // Local copy of data
    const [localRows, setLocalRows] = useState([]);
    const [localHeaders, setLocalHeaders] = useState([]);

    // Initialize local copy on first render
    useEffect(() => {
        setLocalRows(Array.isArray(rows) ? [...rows] : []);
        setLocalHeaders(Array.isArray(headers) ? [...headers] : []);
    }, []); // Only on mount

    // Debounced update functions
    const debouncedSetRows = useMemo(
        () => debounce((newRows) => setRows(newRows), 300),
        [setRows]
    );

    const debouncedSetHeaders = useMemo(
        () => debounce((newHeaders) => setHeaders(newHeaders), 300),
        [setHeaders]
    );

    // Update local state and debounce parent update
    const updateCell = useCallback((rowIndex, colIndex, value) => {
        setLocalRows(prevRows => {
            const currentRows = [...prevRows];
            const headerName = localHeaders[colIndex];
            
            // Ensure we have enough rows
            while (currentRows.length <= rowIndex) {
                currentRows.push({});
            }
            
            // Update the specific cell
            currentRows[rowIndex] = {
                ...currentRows[rowIndex],
                [headerName]: value
            };
            
            // Trigger debounced update to parent
            debouncedSetRows(currentRows);
            
            return currentRows;
        });
    }, [localHeaders, debouncedSetRows]);

    const updateHeader = useCallback((index, value) => {
        setLocalHeaders(prevHeaders => {
            const newHeaders = [...prevHeaders];
            newHeaders[index] = value;
            
            // Trigger debounced update to parent
            debouncedSetHeaders(newHeaders);
            
            return newHeaders;
        });
    }, [debouncedSetHeaders]);

    const generateSQL = useCallback(() => {
        if (!localHeaders?.length || !localRows?.length) return '';

        // Generate CREATE TABLE statement
        const createTableSQL = `CREATE TABLE records (\n${localHeaders
            .map(header => `    ${header} VARCHAR(255)`)
            .join(',\n')}\n);`;

        // Generate INSERT statements
        const insertStatements = localRows.map(row => {
            const values = localHeaders.map(header => {
                const value = row[header];
                // Handle different types of values
                if (value === null || value === undefined) {
                    return 'NULL';
                }
                if (typeof value === 'number') {
                    return value;
                }
                // Convert to string and escape single quotes
                const stringValue = String(value);
                return `'${stringValue.replace(/'/g, "''")}'`;
            });
            return `INSERT INTO records (${localHeaders.join(', ')}) VALUES (${values.join(', ')});`;
        }).join('\n');

        return `${createTableSQL}\n\n${insertStatements}`;
    }, [localHeaders, localRows]);

    const contextValue = useMemo(() => ({
        updateCell,
        updateHeader
    }), [updateCell, updateHeader]);

    return (
        <TableContext.Provider value={contextValue}>
            <div className="table-container">
                <table className="record-table">
                    <thead>
                        <tr>
                            {localHeaders.map((header, index) => (
                                <th key={`header-${index}`}>
                                    <input
                                        type="text"
                                        value={header || ''}
                                        onChange={(e) => updateHeader(index, e.target.value)}
                                        placeholder={`Column ${index + 1}`}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {localRows.length > 0 ? (
                            localRows.map((row, rowIndex) => (
                                <Row 
                                    key={`row-${rowIndex}`} 
                                    rowIndex={rowIndex} 
                                    row={row} 
                                />
                            ))
                        ) : (
                            <tr>
                                <td colSpan={localHeaders.length || 1} style={{ textAlign: 'center' }}>
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="sql-container">
                    <button onClick={() => {
                        const sql = generateSQL();
                        const blob = new Blob([sql], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'table.sql';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }}>
                        Generate SQL
                    </button>
                </div>
            </div>
        </TableContext.Provider>
    );
};

const RecordTable = ({ headers, rows, setHeaders, setRows }) => {
    return (
        <TableProvider 
            headers={headers} 
            rows={rows} 
            setHeaders={setHeaders} 
            setRows={setRows} 
        />
    );
};

export default RecordTable;