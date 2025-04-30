import React from 'react';
import RecordTable from './index';

const DataTable = ({ 
    data, 
    hasHeader, 
    colDirection, 
    onDataChange,
    previousData // Add support for previous data to merge with
}) => {
    const mergedData = React.useMemo(() => {
        if (!data || data.length === 0) return [];
        if (!previousData || previousData.length === 0) return data;

        // If we have previous data, merge it with current data
        const headers = hasHeader ? data[0] : data[0].map((_, i) => `Column ${i + 1}`);
        const prevHeaders = hasHeader ? previousData[0] : previousData[0].map((_, i) => `Column ${i + 1}`);

        // Create a map of column indices that match between the two datasets
        const columnMap = new Map();
        headers.forEach((header, idx) => {
            const matchingIdx = prevHeaders.findIndex(h => h === header);
            if (matchingIdx !== -1) {
                columnMap.set(idx, matchingIdx);
            }
        });

        // Start with previous data
        const result = [...previousData];

        // Add new data rows, merging matching columns
        const dataToMerge = hasHeader ? data.slice(1) : data;
        dataToMerge.forEach(row => {
            const newRow = Array(headers.length).fill('');
            // Copy values from matching columns
            columnMap.forEach((prevIdx, currIdx) => {
                newRow[prevIdx] = row[currIdx];
            });
            // Add any non-matching columns as new columns
            headers.forEach((header, idx) => {
                if (!columnMap.has(idx)) {
                    newRow.push(row[idx]);
                    result[0].push(header); // Add new header
                }
            });
            result.push(newRow);
        });

        return result;
    }, [data, previousData, hasHeader]);

    const transformedData = React.useMemo(() => {
        if (!mergedData || mergedData.length === 0) return [];
        
        // For horizontal direction, return data as is
        if (colDirection === 'horizontal') return mergedData;

        // For vertical direction, transpose the data matrix
        const maxLength = Math.max(...mergedData.map(row => row.length));
        const transposed = Array(maxLength).fill().map(() => Array(mergedData.length).fill(''));
        
        for (let i = 0; i < mergedData.length; i++) {
            for (let j = 0; j < mergedData[i].length; j++) {
                transposed[j][i] = mergedData[i][j] || '';
            }
        }
        
        return transposed;
    }, [mergedData, colDirection]);

    const headers = React.useMemo(() => {
        if (!transformedData || transformedData.length === 0) return [];
        return hasHeader ? transformedData[0].map(h => h?.toString() || '') : 
                         transformedData[0].map((_, i) => `Column ${i + 1}`);
    }, [transformedData, hasHeader]);

    const rows = React.useMemo(() => {
        if (!transformedData || transformedData.length === 0) return [];
        const dataToProcess = hasHeader ? transformedData.slice(1) : transformedData;

        return dataToProcess.map(row => {
            const rowObj = {};
            headers.forEach((header, idx) => {
                rowObj[header] = row[idx]?.toString() || '';
            });
            return rowObj;
        });
    }, [transformedData, headers, hasHeader]);

    const handleHeadersChange = (newHeaders) => {
        const updatedData = [newHeaders];
        
        // Add data rows
        rows.forEach(row => {
            updatedData.push(newHeaders.map(header => row[header] || ''));
        });

        // If vertical, transpose back
        if (colDirection === 'vertical') {
            const transposed = Array(updatedData[0].length).fill().map(() => Array(updatedData.length).fill(''));
            for (let i = 0; i < updatedData.length; i++) {
                for (let j = 0; j < updatedData[i].length; j++) {
                    transposed[j][i] = updatedData[i][j] || '';
                }
            }
            onDataChange(transposed);
        } else {
            onDataChange(updatedData);
        }
    };

    const handleRowsChange = (newRows) => {
        const updatedData = hasHeader ? [headers] : [];
        const rowsArray = newRows.map(row => headers.map(header => row[header] || ''));
        updatedData.push(...rowsArray);

        // If vertical, transpose back
        if (colDirection === 'vertical') {
            const transposed = Array(updatedData[0].length).fill().map(() => Array(updatedData.length).fill(''));
            for (let i = 0; i < updatedData.length; i++) {
                for (let j = 0; j < updatedData[i].length; j++) {
                    transposed[j][i] = updatedData[i][j] || '';
                }
            }
            onDataChange(transposed);
        } else {
            onDataChange(updatedData);
        }
    };

    return (
        <div className="data-table-wrapper">
            <RecordTable
                headers={headers}
                rows={rows}
                setHeaders={handleHeadersChange}
                setRows={handleRowsChange}
            />
        </div>
    );
};

export default DataTable;