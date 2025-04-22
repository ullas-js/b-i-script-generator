const normalizeColumnName = (name) => {
    if (!name) return '';
    return name.toString()
        .toLowerCase()
        .replace(/[\s\-()\/\\@#.,]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/^_+|_+$/g, '');
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

export const generateRawMaterialSQL = (data, selected, headers) => {
    if (!data || !selected || !headers) return '';
    
    const columns = selected.map(index => {
        const header = headers[index];
        return header ? header.label.toLowerCase().replace(/[\s\-()\/\\@#.,]+/g, '_').replace(/[^a-z0-9_]/g, '') : `column_${index}`;
    });

    const createTableSQL = `CREATE TABLE raw_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ${columns.map(col => `${col} VARCHAR(255)`).join(',\n        ')}
    );`;

    const values = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowValues = selected.map(index => {
            const value = row[index];
            if (value == null || value === '') return 'NULL';
            
            // Try to parse as date first
            const dateValue = formatDate(value);
            if (dateValue) return `'${dateValue}'`;
            
            // Handle other types
            return typeof value === 'number' ? value : `'${value.toString().replace(/'/g, "''").trim()}'`;
        });
        
        if (rowValues.some(v => v !== 'NULL')) {
            values.push(`(${rowValues.join(', ')})`);
        }
    }

    const insertSQL = `INSERT INTO raw_materials (${columns.join(', ')})
    VALUES\n    ${values.join(',\n    ')};`;

    return `${createTableSQL}\n\n${insertSQL}`;
};