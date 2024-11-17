import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Inisialisasi PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTableFromExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false });
                // Memastikan bahwa jsonData adalah array
                if (Array.isArray(jsonData)) {
                    resolve(jsonData);
                } else {
                    resolve([]);
                }
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

export async function extractTableFromPDF(file: File): Promise<any[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let result: any[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items
            .map((item: any) => item.str)
            .join(' ');

        const rows = text.split('\n').filter(row => row.trim());
        const headers = rows[0].split(/\s+/).filter(h => h.trim());

        for (let j = 1; j < rows.length; j++) {
            const values = rows[j].split(/\s+/).filter(v => v.trim());
            if (values.length === headers.length) {
                const row: { [key: string]: string } = {}; // Menambahkan index signature
                headers.forEach((header, index) => {
                    row[header.toLowerCase()] = values[index];
                });
                result.push(row);
            }
        }
    }

    return result;
}

export async function generateResultPDF(mergedData: any[]) {
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([842, 595]); // Menggunakan let untuk currentPage
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const headers = Object.keys(mergedData[0] || {});
    const cellWidth = 800 / headers.length;
    const cellHeight = 30;
    const startX = 20;
    let startY = 550;

    // Draw headers
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

    // Draw data rows
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

        // Add new page if needed
        if (startY < 50) {
            currentPage = pdfDoc.addPage([842, 595]);
            startY = 550;
        }
    });

    return await pdfDoc.save();
}

export function mergeTables(table1: any[], table2: any[]) {
    // Normalisasi key untuk nomor peserta dan nama
    const normalizeKeys = (row: any) => {
        const nomorPesertaKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('nomor') && key.toLowerCase().includes('peserta')
        ) || 'nomorpeserta';

        const namaKey = Object.keys(row).find(key =>
            key.toLowerCase() === 'nama'
        ) || 'nama';

        return {
            nomorPeserta: String(row[nomorPesertaKey] || '').toLowerCase().trim(),
            nama: String(row[namaKey] || '').toLowerCase().trim(),
            originalRow: row
        };
    };

    // Normalisasi kedua tabel
    const normalizedTable1 = table1.map(normalizeKeys);
    const normalizedTable2 = table2.map(normalizeKeys);

    // Set untuk melacak data yang sudah digunakan dari table2
    const usedIndicesTable2 = new Set<number>();

    // Array untuk menyimpan hasil penggabungan
    const mergedData: any[] = [];

    // Iterasi setiap baris di table1
    normalizedTable1.forEach((row1) => {
        // Cari kecocokan di table2 yang belum digunakan
        for (let i = 0; i < normalizedTable2.length; i++) {
            if (usedIndicesTable2.has(i)) continue;

            const row2 = normalizedTable2[i];
            if (row1.nomorPeserta === row2.nomorPeserta &&
                row1.nama === row2.nama) {
                // Jika cocok, gabungkan data dan tandai sebagai terpakai
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