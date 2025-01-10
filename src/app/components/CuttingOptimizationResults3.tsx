"use client"
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import * as XLSX from "xlsx"; 
import { Upload } from 'lucide-react';

const CuttingOptimizationResults = () => {
    const [piecesFile, setPiecesFile] = useState(null);
    const [stockFile, setStockFile] = useState(null);
    const [piecesData, setPiecesData] = useState(null);
    const [stockData, setStockData] = useState(null);
    const [error, setError] = useState(null);

    const handleFileUpload = (event, fileType) => {
        const file = event.target.files[0];
        if (file) {
            if (fileType === 'pieces') {
                setPiecesFile(file);
            } else {
                setStockFile(file);
            }
        }
    };

    const processFiles = async () => {
        if (!piecesFile || !stockFile) {
            setError("Lütfen her iki dosyayı da yükleyin.");
            return;
        }
    
        setError(null);
    
        try {
            const readFile = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target.result);
                        resolve(data);
                    };
                    reader.onerror = (e) => reject(e);
                    reader.readAsArrayBuffer(file);
                });
            };
    
            const piecesBuffer = await readFile(piecesFile);
            const stockBuffer = await readFile(stockFile);
    
            const piecesWorkbook = XLSX.read(piecesBuffer, { type: "array" });
            const stockWorkbook = XLSX.read(stockBuffer, { type: "array" });
    
            const piecesSheet = piecesWorkbook.Sheets[piecesWorkbook.SheetNames[0]];
            const stockSheet = stockWorkbook.Sheets[stockWorkbook.SheetNames[0]];
    
            const piecesData = XLSX.utils.sheet_to_json(piecesSheet);
            const stockData = XLSX.utils.sheet_to_json(stockSheet);
    
            let remainingPieces = piecesData.map(p => ({
                length: p.Length,
                quantity: p.Quantity,
                remaining: p.Quantity
            }));
    
            let stockProfiles = stockData.map(s => ({
                length: s.Length,
                quantity: s.Quantity,
                remaining: s.Quantity
            }));
    
            setPiecesData(remainingPieces);
            setStockData(stockProfiles);
        } catch (err) {
            setError("Dosyaları işlerken bir hata oluştu: " + err.message);
        }
    };
    
    return (
        <Card className="w-full">
            <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-6">Kesim Optimizasyonu</h2>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => handleFileUpload(e, 'stock')}
                                className="hidden"
                                id="stock-file"
                            />
                            <label htmlFor="stock-file" className="cursor-pointer">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">
                                    {stockFile ? stockFile.name : 'Stok Profiller Dosyasını Seçin'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Excel dosyası (.xlsx, .xls)</p>
                            </label>
                        </div>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => handleFileUpload(e, 'pieces')}
                                className="hidden"
                                id="pieces-file"
                            />
                            <label htmlFor="pieces-file" className="cursor-pointer">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">
                                    {piecesFile ? piecesFile.name : 'Kesilecek Parçalar Dosyasını Seçin'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Excel dosyası (.xlsx, .xls)</p>
                            </label>
                        </div>   
                    </div>

                    <button
                        onClick={processFiles}
                        disabled={!piecesFile || !stockFile}
                        className={`w-full p-2 rounded ${!piecesFile || !stockFile ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                    >
                        Verileri Yükle
                    </button>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded">
                            {error}
                        </div>
                    )}

                    {piecesData && stockData && (
                        <div className="bg-gray-100 p-4 rounded">
                            <h3 className="font-semibold">Yüklenen Veriler</h3>
                            <div className="bg-gray-100 p-4 rounded">
                            <h3 className="font-semibold mt-4">Stock Profiles</h3>
                            <pre className="bg-white p-2 rounded text-xs overflow-auto">
                            {stockData.map(s => `${s.length},${s.quantity}`).join("; ")}
                            </pre>
                            <h3 className="font-semibold">Remaining Pieces</h3>
                            <pre className="bg-white p-2 rounded text-xs overflow-auto">
                            {piecesData.map(p => `${p.length},${p.quantity}`).join("; ")}
                            </pre>  
                        </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CuttingOptimizationResults;
