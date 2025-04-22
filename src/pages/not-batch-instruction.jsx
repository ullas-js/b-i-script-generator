import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import RecordTable from '../components/table';
import { generateRawMaterialSQL } from '../utils/raw-material-sql';
import { generateFinishedGoodsSQL } from '../utils/finished-goods-sql';
import './page.css';

export default function NotBatchInstructionPage() {
    const [file, setFile] = useState(null);
    const [tableData, setTableData] = useState({
        headers: [],
        rows: []
    });
    const [dataType, setDataType] = useState('raw_material'); // or 'finished_goods'

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const workbook = XLSX.read(e.target.result, {
                type: 'binary',
                cellDates: true,
                cellFormula: true
            });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (data && data.length > 0) {
                const headers = data[0].map(header => header?.toString() || '');
                const rows = data.slice(1).map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index]?.toString() || '';
                    });
                    return rowData;
                });

                // Auto-detect data type based on headers
                const headerStr = headers.join(' ').toLowerCase();
                if (headerStr.includes('monster') || headerStr.includes('case') || headerStr.includes('pallet')) {
                    setDataType('finished_goods');
                } else {
                    setDataType('raw_material');
                }

                setTableData({
                    headers,
                    rows
                });
            }
        };
        reader.readAsBinaryString(file);
        setFile(file);
    };

    const handleHeadersChange = (newHeaders) => {
        setTableData(prev => ({
            ...prev,
            headers: newHeaders
        }));
    };

    const handleRowsChange = (newRows) => {
        setTableData(prev => ({
            ...prev,
            rows: newRows
        }));
    };

    const handleGenerateSQL = () => {
        if (!tableData.rows.length) return;

        const generator = dataType === 'finished_goods' ? generateFinishedGoodsSQL : generateRawMaterialSQL;
        const { create, insert } = generator(tableData.headers, tableData.rows);
        const sql = `${create}\n\n${insert}`;
        
        const blob = new Blob([sql], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().getTime();
        const filename = dataType === 'finished_goods' ? 'finished_goods' : 'raw_material_items';
        a.download = `${filename}_${timestamp}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="read-formula-content">
            <Link to={'/'}>Go Back</Link>
            <h1>Data Extractor</h1>
            <div className="input-container">
                <input 
                    type="file" 
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                />
                <code>{file?.name}</code>
                <div style={{ marginTop: '1rem' }}>
                    <label>
                        <input
                            type="radio"
                            value="raw_material"
                            checked={dataType === 'raw_material'}
                            onChange={(e) => setDataType(e.target.value)}
                        /> Raw Material
                    </label>
                    <label style={{ marginLeft: '1rem' }}>
                        <input
                            type="radio"
                            value="finished_goods"
                            checked={dataType === 'finished_goods'}
                            onChange={(e) => setDataType(e.target.value)}
                        /> Finished Goods
                    </label>
                </div>
                {tableData.headers.length > 0 && (
                    <button 
                        onClick={handleGenerateSQL}
                        style={{ marginLeft: '1rem' }}
                    >
                        Download SQL
                    </button>
                )}
            </div>
            {tableData.headers.length > 0 && (
                <div className="table-container">
                    <RecordTable
                        headers={tableData.headers}
                        rows={tableData.rows}
                        setHeaders={handleHeadersChange}
                        setRows={handleRowsChange}
                        name={dataType === 'finished_goods' ? 'finished_goods' : 'raw_material_item'}
                    />
                </div>
            )}
        </div>
    );
}