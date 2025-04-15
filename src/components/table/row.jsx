import React from 'react';
import { TableContext } from './index';

const Row = ({ rowIndex, row, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }) => {
    const { updateCell, handleContextMenu, headers, setInputFocused } = React.useContext(TableContext);

    return (
        <tr
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={isDragOver ? 'drag-over' : ''}
            data-drag-type="row"
        >
            {headers.map((header, colIndex) => (
                <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                >
                    <input
                        type="text"
                        value={row[header] || ''}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        placeholder="Enter value"
                        draggable={false}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                    />
                </td>
            ))}
        </tr>
    );
};

export default Row; 