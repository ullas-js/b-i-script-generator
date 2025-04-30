import './index.css';
import React, { createContext, useCallback, useState, useEffect, useMemo } from 'react';
import Row from './row';
import ContextMenu from './context-menu';
import { debounce } from '../../utils/debounce';
export const TableContext = createContext();


const TableProvider = ({ headers, rows = [], setHeaders, setRows, name }) => {
    // Local copy of data
    const [localRows, setLocalRows] = useState([]);
    const [localHeaders, setLocalHeaders] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedCell, setSelectedCell] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);
    const [inputFocused, setInputFocused] = useState(false);

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

    const handleDragStart = useCallback((e, type, index) => {
        // Prevent dragging if an input is focused
        if (inputFocused) {
            e.preventDefault();
            return;
        }

        const target = e.currentTarget;
        setDraggedItem({ type, index });

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());

        target.classList.add('dragging');

        if (type === 'column') {
            const th = target;
            const rect = th.getBoundingClientRect();
            const ghostEl = th.cloneNode(true);
            ghostEl.style.width = `${rect.width}px`;
            ghostEl.style.height = `${rect.height}px`;
            ghostEl.style.position = 'fixed';
            ghostEl.style.top = '-1000px';
            document.body.appendChild(ghostEl);
            e.dataTransfer.setDragImage(ghostEl, rect.width / 2, rect.height / 2);
            setTimeout(() => document.body.removeChild(ghostEl), 0);
        }
    }, [inputFocused]);

    const handleDragOver = useCallback((e, type, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!draggedItem || draggedItem.type !== type || draggedItem.index === index) return;

        setDragOverItem({ type, index });
    }, [draggedItem]);

    const handleDrop = useCallback((e, type, index) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.type !== type || draggedItem.index === index) return;

        const fromIndex = draggedItem.index;
        const toIndex = index;

        if (type === 'column') {
            setLocalHeaders(prevHeaders => {
                const newHeaders = [...prevHeaders];
                const [removed] = newHeaders.splice(fromIndex, 1);
                newHeaders.splice(toIndex, 0, removed);
                debouncedSetHeaders(newHeaders);
                return newHeaders;
            });

            setLocalRows(prevRows => {
                const newRows = prevRows.map(row => {
                    const entries = Object.entries(row);
                    const [removed] = entries.splice(fromIndex, 1);
                    entries.splice(toIndex, 0, removed);
                    return Object.fromEntries(entries);
                });
                debouncedSetRows(newRows);
                return newRows;
            });
        } else if (type === 'row') {
            setLocalRows(prevRows => {
                const newRows = [...prevRows];
                const [removed] = newRows.splice(fromIndex, 1);
                newRows.splice(toIndex, 0, removed);
                debouncedSetRows(newRows);
                return newRows;
            });
        }

        // Remove dragging class from all elements
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        setDraggedItem(null);
        setDragOverItem(null);
    }, [draggedItem, debouncedSetHeaders, debouncedSetRows]);

    const handleDragEnd = useCallback((e) => {
        // Remove dragging class from all elements
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        setDraggedItem(null);
        setDragOverItem(null);
    }, []);

    const handleContextMenu = useCallback((e, rowIndex, colIndex) => {
        e.preventDefault();
        setSelectedCell({ rowIndex, colIndex });
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const handleClickOutside = useCallback(() => {
        setContextMenu(null);
    }, []);

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [handleClickOutside]);

    const insertRow = useCallback((position) => {
        if (!selectedCell) return;

        setLocalRows(prevRows => {
            const newRows = [...prevRows];
            const insertIndex = position === 'above' ? selectedCell.rowIndex : selectedCell.rowIndex + 1;

            // Create new empty row with all headers
            const newRow = {};
            localHeaders.forEach(header => {
                newRow[header] = '';
            });

            newRows.splice(insertIndex, 0, newRow);
            debouncedSetRows(newRows);
            return newRows;
        });
    }, [selectedCell, localHeaders, debouncedSetRows]);

    const insertColumn = useCallback((position) => {
        if (!selectedCell) return;

        setLocalHeaders(prevHeaders => {
            const newHeaders = [...prevHeaders];
            const insertIndex = position === 'left' ? selectedCell.colIndex : selectedCell.colIndex + 1;

            // Generate new header name
            const newHeader = `Column ${newHeaders.length + 1}`;
            newHeaders.splice(insertIndex, 0, newHeader);

            // Update all rows to include the new column
            setLocalRows(prevRows => {
                const newRows = prevRows.map(row => ({
                    ...row,
                    [newHeader]: ''
                }));
                debouncedSetRows(newRows);
                return newRows;
            });

            debouncedSetHeaders(newHeaders);
            return newHeaders;
        });
    }, [selectedCell, debouncedSetHeaders, debouncedSetRows]);

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
            const oldHeader = newHeaders[index];
            newHeaders[index] = value;

            // Update all rows to preserve values under the new header name
            setLocalRows(prevRows => {
                const newRows = prevRows.map(row => {
                    const newRow = { ...row };
                    // If the old header had a value, move it to the new header
                    if (oldHeader in newRow) {
                        newRow[value] = newRow[oldHeader];
                        delete newRow[oldHeader];
                    }
                    return newRow;
                });
                debouncedSetRows(newRows);
                return newRows;
            });

            // Trigger debounced update to parent
            debouncedSetHeaders(newHeaders);

            return newHeaders;
        });
    }, [debouncedSetHeaders, debouncedSetRows]);

    const generateSQL = useCallback(() => {
        if (!localHeaders?.length || !localRows?.length) return '';

        const n = name || prompt('Enter a table name');

        // Generate CREATE TABLE statement
        const createTableSQL = `CREATE TABLE ${n} (\n${localHeaders
            .map(header => `    ${header} VARCHAR(255)`)
            .join(',\n')}\n);`;

        // Generate INSERT statements
        const insertStatements = localRows.map(row => {
            const values = localHeaders.map(header => {
                const value = row[header];
                // Handle different types of values
                if (value === null || value === undefined || value.toString().trim() === '') {
                    return 'NULL';
                }
                if (typeof value === 'number' || !isNaN(value)) {
                    return value;
                }
                // Convert to string and escape single quotes
                const stringValue = String(value);
                return `'${stringValue.replace(/'/g, "''").trim()}'`;
            });
            return `INSERT INTO ${n} (${localHeaders.join(', ')}) VALUES (${values.join(', ')});`;
        }).join('\n');

        const sql = `${createTableSQL}\n\n${insertStatements}`;
        const blob = new Blob([sql], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${n}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [localHeaders, localRows]);

    const deleteRow = useCallback(() => {
        if (!selectedCell || selectedCell.rowIndex < 0) return;

        setLocalRows(prevRows => {
            const newRows = [...prevRows];
            newRows.splice(selectedCell.rowIndex, 1);
            debouncedSetRows(newRows);
            return newRows;
        });
        setContextMenu(null);
    }, [selectedCell, debouncedSetRows]);

    const deleteColumn = useCallback(() => {
        if (!selectedCell || selectedCell.colIndex < 0) return;

        const headerToDelete = localHeaders[selectedCell.colIndex];

        setLocalHeaders(prevHeaders => {
            const newHeaders = [...prevHeaders];
            newHeaders.splice(selectedCell.colIndex, 1);
            debouncedSetHeaders(newHeaders);
            return newHeaders;
        });

        setLocalRows(prevRows => {
            const newRows = prevRows.map(row => {
                const newRow = { ...row };
                delete newRow[headerToDelete];
                return newRow;
            });
            debouncedSetRows(newRows);
            return newRows;
        });

        setContextMenu(null);
    }, [selectedCell, localHeaders, debouncedSetHeaders, debouncedSetRows]);

    const contextValue = useMemo(() => ({
        updateCell,
        updateHeader,
        handleContextMenu,
        headers: localHeaders,
        setInputFocused
    }), [updateCell, updateHeader, handleContextMenu, localHeaders]);

    return (
        <TableContext.Provider value={contextValue}>
            <div className="table-container">
                <table className="record-table">
                    <thead>
                        <tr>
                            {localHeaders.map((header, index) => (
                                <th
                                    key={`header-${index}`}
                                    onContextMenu={(e) => handleContextMenu(e, -1, index)}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'column', index)}
                                    onDragOver={(e) => handleDragOver(e, 'column', index)}
                                    onDrop={(e) => handleDrop(e, 'column', index)}
                                    onDragEnd={handleDragEnd}
                                    className={dragOverItem?.type === 'column' && dragOverItem.index === index ? 'drag-over' : ''}
                                    data-drag-type="column"
                                >
                                    <input
                                        type="text"
                                        value={header || ''}
                                        onChange={(e) => updateHeader(index, e.target.value)}
                                        placeholder={`Column ${index + 1}`}
                                        draggable={false}
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
                                    onDragStart={(e) => handleDragStart(e, 'row', rowIndex)}
                                    onDragOver={(e) => handleDragOver(e, 'row', rowIndex)}
                                    onDrop={(e) => handleDrop(e, 'row', rowIndex)}
                                    onDragEnd={handleDragEnd}
                                    isDragOver={dragOverItem?.type === 'row' && dragOverItem.index === rowIndex}
                                />
                            ))
                        ) : (
                            <tr>
                                <td colSpan={localHeaders.length} style={{ textAlign: 'center' }}>
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <ContextMenu
                    position={contextMenu}
                    onClose={() => setContextMenu(null)}
                    onInsertRow={insertRow}
                    onInsertColumn={insertColumn}
                    onDeleteRow={deleteRow}
                    onDeleteColumn={deleteColumn}
                    isHeaderRow={selectedCell?.rowIndex === -1}
                />

            </div>
            <div className="sql-container">
                <button onClick={() => generateSQL()}>
                    Generate SQL
                </button>
            </div>
        </TableContext.Provider>
    );
};

const RecordTable = ({ headers, rows, setHeaders, setRows, name = '' }) => {
    return (
        <TableProvider
            headers={headers}
            rows={rows}
            setHeaders={setHeaders}
            setRows={setRows}
            name={name}
        />
    );
};

export default RecordTable;