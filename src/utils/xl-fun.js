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
        const sql = {
            instructions: { create: '', insert: '' },
            ingredients: { create: '', insert: '' },
            templates: { create: '', insert: '' }
        };

        const table = {
            instructions: {
                headers: ['Fngnumber', 'Step', 'stepseq', 'Action'],
                rows: []
            },
            ingredients: {
                headers: ['Fngnumber', 'Step', 'stepseq', 'rmstepseq', 'rawmaterial', 'Vendor', 'Incredient_description', 'Type', 'Speed', 'Temp', 'Concentration', 'Mixerneeded'],
                rows: []
            }
        }

        const queryMap = new Map();
        const tableMap = new Map();

        for (const sheetName of sheets) {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            const formulaMap = new Map();
            Object.entries(sheet).forEach(([cell, cellData]) => {
                if (cellData && cellData.f) {
                    formulaMap.set(cell, '=' + cellData.f);
                }
            });

            sheetFormulasMap.set(sheetName, { formulaMap, jsonData });

            const { stepsSQL, ingredientsSQL, instructionTemplatesSQL, instructionTable, incredientTable } = generateStepsSQL(jsonData, sheetName);

            queryMap.set(sheetName, { stepsSQL, ingredientsSQL, instructionTemplatesSQL });
            tableMap.set(sheetName, { instructionTable, incredientTable });

            // Append only if insert statements exist
            if (stepsSQL.insert) {
                sql.instructions.create ||= stepsSQL.create;
                sql.instructions.insert += stepsSQL.insert + '\n';
                table.instructions.rows.push(...instructionTable.rows);
            }

            if (ingredientsSQL.insert) {
                sql.ingredients.create ||= ingredientsSQL.create;
                sql.ingredients.insert += ingredientsSQL.insert + '\n';
                table.ingredients.rows.push(...incredientTable.rows);
            }

            if (instructionTemplatesSQL.insert) {
                sql.templates.create ||= instructionTemplatesSQL.create;
                sql.templates.insert += instructionTemplatesSQL.insert + '\n';
            }
        }

        setQuery({ sql, table });
    };

    reader.readAsBinaryString(file);
};

const escapeSQL = (v) =>
    v !== undefined && v !== null
        ? `'${String(v).replace(/'/g, "''").trim()}'`
        : 'NULL';

const cleanDescription = (text) => {
    if (!text) return '';
    return text.replace(/\s*\([^()]*\)\s*/g, '').trim();
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

const alignIngredientsWithBatchInstructions = (batchInstructions, ingredients) => {
    const alignedIngredients = [];

    const seen = new Set();

    batchInstructions.forEach((instruction) => {
        const { action: Action } = instruction;

        ingredients.forEach((ingredient) => {
            const { rawmaterial } = ingredient;

            if (!seen.has(rawmaterial)) {
                alignedIngredients.push({
                    ...ingredient,
                    action: Action
                });
                seen.add(rawmaterial);
            }
        });
    });

    return alignedIngredients;
};

const generateStepsSQL = (data, sheetName = '') => {
    const { formulaMap = new Map() } = sheetFormulasMap.get(sheetName) || {};
    const templateMap = new Map();

    const headerKeywords = [
        'Fngnumber', 'step', 'step no', 'step number', 'seq', 'sequence',
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

    const normalize = (str) =>
        str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const getIndex = (key) => {
        const normalizedKey = normalize(key);
        const keys = Object.keys(headerMap);
        const found = keys.find(k => normalize(k).includes(normalizedKey));
        return found !== undefined ? headerMap[found] : -1;
    };

    let actionIdx = getIndex('action');
    if (actionIdx === -1) actionIdx = getIndex('instruction');
    if (actionIdx === -1) actionIdx = getIndex('ingredient');

    if (actionIdx === -1) {
        console.warn(`⚠️ No action/instruction/ingredient column found in sheet: ${sheetName}`);
        return {
            stepsSQL: { create: '', insert: '' },
            ingredientsSQL: { create: '', insert: '' },
            instructionTemplatesSQL: { create: '', insert: '' }
        };
    }
console.log('actionIdx', actionIdx)
    const fieldIndexes = {
        action: actionIdx,
        vendor: getIndex('vendor'),
        incredient_description: getIndex('description'),
        type: getIndex('type'),
        speed: getIndex('speed'),
        temp: getIndex('temp'),
        mass: getIndex('mass'),
        concentration: getIndex('concentration'),
        mixer_needed: getIndex('to_dissolve')
    };

    const steps = [];
    const ingredientMap = new Map();
    const stepIngredientSeqMap = new Map(); // Track ingredient sequence per step
    const stepIdx = getIndex('step');
    let currentStepNo = null;
    let currentStepSeq = 1;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        const rawStep = row[stepIdx];
        const stepIsHeader = rawStep !== undefined && rawStep !== null && rawStep !== '' &&
            /^\d+(\.0+)?$/.test(String(rawStep).trim());

        if (stepIsHeader) {
            const action = String(row[actionIdx] || '').trim();
            if (action.toLowerCase().trim().startsWith('upon') || action.toLowerCase().trim().startsWith('rinse')) {
                currentStepSeq += 1;
            } else {
                currentStepSeq = 1;
                currentStepNo = parseInt(rawStep);
            }

            if (action) {
                // Always add the step, even if the action is the same, if ingredients differ
                steps.push({ step_no: currentStepNo, step_seq: currentStepSeq, action });
            }

            const cellAddress = XLSX.utils.encode_cell({ r: i, c: actionIdx });
            const formula = formulaMap.get(cellAddress);

            if (formula && formula.includes('&')) {
                let generalized = formula
                    .replace(/^=/, '')
                    .replace(/TEXT\(\s*([^,]+).*?\)/gi, '$1')
                    .replace(/"\s*&\s*/g, '')
                    .replace(/\s*&\s*"/g, '')
                    .replace(/&/g, '')
                    .replace(/"([^"]*)"/g, '$1')
                    .trim();

                const cellRefRegex = /\$?([A-Z]+)\$?(\d+)/g;
                generalized = generalized.replace(cellRefRegex, (_, col, row) => {
                    const colIndex = XLSX.utils.decode_col(col);
                    const rowIndex = parseInt(row, 10) - 1;

                    let placeholder = '';
                    if (data[headerRowIndex]?.[colIndex]) {
                        placeholder = String(data[headerRowIndex][colIndex]).toLowerCase().trim();
                    }
                    if (!placeholder && data[rowIndex]?.[colIndex]) {
                        placeholder = String(data[rowIndex][colIndex]).toLowerCase().trim();
                    }
                    placeholder = placeholder.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

                    return `{${placeholder || 'unknown'}}`;
                });

                if (!templateMap.has(generalized)) {
                    templateMap.set(generalized, true);
                }
            }
        } else if (currentStepNo !== null) {
            const currentSeq = (stepIngredientSeqMap.get(currentStepNo) || 1);
            stepIngredientSeqMap.set(currentStepNo, currentSeq);
            const ing = {
                step_no: currentStepNo,
                step_seq: currentStepSeq,
                rmstepseq: currentSeq, // Ensure rmstepseq starts from 1
                rawmaterial: `${row[fieldIndexes.action]}` || '',
                vendor: row[fieldIndexes.vendor] || '',
                incredient_description: normalizeDescription(cleanDescription(row[fieldIndexes.incredient_description] || '')),
                type: row[fieldIndexes.type] || '',
                speed: row[fieldIndexes.speed] || '',
                temp: row[fieldIndexes.temp] || '',
                mass: row[fieldIndexes.mass] || '',
                concentration: row[fieldIndexes.concentration] || '',
                mixer_needed: row[fieldIndexes.mixer_needed] || ''
            };

            ingredientMap.set(`${currentStepNo}_${i}`, ing);
        }
    }

    const ingredients = Array.from(ingredientMap.values());
    const alignedIngredients = alignIngredientsWithBatchInstructions(steps, ingredients);

    const fngNumber = prompt('Enter Fngnumber: ');

    // Define headers first
    const instruction_headers = ['Fngnumber', 'Step', 'stepseq', 'Action'];
    const incredient_headers = ['Fngnumber', 'Step', 'stepseq', 'rmstepseq', 'rawmaterial', 'Vendor', 'Incredient_description', 'Type', 'Speed', 'Temp', 'Concentration', 'Mixerneeded'];

    // Create initial instruction rows
    const instruction_rows = steps.map((step) => ({
        Fngnumber: fngNumber,
        Step: step.step_no,
        stepseq: step.step_seq,
        Action: step.action
    }));

    // Create initial ingredient rows

    let lastStepNo = null;
    let lastStepSeq = null;
    let rmStepCounter = 1;
    let incredient_rows = alignedIngredients.map((ing) => {
        const step_no = parseInt(ing.step_no);
        const step_seq = parseInt(ing.step_seq);
        const rawmaterial = ing.rawmaterial;

        // Reset rmstepseq counter if new step_seq begins
        if (lastStepNo !== step_no || step_seq !== lastStepSeq) {
            rmStepCounter = 1;
            lastStepSeq = step_seq;
            lastStepNo = step_no;
        }

        return {
            Fngnumber: fngNumber,
            Step: step_no,
            stepseq: step_seq,
            rmstepseq: rmStepCounter++,
            rawmaterial: rawmaterial,
            Vendor: ing.vendor,
            Incredient_description: ing.incredient_description,
            Type: ing.type,
            Speed: ing.speed,
            Temp: ing.temp,
            Concentration: ing.concentration,
            Mixerneeded: ing.mixer_needed
        };
    });

    // Now handle duplicates and step number remapping
    const seenInstructions = new Set();
    const stepNumberMap = new Map();
    let newStepCounter = 1;

    // Filter out duplicate instructions and create step number mapping
    const filteredInstructions = instruction_rows.reduce((acc, step) => {
        const key = `${step.Action.trim()}`;
        if (!seenInstructions.has(key)) {
            seenInstructions.add(key);
            if (!stepNumberMap.has(step.Step)) {
                stepNumberMap.set(step.Step, newStepCounter++);
            }
            acc.push({
                ...step,
                Step: stepNumberMap.get(step.Step)
            });
        }
        return acc;
    }, []);

    // Update ingredient step numbers using the same mapping
    incredient_rows = incredient_rows.filter(ing => 
        stepNumberMap.has(ing.Step) // Only keep ingredients that belong to kept steps
    ).map(ing => ({
        ...ing,
        Step: stepNumberMap.get(ing.Step)
    }));

    const instructionTable = {
        headers: instruction_headers,
        rows: filteredInstructions
    };

    const incredientTable = {
        headers: incredient_headers,
        rows: incredient_rows
    };

    const stepsSQL = {
        create: `
        CREATE TABLE rcp_btch_card_instr (
            Fngnumber INT,
            Step INT,
            stepseq INT,
            Action TEXT
        );`.trim(),

        insert: steps
            .map(({ action }, index) => {
                const step_no = index + 1; // Use index + 1 as step number
                return `INSERT INTO rcp_btch_card_instr (Fngnumber, Step, stepseq, Action) VALUES (${fngNumber}, ${escapeSQL(step_no)}, ${escapeSQL(step_no)}, ${escapeSQL(index + 1)}, ${escapeSQL(action)});`;
            })
            .join('\n')
    };


    const ingredientsSQL = {
        create: `
        CREATE TABLE rcp_batch_step_rm_dtl (
          Fngnumber INT,
          Step INT,
          stepseq INT,
          rmstepseq INT,
          rawmaterial VARCHAR(255),
          Vendor VARCHAR(255),
          Incredient_description VARCHAR(255),
          Type VARCHAR(255),
          Speed VARCHAR(255),
          Temp VARCHAR(255),
          Concentration VARCHAR(255),
          Mixerneeded VARCHAR(255)
        );`.trim(),

        insert: alignedIngredients
            .map(ing => {
                const values = [
                    fngNumber,
                    parseInt(ing.step_no),
                    parseInt(ing.step_seq),
                    parseInt(ing.rmstepseq),
                    escapeSQL(ing.rawmaterial),
                    escapeSQL(ing.vendor),
                    escapeSQL(ing.incredient_description),
                    escapeSQL(ing.type),
                    escapeSQL(ing.speed),
                    escapeSQL(ing.temp),
                    escapeSQL(ing.concentration),
                    escapeSQL(ing.mixer_needed)
                ];
                return `INSERT INTO rcp_batch_step_rm_dtl VALUES (${values.join(', ')});`;
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

    return { stepsSQL, ingredientsSQL, instructionTemplatesSQL, incredientTable, instructionTable };
};
