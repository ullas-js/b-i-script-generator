import { useMemo, useState } from "react";
import Modal from "./modal";
import Select from "./select";
import './ui.css'

const isAmount = (value) => {
    if (typeof value === 'number') return true;

    if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').trim();

        // Check if it contains currency symbols
        if (/\p{Sc}/u.test(cleaned)) return true;

        // Check for number-like pattern
        if (/^\d+(\.\d{1,2})?$/.test(cleaned)) return true;
    }

    return false;
};


// Function to clean and convert a currency string to a number
const parseAmount = (value) => {
    if (value == null) return 0;
    const cleanedValue = String(value).replace(/[\p{Sc},]/gu, '').trim();
    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
};


const parsePackingLabel = (text) => {
    const regex = /^\(([\d.]+)\)\s+([\d.,]+)\s*(kg|g|lb)?\s*(.*?)\s*(\(.*?\))?$/i;
    const match = text?.match(regex);

    if (!match) return null;

    const count = parseFloat(match[1]);
    const weight = match[2];
    const unit = match[3] || '';
    const type = match[4]?.trim().toLowerCase();

    return {
        key: `${weight} ${unit} ${type}`.trim(), // Exclude anything in ( )
        count,
        display: (total) => `(${total}) ${weight} ${unit} ${type}`.trim()
    };
};


const BatchExtraction = ({ isOpen, onClose, columns, setColumns }) => {
    const [merge, setMerge] = useState({
        with: '',
        addition: [], // Columns to aggregate; other columns will retain their first occurrence's value
    });

    const headers = useMemo(() => (
        columns?.[0]?.map((item, index) => ({ label: item, value: index })) || []
    ), [columns]);

    const mergeRows = () => {
        if (!merge.with) {
            console.warn("Please select a column to merge with and at least one column to aggregate.");
            return [];
        }

        const mergeIndex = parseInt(merge.with, 10);
        const additionIndices = merge.addition.map(index => parseInt(index, 10));

        const mergedData = {};
        const headerRow = columns[0];

        for (let i = 1; i < columns.length; i++) {
            const row = columns[i];
            const mergeKey = row[mergeIndex];

            if (!mergedData[mergeKey]) {
                mergedData[mergeKey] = [...row];
            } else {
                additionIndices.forEach(index => {
                    const existingVal = String(mergedData[mergeKey][index]).trim();
                    const newVal = String(row[index]).trim();

                    const parsedExisting = parsePackingLabel(existingVal);
                    const parsedNew = parsePackingLabel(newVal);

                    if (parsedExisting && parsedNew && parsedExisting.key === parsedNew.key) {
                        const total = parsedExisting.count + parsedNew.count;
                        mergedData[mergeKey][index] = parsedExisting.display(total);
                        return;
                    }

                    console.log("Existing:", existingVal, "isAmount:", isAmount(existingVal));

                    if (isAmount(existingVal)) {
                        const sum = parseAmount(existingVal) + parseAmount(newVal);
                        mergedData[mergeKey][index] = sum;
                    }
                });
            }
        }

        const result = [headerRow, ...Object.values(mergedData)];
        return result;
    };


    const handleMerge = () => {
        const mergedColumns = mergeRows();
        console.log("Merged Data:", mergedColumns);
        setColumns(mergedColumns);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h1>Batch Instruction</h1>

            <div className="instruction-m-container">
                <div>
                    Merge With:&nbsp;
                    {headers.length > 0 && (
                        <Select
                            value={merge.with}
                            setValue={(value) => setMerge(prev => ({ ...prev, with: value }))}
                            options={headers}
                        />
                    )}
                </div>

                <div>
                    Columns to Aggregate:&nbsp;
                    {headers.length > 0 && (
                        <Select
                            value={merge.addition}
                            setValue={(value) => setMerge(prev => ({ ...prev, addition: value }))}
                            options={headers}
                            multiple
                        />
                    )}
                </div>

                <button onClick={handleMerge}>Merge Rows</button>
            </div>
        </Modal>
    );
};

export default BatchExtraction;
