import { useContext } from "react";
import { TableContext } from "./index";

const Row = ({ row, rowIndex }) => {
    const { updateCell } = useContext(TableContext);
    
    if (!row || typeof row !== 'object') {
        return null;
    }

    return (
        <tr>
            {Object.keys(row).map((key, index) => (
                <td key={`cell-${rowIndex}-${index}-${key}`}>
                    <input
                        type="text"
                        value={row[key] || ''}
                        onChange={(e) => {
                            e.preventDefault();
                            updateCell(rowIndex, index, e.target.value);
                        }}
                        placeholder={`Row ${rowIndex + 1}, ${key}`}
                    />
                </td>
            ))}
        </tr>
    );
};

export default Row; 