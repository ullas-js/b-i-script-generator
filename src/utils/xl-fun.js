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
        const result = {
            instructions: { create: '', insert: '' },
            ingredients: { create: '', insert: '' },
            templates: { create: '', insert: '' }
        };

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

            const { stepsSQL, ingredientsSQL, instructionTemplatesSQL } = generateStepsSQL(jsonData, sheetName);

            // Append only if insert statements exist
            if (stepsSQL.insert) {
                result.instructions.create ||= stepsSQL.create;
                result.instructions.insert += stepsSQL.insert + '\n';
            }

            if (ingredientsSQL.insert) {
                result.ingredients.create ||= ingredientsSQL.create;
                result.ingredients.insert += ingredientsSQL.insert + '\n';
            }

            if (instructionTemplatesSQL.insert) {
                result.templates.create ||= instructionTemplatesSQL.create;
                result.templates.insert += instructionTemplatesSQL.insert + '\n';
            }
        }

        setQuery(result);
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
    const { formulaMap = new Map() } = sheetFormulasMap.get(sheetName) || {};
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
    const stepIngredientSeqMap = new Map(); // Track ingredient sequence per step
    const stepIdx = getIndex('step');
    let currentStepNo = null;
    let currentStepSeq = 0;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        const rawStep = row[stepIdx];
        const stepIsHeader = rawStep !== undefined && rawStep !== null && rawStep !== '' &&
            /^\d+(\.0+)?$/.test(String(rawStep).trim());

        if (stepIsHeader) {
            currentStepNo = parseInt(rawStep);
            currentStepSeq++;

            const action = String(row[actionIdx] || '').trim();
            if (action) {
                steps.push({ step_no: currentStepNo, action });

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
            }
        } else if (currentStepNo !== null) {
            const currentSeq = (stepIngredientSeqMap.get(currentStepNo) || 0) + 1;
            stepIngredientSeqMap.set(currentStepNo, currentSeq);

            const ing = {
                step_no: currentStepNo,
                step_seq: currentSeq,
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

    const stepsSQL = {
        create: `
        CREATE TABLE batch_instructions (
          step_no TEXT,
          action TEXT,
          ingredients TEXT
        );`.trim(),

        insert: (() => {
            const uniqueSteps = new Map();

            steps
                .filter(({ step_no, action }) => Number.isInteger(step_no))
                .forEach(({ step_no, action }) => {
                    const uniqueIngredients = new Set();
                    const ingredientsStr = ingredients
                        .filter(ing => {
                            if (ing.step_no !== step_no) return false;
                            const key = ing.incredient_description?.toLowerCase().trim();
                            if (uniqueIngredients.has(key)) return false;
                            uniqueIngredients.add(key);
                            return true;
                        })
                        .map(ing => ing.incredient_description)
                        .join('\n');

                    const key = `${action}__${ingredientsStr}`;
                    if (!uniqueSteps.has(key)) {
                        uniqueSteps.set(key, {
                            step_nos: [step_no],
                            action,
                            ingredientsStr,
                        });
                    } else {
                        uniqueSteps.get(key).step_nos.push(step_no);
                    }
                });

            return Array.from(uniqueSteps.values())
                .map(({ step_nos, action, ingredientsStr }) => {
                    const stepNoCombined = step_nos.join(', ');
                    return `INSERT INTO batch_instructions (step_no, action, ingredients) VALUES (${escapeSQL(stepNoCombined)}, ${escapeSQL(action)}, ${escapeSQL(ingredientsStr)});`;
                })
                .join('\n');
        })(),
    };


    const ingredientsSQL = {
        create: `
        CREATE TABLE ingredients (
          step_no INT,
          step_seq INT,
          vendor TEXT,
          incredient_description TEXT,
          type TEXT,
          speed TEXT,
          temp TEXT,
          concentration TEXT,
          mixer_needed TEXT
        );`.trim(),

        insert: ingredients
            .filter(({ step_seq, incredient_description, vendor, type, speed, temp, concentration, mixer_needed }) => {
                const hasSomeContent = [
                    incredient_description,
                    vendor,
                    type,
                    speed,
                    temp,
                    concentration,
                    mixer_needed
                ].some(val => !!val && val.toString().trim());

                const notSummaryRow = (incredient_description || "").toLowerCase().trim() !== "total syrup weight" &&
                    (temp || "").toLowerCase().trim() !== "total syrup volume";

                return hasSomeContent && notSummaryRow;
            })
            .filter(({ step_seq, incredient_description, vendor }, i, arr) => {
                if (i === 0) return true;
                const prev = arr[i - 1];
                return (
                    step_seq !== prev.step_seq ||
                    incredient_description !== prev.incredient_description ||
                    vendor !== prev.vendor
                );
            })
            .map(ing => {
                const values = [
                    parseInt(ing.step_no),
                    parseInt(ing.step_seq),
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
