import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

interface TableRow {
    [key: string]: string;
}

interface NormalizedRow {
    nomorPeserta: string;
    nama: string;
    originalRow: TableRow;
}

interface TextItem {
    str: string;
}

interface TextContent {
    items: TextItem[];
}

// Inisialisasi PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTableFromExcel(file: File): Promise<TableRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as TableRow[];
                resolve(Array.isArray(jsonData) ? jsonData : []);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

export async function extractTableFromPDF(file: File): Promise<TableRow[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const result: TableRow[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent() as TextContent;
        const text = textContent.items
            .map(item => item.str)
            .join(' ');

        const rows = text.split('\n').filter(row => row.trim());
        const headers = rows[0].split(/\s+/).filter(h => h.trim());

        for (let j = 1; j < rows.length; j++) {
            const values = rows[j].split(/\s+/).filter(v => v.trim());
            if (values.length === headers.length) {
                const row: TableRow = {};
                headers.forEach((header, index) => {
                    row[header.toLowerCase()] = values[index];
                });
                result.push(row);
            }
        }
    }

    return result;
}

export async function generateResultPDF(mergedData: TableRow[]) {
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([842, 595]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const headers = Object.keys(mergedData[0] || {});
    const cellWidth = 800 / headers.length;
    const cellHeight = 30;
    const startX = 20;
    let startY = 550;

    headers.forEach((header, index) => {
        currentPage.drawText(header, {
            x: startX + (index * cellWidth),
            y: startY,
            size: 10,
            font,
            color: rgb(0, 0, 0),
        });
    });

    startY -= cellHeight;

    mergedData.forEach((row) => {
        headers.forEach((header, index) => {
            currentPage.drawText(String(row[header] || ''), {
                x: startX + (index * cellWidth),
                y: startY,
                size: 8,
                font,
                color: rgb(0, 0, 0),
            });
        });
        startY -= cellHeight;

        if (startY < 50) {
            currentPage = pdfDoc.addPage([842, 595]);
            startY = 550;
        }
    });

    return await pdfDoc.save();
}

export function mergeTables(table1: TableRow[], table2: TableRow[]): TableRow[] {
    if (!table1.length || !table2.length) return [];

    // Temukan header yang sama antara kedua tabel
    const headers1 = Object.keys(table1[0]);
    const headers2 = Object.keys(table2[0]);
    const commonHeaders = headers1.filter(header => 
        headers2.some(h2 => h2.toLowerCase() === header.toLowerCase())
    );

    if (commonHeaders.length === 0) {
        console.error('Tidak ada header yang sama antara kedua tabel');
        return [];
    }

    const normalizeRow = (row: TableRow): string => {
        return commonHeaders
            .map(header => {
                const value = Object.entries(row)
                    .find(([key]) => key.toLowerCase() === header.toLowerCase())?.[1];
                return String(value || '').toLowerCase().trim();
            })
            .join('|');
    };

    const normalizedTable1 = table1.map(row => ({
        normalizedKey: normalizeRow(row),
        originalRow: row
    }));
    
    const normalizedTable2 = table2.map(row => ({
        normalizedKey: normalizeRow(row),
        originalRow: row
    }));

    const usedIndicesTable2 = new Set<number>();
    const mergedData: TableRow[] = [];

    normalizedTable1.forEach((row1) => {
        for (let i = 0; i < normalizedTable2.length; i++) {
            if (usedIndicesTable2.has(i)) continue;

            const row2 = normalizedTable2[i];
            if (row1.normalizedKey === row2.normalizedKey) {
                mergedData.push({
                    ...row1.originalRow,
                    ...row2.originalRow
                });
                usedIndicesTable2.add(i);
                break;
            }
        }
    });

    return mergedData;
}

// export function mergeTables(table1: TableRow[], table2: TableRow[]): TableRow[] {
//     const normalizeKeys = (row: TableRow): NormalizedRow => {
//         const nomorPesertaKey = Object.keys(row).find(key =>
//             key.toLowerCase().includes('nomor') && key.toLowerCase().includes('peserta')
//         ) || 'nomorpeserta';

//         const namaKey = Object.keys(row).find(key =>
//             key.toLowerCase() === 'nama'
//         ) || 'nama';

//         return {
//             nomorPeserta: String(row[nomorPesertaKey] || '').toLowerCase().trim(),
//             nama: String(row[namaKey] || '').toLowerCase().trim(),
//             originalRow: row
//         };
//     };

//     const normalizedTable1 = table1.map(normalizeKeys);
//     const normalizedTable2 = table2.map(normalizeKeys);
//     const usedIndicesTable2 = new Set<number>();
//     const mergedData: TableRow[] = [];

//     normalizedTable1.forEach((row1) => {
//         for (let i = 0; i < normalizedTable2.length; i++) {
//             if (usedIndicesTable2.has(i)) continue;

//             const row2 = normalizedTable2[i];
//             if (row1.nomorPeserta === row2.nomorPeserta &&
//                 row1.nama === row2.nama) {
//                 mergedData.push({
//                     ...row1.originalRow,
//                     ...row2.originalRow
//                 });
//                 usedIndicesTable2.add(i);
//                 break;
//             }
//         }
//     });

//     return mergedData;
// }