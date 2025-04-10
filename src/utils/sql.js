// utils/sql.js

export const replaceHeader = (header) => {
    if (!header) return '';
    return header
        .toString()
        .toLowerCase()
        .replace(/[\s\-()\\@#.,]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/^_+|_+$/g, '');
};

export const generateInsertQuery = ({ columns, headers, selected }) => {
    if (!selected?.length || !columns || columns.length < 2) return "";

    const stepHeader = headers.find(header => replaceHeader(header.label) === replaceHeader('Step'));
    const typeHeader = headers.find(header => replaceHeader(header.label) === replaceHeader('Type'));
    const allowedIngredientFields = [
        replaceHeader('Ingredient Description'),
        replaceHeader('Action / Item Number')
    ];

    const selectedHeadersNormalized = selected.map(index => replaceHeader(headers[index]?.label));
    const isOnlyIngredientSelection = selectedHeadersNormalized.every(h =>
        allowedIngredientFields.includes(h)
    );

    const ingredientHeader = headers.find(header =>
        allowedIngredientFields.includes(replaceHeader(header.label))
    );

    const ingredientIndex = ingredientHeader?.value;
    const selectedIsIngredient = isOnlyIngredientSelection && ingredientHeader !== undefined;

    if (!stepHeader || !typeHeader) return "";

    const stepIndex = stepHeader.value;
    let values = [];
    let lastIngredient = '';
    const seen = new Set();

    for (let i = 1; i < columns.length; i++) {
        const row = columns[i];
        const stepValue = row[stepIndex]?.toString().trim();

        if (selectedIsIngredient && ingredientIndex !== undefined) {
            const ingredient = row[ingredientIndex]?.toString().trim();
            const isStepStart = /^\d+(\.0)?$/.test(stepValue);

            if (isStepStart && ingredient !== lastIngredient) {
                const rowValues = selected.map(index => {
                    let cell = row[index];
                    if (typeof cell === 'string') cell = cell.trim().replace(/'/g, "''");
                    return `'${cell ?? ''}'`;
                });

                const rowString = rowValues.join(', ');
                if (!seen.has(rowString)) {
                    values.push(`(${rowString})`);
                    seen.add(rowString);
                    lastIngredient = ingredient;
                }
            }
        } else {
            const rowValues = selected.map(index => {
                let cell = row[index];
                if (typeof cell === 'string') cell = cell.trim().replace(/'/g, "''");
                return `'${cell ?? ''}'`;
            });

            if (rowValues.some(val => val !== "''")) {
                values.push(`(${rowValues.join(', ')})`);
            }
        }
    }

    return `\n\n-- INSERT INTO\nINSERT INTO \`${selectedIsIngredient ? 'batch_instructions' : 'batch_ingredients'}\` (${selectedHeadersNormalized.map(h => `\`${h}\``).join(', ')})\nVALUES\n${values.join(',\n')};`;
};

export const generateCreateTableSQL = ({ headers, selected }) => {
    const selectedHeadersNormalized = selected.map(index => replaceHeader(headers[index]?.label));
    if (!selectedHeadersNormalized.length) return "";

    const allowedIngredientFields = [
        replaceHeader('Ingredient Description'),
        replaceHeader('Ingredient Desc'),
        replaceHeader('Action / Item Number'),
        replaceHeader('Action')
    ];

    const isOnlyIngredientSelection = selectedHeadersNormalized.every(h =>
        allowedIngredientFields.includes(h)
    );

    const tableName = isOnlyIngredientSelection ? 'batch_instructions' : 'batch_ingredients';

    return `-- BATCH INSTRUCTION TABLE SQL\nCREATE TABLE \`${tableName}\` (\n  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n  ${selectedHeadersNormalized.map(h => `\`${h}\` VARCHAR(255)`).join(',\n  ')}\n);`;
};

// utils/dynamicSql.js

export const sanitizeColumnName = (name) =>
    name
        ?.toString()
        .toLowerCase()
        .replace(/[\s\-()\\@#.,]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/^_+|_+$/g, '') || 'column';

const inferType = (values) => {
    let hasDecimal = false;
    let hasInt = true;
    let hasDate = true;

    for (const val of values) {
        const str = val?.toString().trim();
        if (str === '' || str == null) continue;

        // Check for date
        if (hasDate && isNaN(Date.parse(str))) {
            hasDate = false;
        }

        // Check for numeric
        if (!isNaN(str)) {
            if (str.includes('.')) hasDecimal = true;
        } else {
            hasInt = false;
        }
    }

    if (hasDate) return 'DATE';
    if (hasInt) return 'INT';
    if (hasDecimal) return 'DECIMAL(10, 2)';
    return 'VARCHAR(255)';
};

export const generateDynamicSQL = ({ sheetName = 'dynamic_table', headers = [], columns = [], selected = [] }) => {
    const selectedHeaders = selected.map(i => headers[i]);
    const sanitizedNames = selectedHeaders.map(h => sanitizeColumnName(h.label));
    const columnIndices = selectedHeaders.map(h => h.value);

    // Infer types using first 30 rows (excluding header)
    const sampleSize = Math.min(30, columns.length - 1);
    const inferredTypes = columnIndices.map((colIdx) => {
        const sampleValues = columns.slice(1, sampleSize + 1).map(row => row[colIdx]);
        return inferType(sampleValues);
    });

    const tableName = sanitizeColumnName(sheetName) || 'dynamic_table';

    // CREATE TABLE statement
    const createSQL = `CREATE TABLE \`${tableName}\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    ${sanitizedNames.map((name, i) => `\`${name}\` ${inferredTypes[i]}`).join(',\n  ')}
  );`;

    // INSERT INTO statements
    const insertRows = [];

    for (let i = 1; i < columns.length; i++) {
        const row = columns[i];
        const values = columnIndices.map(idx => {
            let cell = row[idx];
            if (cell == null || cell === '') return 'NULL';

            const str = cell.toString().trim();
            const type = inferredTypes[columnIndices.indexOf(idx)];

            if (type === 'INT' || type === 'DECIMAL(10, 2)') {
                return isNaN(str) ? `'${str.replace(/'/g, "''")}'` : str;
            }
            if (type === 'DATE') {
                const parsed = Date.parse(str);
                return isNaN(parsed) ? 'NULL' : `'${new Date(parsed).toISOString().split('T')[0]}'`;
            }

            return `'${str.replace(/'/g, "''")}'`;
        });

        if (values.some(v => v !== 'NULL')) {
            insertRows.push(`(${values.join(', ')})`);
        }
    }

    const insertSQL = `INSERT INTO \`${tableName}\` (${sanitizedNames.map(name => `\`${name}\``).join(', ')})\nVALUES\n${insertRows.join(',\n')};`;

    return `${createSQL}\n\n${insertSQL}`;
};
