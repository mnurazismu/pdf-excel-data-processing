"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  FiCheck,
  FiDownload,
  FiFile,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";
import {
  extractTableFromExcel,
  extractTableFromPDF,
  generateResultPDF,
  mergeTables,
} from "../utils/fileProcessing";

interface TableData {
  nomorPeserta: string;
  nama: string;
  [key: string]: string;
}

export default function FileProcessor() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [result, setResult] = useState<TableData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [commonHeaders, setCommonHeaders] = useState<string[]>([]);

  const onDrop1 = (acceptedFiles: File[]) => {
    setFile1(acceptedFiles[0]);
  };

  const onDrop2 = (acceptedFiles: File[]) => {
    setFile2(acceptedFiles[0]);
  };

  const { getRootProps: getRootProps1, getInputProps: getInputProps1 } =
    useDropzone({
      onDrop: onDrop1,
      accept: {
        "application/pdf": [".pdf"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
      },
    });

  const { getRootProps: getRootProps2, getInputProps: getInputProps2 } =
    useDropzone({
      onDrop: onDrop2,
      accept: {
        "application/pdf": [".pdf"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
      },
    });

  const processFiles = async () => {
    if (!file1 || !file2) return;
    setIsProcessing(true);
    setPdfBytes(null);

    try {
      let table1Data, table2Data;

      // Extract data from first file
      if (file1.name.endsWith(".xlsx") || file1.name.endsWith(".xls")) {
        table1Data = await extractTableFromExcel(file1);
      } else if (file1.name.endsWith(".pdf")) {
        table1Data = await extractTableFromPDF(file1);
      }

      // Extract data from second file
      if (file2.name.endsWith(".xlsx") || file2.name.endsWith(".xls")) {
        table2Data = await extractTableFromExcel(file2);
      } else if (file2.name.endsWith(".pdf")) {
        table2Data = await extractTableFromPDF(file2);
      }

      if (
        table1Data &&
        table2Data &&
        Array.isArray(table1Data) &&
        Array.isArray(table2Data)
      ) {
        const mergedData = mergeTables(table1Data, table2Data) as TableData[];
        setResult(mergedData);
        setCommonHeaders(Object.keys(mergedData[0] || {}));

        // Generate PDF
        const generatedPdfBytes = await generateResultPDF(mergedData);
        setPdfBytes(generatedPdfBytes);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Terjadi kesalahan saat memproses file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBytes) return;

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "hasil_penggabungan.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setResult([]);
    setPdfBytes(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center space-y-4">
            <AiOutlineLoading3Quarters className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">
                Sedang Memproses
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Mohon tunggu sebentar...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow p-8 mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Smart Document Merger
          </h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            Unggah dua dokumen (PDF atau Excel) untuk menggabungkan data secara
            otomatis. Sistem akan mendeteksi kolom-kolom yang sama dan
            menggabungkan data yang sesuai tanpa duplikasi.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Dropzone 1 */}
            <div
              {...getRootProps1()}
              className="border-2 border-dashed border-blue-200 rounded-xl p-8 transition-all hover:border-blue-400 cursor-pointer bg-blue-50 hover:bg-blue-100"
            >
              <input {...getInputProps1()} />
              <div className="flex flex-col items-center space-y-4">
                {file1 ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FiCheck className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiFile className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {file1.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <FiUploadCloud className="w-12 h-12 text-blue-500" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        Drop dokumen pertama atau klik untuk memilih
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, XLSX, atau XLS
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dropzone 2 */}
            <div
              {...getRootProps2()}
              className="border-2 border-dashed border-blue-200 rounded-xl p-8 transition-all hover:border-blue-400 cursor-pointer bg-blue-50 hover:bg-blue-100"
            >
              <input {...getInputProps2()} />
              <div className="flex flex-col items-center space-y-4">
                {file2 ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FiCheck className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiFile className="text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {file2.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <FiUploadCloud className="w-12 h-12 text-blue-500" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        Drop dokumen kedua atau klik untuk memilih
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, XLSX, atau XLS
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Process Button */}
          <div className="mt-8 text-center">
            <button
              onClick={processFiles}
              disabled={!file1 || !file2 || isProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                "Proses Dokumen"
              )}
            </button>

            {result.length > 0 && (
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg font-medium shadow-sm hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <FiRefreshCw className="w-5 h-5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Table */}
        {result.length > 0 && (
          <div className="space-y-8">
            {/* Download Button */}
            <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Dokumen Siap Diunduh
                </h3>
                <p className="text-sm text-gray-600">
                  File PDF hasil penggabungan telah siap
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiDownload className="w-5 h-5" />
                <span>Unduh PDF</span>
              </button>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  Hasil Penggabungan
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {result.length} data berhasil digabungkan berdasarkan{" "}
                  {commonHeaders?.length || 0} kolom yang sama
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(result[0]).map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((value, valueIdx) => (
                          <td
                            key={valueIdx}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
