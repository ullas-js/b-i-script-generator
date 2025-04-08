export default function useMergeSheetRow(columns) {
    if (columns.length === 0) return { columns: [] };

    // Extract the header row
    const headers = columns[0];

    // Determine the indexes of the required columns
    const instructionIdIndex = headers.indexOf('Ingredient Description');
    const quantityDescIndex = headers.indexOf('Additions');

    // Check if both columns exist
    if (instructionIdIndex === -1 || quantityDescIndex === -1) {
        console.error('Required columns not found.');
        return { columns };
    }

    // Function to parse the quantity description
    function parseQuantityDescription(description) {
        const match = description.match(/\(([\d.]+)\)\s*([\d.]+)\s*kg\s*(\w+)\s*(\w+)/i);
        if (match) {
            const count = parseFloat(match[1]);
            const weightPerUnit = parseFloat(match[2]);
            const unitName = match[3];
            const type = match[4].toLowerCase();
            const totalWeight = type === 'full' ? count * weightPerUnit : count * weightPerUnit * 0.63;
            return { totalWeight, unitName };
        }
        return { totalWeight: 0, unitName: '' };
    }

    // Function to merge rows based on instruction identifier
    function mergeRows(rows) {
        const instructionMap = new Map();

        rows.slice(1).forEach(row => {
            const instructionId = row[instructionIdIndex];
            const quantityDescription = row[quantityDescIndex];

            const { totalWeight, unitName } = parseQuantityDescription(quantityDescription);

            if (!instructionMap.has(instructionId)) {
                const newRow = [...row];
                newRow.totalWeight = totalWeight;
                newRow.unitName = unitName;
                instructionMap.set(instructionId, newRow);
            } else {
                const existingRow = instructionMap.get(instructionId);
                existingRow.totalWeight += totalWeight;
                if (existingRow.unitName !== unitName) {
                    console.warn(`Unit name mismatch for instruction ${instructionId}: ${existingRow.unitName} vs ${unitName}`);
                }
            }
        });

        const mergedRows = Array.from(instructionMap.values()).map(item => {
            const updatedRow = [...item];
            updatedRow[quantityDescIndex] = `${item.totalWeight.toFixed(2)} kg ${item.unitName}`;
            return updatedRow;
        });

        return [headers, ...mergedRows];
    }

    const mergedColumns = mergeRows(columns);

    return {
        columns: mergedColumns
    };
}
