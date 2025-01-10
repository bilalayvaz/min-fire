import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import XLSX from 'xlsx';
import _ from 'lodash';
import { Upload } from 'lucide-react';

const CuttingOptimizationResults = () => {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [piecesFile, setPiecesFile] = useState(null);
    const [stockFile, setStockFile] = useState(null);
    const BLADE_WIDTH = 4;

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

        setLoading(true);
        setError(null);

        try {
            // Dosyaları oku
            const piecesReader = new FileReader();
            const stockReader = new FileReader();

            const readFile = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsArrayBuffer(file);
                });
            };

            const piecesBuffer = await readFile(piecesFile);
            const stockBuffer = await readFile(stockFile);

            // Excel olarak parse et
            const piecesWorkbook = XLSX.read(piecesBuffer);
            const stockWorkbook = XLSX.read(stockBuffer);

            const piecesSheet = piecesWorkbook.Sheets[piecesWorkbook.SheetNames[0]];
            const stockSheet = stockWorkbook.Sheets[stockWorkbook.SheetNames[0]];

            const piecesData = XLSX.utils.sheet_to_json(piecesSheet);
            const stockData = XLSX.utils.sheet_to_json(stockSheet);

            // Optimizasyon verilerini hazırla
            let remainingPieces = piecesData.map(p => ({
                // @ts-expect-error Excel data type conversion
                length: p.Length,
                // @ts-expect-error Excel data type conversion
                quantity: p.Quantity,
                // @ts-expect-error Excel data type conversion
                remaining: p.Quantity
            }));

            let stockProfiles = stockData.map(s => ({
                // @ts-expect-error Excel data type conversion
                length: s.Length,
                // @ts-expect-error Excel data type conversion
                quantity: s.Quantity,
                // @ts-expect-error Excel data type conversion
                remaining: s.Quantity
            }));

            // Optimizasyon sonuçları
            let cuttingPlans = [];
            let totalWaste = 0;
            let unusedStocks = [];
            let unassignedPieces = [];

            // En kısa stok profilden başlayarak optimize et
            stockProfiles.sort((a, b) => a.length - b.length);

            while (remainingPieces.some(p => p.remaining > 0)) {
                let bestPlan = null;
                let bestWaste = Infinity;
                let selectedStockIndex = -1;

                stockProfiles.forEach((stock, stockIndex) => {
                    if (stock.remaining <= 0) return;

                    let currentLength = 0;
                    let pieces = [];
                    let tempPieces = _.cloneDeep(remainingPieces);

                    tempPieces.sort((a, b) => b.length - a.length);

                    for (let piece of tempPieces) {
                        while (piece.remaining > 0) {
                            const nextLength = currentLength + 
                                piece.length + 
                                (pieces.length > 0 ? BLADE_WIDTH : 0);
                            
                            if (nextLength <= stock.length) {
                                pieces.push({
                                    length: piece.length,
                                    originalIndex: remainingPieces.findIndex(p => p.length === piece.length)
                                });
                                currentLength = nextLength;
                                piece.remaining--;
                            } else {
                                break;
                            }
                        }
                    }

                    const waste = stock.length - currentLength;
                    if (pieces.length > 0 && waste < bestWaste) {
                        bestWaste = waste;
                        bestPlan = pieces;
                        selectedStockIndex = stockIndex;
                    }
                });

                if (bestPlan && selectedStockIndex !== -1) {
                    stockProfiles[selectedStockIndex].remaining--;

                    bestPlan.forEach(piece => {
                        remainingPieces[piece.originalIndex].remaining--;
                    });

                    cuttingPlans.push({
                        stockLength: stockProfiles[selectedStockIndex].length,
                        cuts: bestPlan,
                        waste: bestWaste,
                        bladeWaste: (bestPlan.length - 1) * BLADE_WIDTH
                    });

                    totalWaste += bestWaste + (bestPlan.length - 1) * BLADE_WIDTH;
                } else {
                    break;
                }
            }

            unassignedPieces = remainingPieces.filter(p => p.remaining > 0);
            unusedStocks = stockProfiles.map(s => ({
                length: s.length,
                unused: s.remaining
            }));

            setResults({
                cuttingPlans,
                totalWaste,
                unassignedPieces,
                unusedStocks
            });
            setLoading(false);
        } catch (err) {
            setError("Dosyaları işlerken bir hata oluştu: " + err.message);
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-6">Kesim Optimizasyonu</h2>

                <div className="space-y-6">
                    {/* Dosya Yükleme Alanı */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    <button
                        onClick={processFiles}
                        disabled={!piecesFile || !stockFile || loading}
                        className={`w-full p-2 rounded ${
                            !piecesFile || !stockFile || loading
                                ? 'bg-gray-300'
                                : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                    >
                        {loading ? 'Optimizasyon Yapılıyor...' : 'Optimize Et'}
                    </button>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded">
                            {error}
                        </div>
                    )}

                    {results && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded">
                                <h3 className="font-semibold">Genel Özet</h3>
                                <p>Toplam Fire: {results.totalWaste.toLocaleString()} mm</p>
                                <p>Toplam Kesim Planı: {results.cuttingPlans.length}</p>
                            </div>

                            {results.unassignedPieces.length > 0 && (
                                <div className="bg-red-50 p-4 rounded">
                                    <h3 className="font-semibold text-red-600">Kesilemeyen Parçalar</h3>
                                    <ul className="list-disc pl-5">
                                        {results.unassignedPieces.map((piece, idx) => (
                                            <li key={idx}>
                                                {piece.length}mm - {piece.remaining} adet
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="font-semibold">Kesim Planları</h3>
                                {results.cuttingPlans.map((plan, planIndex) => (
                                    <div key={planIndex} className="border p-4 rounded">
                                        <p className="font-medium">Plan {planIndex + 1}</p>
                                        <p>Stok Profil: {plan.stockLength}mm</p>
                                        <p>Kesilen Parçalar: {plan.cuts.map(c => c.length).join(', ')}mm</p>
                                        <p>Fire: {plan.waste}mm</p>
                                        <p>Testere Kayıpları: {plan.bladeWaste}mm</p>
                                        
                                        <div className="mt-2 h-6 w-full bg-gray-200 rounded overflow-hidden">
                                            {plan.cuts.map((cut, cutIndex) => (
                                                <React.Fragment key={cutIndex}>
                                                    <div
                                                        className="h-full float-left bg-blue-500"
                                                        style={{
                                                            width: `${(cut.length / plan.stockLength) * 100}%`
                                                        }}
                                                    />
                                                    {cutIndex < plan.cuts.length - 1 && (
                                                        <div
                                                            className="h-full float-left bg-yellow-500"
                                                            style={{
                                                                width: `${(BLADE_WIDTH / plan.stockLength) * 100}%`
                                                            }}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                            {plan.waste > 0 && (
                                                <div
                                                    className="h-full float-left bg-red-500"
                                                    style={{
                                                        width: `${(plan.waste / plan.stockLength) * 100}%`
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="mt-1 text-xs">
                                            <span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Kesilen Parçalar
                                            <span className="inline-block w-3 h-3 bg-yellow-500 ml-3 mr-1"></span> Testere Kayıpları
                                            <span className="inline-block w-3 h-3 bg-red-500 ml-3 mr-1"></span> Fire
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CuttingOptimizationResults;