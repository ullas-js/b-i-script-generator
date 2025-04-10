import * as XLSX from 'xlsx';

const sheetFormulasMap = new Map();

export const readExcelFile = (file, setQuery) => {
    const reader = new FileReader();

    reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, {
            type: 'binary',
            cellFormula: true
        });

        const sheets = workbook.SheetNames;

        sheets.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const formulas = XLSX.utils.sheet_to_formulae(sheet);
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            sheetFormulasMap.set(sheetName, { formulas, jsonData });

            const { stepsSQL, ingredientsSQL, instructionTemplatesSQL } = generateStepsSQL(jsonData, sheetName);

            if (stepsSQL.create && stepsSQL.insert) {
                console.log(`\n---- ${sheetName} ----`);
                console.log('-- Batch Instructions SQL --');
                console.log(stepsSQL.create);
                console.log(stepsSQL.insert);
            }

            if (ingredientsSQL.create && ingredientsSQL.insert) {
                console.log('-- Ingredients SQL --');
                console.log(ingredientsSQL.create);
                console.log(ingredientsSQL.insert);
            }

            if (instructionTemplatesSQL.create && instructionTemplatesSQL.insert) {
                console.log('-- Instruction Templates SQL --');
                console.log(instructionTemplatesSQL.create);
                console.log(instructionTemplatesSQL.insert);
            }

            setQuery((prev) => {
                return [
                    prev,
                    `-- ${sheetName} --`,
                    stepsSQL.create,
                    stepsSQL.insert,
                    ingredientsSQL.create,
                    ingredientsSQL.insert,
                    instructionTemplatesSQL.create,
                    instructionTemplatesSQL.insert
                ].filter(Boolean).join('\n\n');
            });
        });
    };

    reader.readAsBinaryString(file);
};

const escapeSQL = (v) =>
    v !== undefined && v !== null
        ? `'${String(v).replace(/'/g, "''").trim()}'`
        : 'NULL';

const cleanDescription = (text) => {
    if (!text) return '';
    return text.replace(/\s*\([^()]*\)\s*/g, '').trim(); // removes text inside parentheses
};

const normalizeDescription = (text) => {
    return (text || '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\bpart\.?\s*\d*\b/gi, '')
        .replace(/Part\.?$/gi, '')
        .replace(/Part\.?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const ingredientKey = (ing) => {
    return [
        ing.step_no,
        normalizeDescription(ing.incredient_description),
        ing.type,
        ing.speed,
        ing.temp,
        ing.concentration,
        ing.vendor
    ].join('|').toLowerCase();
};

const generateStepsSQL = (data, sheetName = '') => {
    const sheetFormulas = sheetFormulasMap.get(sheetName)?.formulas || [];
    const formulaMap = new Map();
    sheetFormulas.forEach(f => {
        const [cell, formula] = f.split('=');
        if (cell && formula) formulaMap.set(cell.trim(), '=' + formula.trim());
    });

    const templateMap = new Map();

    const headerKeywords = [
        'step', 'step no', 'step number', 'seq', 'sequence',
        'instruction', 'action', 'procedure',
        'material', 'description', 'material description',
        'vendor', 'type', 'speed', 'temp', 'temperature',
        'concentration', 'mixer'
    ];

    let headerRowIndex = -1;
    let headerMap = {};

    for (let i = 0; i < Math.min(40, data.length); i++) {
        const row = data[i];
        const lowerRow = row.map(cell => (cell || '').toString().toLowerCase().trim());
        const hasStep = lowerRow.some(cell => cell.includes('step') || cell.includes('seq'));
        const hasAction = lowerRow.some(cell => headerKeywords.some(k => cell.includes(k)));

        if (hasStep && hasAction) {
            headerRowIndex = i;
            lowerRow.forEach((col, idx) => {
                if (col) headerMap[col] = idx;
            });
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.warn(`⚠️ No valid header found in sheet: ${sheetName}`);
        return {
            stepsSQL: { create: '', insert: '' },
            ingredientsSQL: { create: '', insert: '' },
            instructionTemplatesSQL: { create: '', insert: '' }
        };
    }

    const getIndex = (key) => {
        const keys = Object.keys(headerMap);
        const normalizedKey = key.toLowerCase();
        const found = keys.find(k => k.includes(normalizedKey));
        return found !== undefined ? headerMap[found] : -1;
    };

    const actionIdx = getIndex('action') !== -1
        ? getIndex('action')
        : getIndex('instruction');

    const fieldIndexes = {
        vendor: getIndex('vendor'),
        incredient_description: getIndex('description'),
        type: getIndex('type'),
        speed: getIndex('speed'),
        temp: getIndex('temp'),
        mass: getIndex('mass'),
        concentration: getIndex('concentration'),
        mixer_needed: getIndex('mixer')
    };

    const steps = [];
    const ingredientMap = new Map();
    let currentStepNo = 0;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        const actionCell = row[actionIdx];
        const action = typeof actionCell === 'string' ? actionCell.trim() : '';

        const isInstruction = action.length > 20;
        const isCode = /^[A-Z0-9]+$/.test(action) && action.length < 20;
        const isNumeric = /^\d+(\.\d+)?$/.test(action);

        if (isInstruction && !isCode && !isNumeric) {
            currentStepNo++;
            steps.push({ step_no: currentStepNo, action });

            const cellAddress = XLSX.utils.encode_cell({ r: i, c: actionIdx });
            const formula = formulaMap.get(cellAddress);

            if (formula && formula.includes('&')) {
                const generalized = formula
                    .replace(/"\s*&\s*/g, '')
                    .replace(/\s*&\s*"/g, '')
                    .replace(/&/g, '')
                    .replace(/"([^"]*)"/g, '$1')
                    .replace(/\b([A-Z]+\d+)\b/g, '{$1}')
                    .trim();

                if (!templateMap.has(generalized)) {
                    templateMap.set(generalized, true);
                }
            }

        } else if (action) {
            const ing = {
                step_no: currentStepNo,
                vendor: row[fieldIndexes.vendor] || '',
                incredient_description: normalizeDescription(cleanDescription(row[fieldIndexes.incredient_description] || '')),
                type: row[fieldIndexes.type] || '',
                speed: row[fieldIndexes.speed] || '',
                temp: row[fieldIndexes.temp] || '',
                mass: row[fieldIndexes.mass] || '',
                concentration: row[fieldIndexes.concentration] || '',
                mixer_needed: row[fieldIndexes.mixer_needed] || ''
            };

            const existing = Array.from(ingredientMap.values()).find(
                i => Object.keys(i).filter(k => k !== 'step_no').every(k => i[k] === ing[k])
            );

            if (!existing) {
                ingredientMap.set(ingredientKey(ing), ing);
            }
        }
    }

    const ingredients = Array.from(ingredientMap.values());

    const stepsSQL = {
        create: `
        CREATE TABLE batch_instructions (
          step_no INT,
          action TEXT
        );`.trim(),

        insert: steps
            .map(({ step_no, action }) =>
                `INSERT INTO batch_instructions (step_no, action) VALUES (${step_no}, ${escapeSQL(action)});`
            )
            .join('\n')
    };

    const ingredientsSQL = {
        create: `
        CREATE TABLE ingredients (
          step_no INT,
          vendor TEXT,
          incredient_description TEXT,
          type TEXT,
          speed TEXT,
          temp TEXT,
          concentration TEXT,
          mixer_needed TEXT
        );`.trim(),

        insert: ingredients
            .map(ing => {
                const values = [
                    ing.step_no,
                    escapeSQL(ing.vendor),
                    escapeSQL(ing.incredient_description),
                    escapeSQL(ing.type),
                    escapeSQL(ing.speed),
                    escapeSQL(ing.temp),
                    escapeSQL(ing.concentration),
                    escapeSQL(ing.mixer_needed)
                ];
                return `INSERT INTO ingredients VALUES (${values.join(', ')});`;
            })
            .join('\n')
    };

    const instructionTemplatesSQL = {
        create: `
        CREATE TABLE instruction_templates (
          id INT PRIMARY KEY AUTO_INCREMENT,
          template TEXT
        );`.trim(),

        insert: Array.from(templateMap.keys())
            .map((tpl, idx) =>
                `INSERT INTO instruction_templates (id, template) VALUES (${idx + 1}, ${escapeSQL(tpl)});`
            )
            .join('\n')
    };

    return { stepsSQL, ingredientsSQL, instructionTemplatesSQL };
};
