const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

const generateFinishedGoodsSQL = (headers, rows) => {
    // Database column definitions with their types
    const columnMap = {
        'unique_id': 'INT NOT NULL',
        'fng_name': 'VARCHAR(100)',
        'fng_item_number': 'VARCHAR(50)',
        'product_name': 'VARCHAR(100)',
        'case_cube': 'DECIMAL(10,2)',
        'case_length': 'DECIMAL(10,2)',
        'case_height': 'DECIMAL(10,2)',
        'updated_date': 'DATE',
        'discontinued_date': 'DATE',
        'cases_per_pallet': 'DECIMAL(10,2)',
        'case_weight': 'DECIMAL(10,6)',
        'storage_type': 'VARCHAR(50)',
        'special_instruction': 'TEXT',
        'ti_per_hi': 'DECIMAL(10,2)',
        'storage_condition': 'VARCHAR(50)'
    };

    // Create table SQL
    const createTableSQL = `CREATE TABLE demo_work_finished_goods (
    ${Object.entries(columnMap)
        .map(([col, type]) => `${col} ${type}`)
        .join(',\n    ')}
);`;

    // Function to normalize column names
    const normalizeColumnName = (name) => {
        if (!name) return '';
        return name.toString()
            .toLowerCase()
            .replace(/[\s\-()\/\\@#.,]+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .replace(/^_+|_+$/g, '');
    };

    // Create mapping between Excel headers and database columns
    const headerMapping = {};
    headers.forEach((header, index) => {
        const normalizedHeader = normalizeColumnName(header);
        for (const [dbColumn] of Object.entries(columnMap)) {
            if (normalizedHeader === dbColumn ||
                (dbColumn === 'fng_name' && (normalizedHeader.includes('finished_good') || normalizedHeader.includes('monster'))) ||
                (dbColumn === 'fng_item_number' && (normalizedHeader.includes('hbc') || normalizedHeader.includes('item_number'))) ||
                (dbColumn === 'product_name' && normalizedHeader.includes('name')) ||
                (dbColumn === 'case_cube' && normalizedHeader.includes('cube')) ||
                (dbColumn === 'case_length' && normalizedHeader.includes('length')) ||
                (dbColumn === 'case_height' && normalizedHeader.includes('height')) ||
                (dbColumn === 'storage_type' && normalizedHeader.includes('storage'))) {
                headerMapping[dbColumn] = index;
                break;
            }
        }
    });

    // Generate INSERT statements
    const insertSQL = rows.map((row, rowIndex) => {
        const values = Object.keys(columnMap).map(dbColumn => {
            const excelIndex = headerMapping[dbColumn];
            
            // If no mapping exists for this column, return NULL
            if (excelIndex === undefined) {
                return 'NULL';
            }

            const value = row[headers[excelIndex]];

            if (value === undefined || value === null || value === '') {
                return 'NULL';
            }

            // Handle special case for unique_id
            if (dbColumn === 'unique_id') {
                return rowIndex + 1;
            }

            // Handle date types
            if (columnMap[dbColumn].includes('DATE')) {
                const dateValue = formatDate(value);
                return dateValue ? `'${dateValue}'` : 'NULL';
            }

            // Handle numeric types
            if (columnMap[dbColumn].includes('INT') || columnMap[dbColumn].includes('DECIMAL')) {
                const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
                return isNaN(numValue) ? 'NULL' : numValue;
            }

            // Handle string types
            return `'${value.toString().replace(/'/g, "''").trim()}'`;
        });

        return `INSERT INTO demo_work_finished_goods (${Object.keys(columnMap).join(', ')})
VALUES (${values.join(', ')});`;
    }).join('\n');

    return {
        create: createTableSQL,
        insert: insertSQL
    };
};

export { generateFinishedGoodsSQL };