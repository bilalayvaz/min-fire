'use client'
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import _ from 'lodash';

const CuttingStockOptimizer = () => {
  const [stockLengths, setStockLengths] = useState('');
  const [requiredPieces, setRequiredPieces] = useState('');
  const [results, setResults] = useState(null);
  const BLADE_WIDTH = 4; // Testere kalınlığı (mm)

  // Optimizasyon algoritması
  const optimizeCutting = () => {
    // Stok profilleri parse et (format: "uzunluk,adet;uzunluk,adet")
    const stock = stockLengths.split(';')
      .map(item => {
        const [length, quantity] = item.split(',').map(x => parseInt(x.trim()));
        return { length, quantity: quantity || 0, remaining: quantity || 0 };
      })
      .filter(x => !isNaN(x.length) && !isNaN(x.quantity));
    
    // İhtiyaç listesini parse et (format: "uzunluk,adet;uzunluk,adet")
    const required = requiredPieces.split(';')
      .map(piece => {
        const [length, quantity] = piece.split(',').map(x => parseInt(x.trim()));
        return { length, quantity, remaining: quantity };
      })
      .filter(x => !isNaN(x.length) && !isNaN(x.quantity));

    let totalWaste = 0;
    let usedStock = [];
    let remainingPieces = [...required];

    while (remainingPieces.some(p => p.remaining > 0)) {
      let bestWaste = Infinity;
      let bestCombination = null;
      let bestStockIndex = -1;

      // Her stok profil için olası kombinasyonları dene
      stock.forEach((stockItem, stockIndex) => {
        if (stockItem.remaining <= 0) return;

        let currentLength = 0;
        let combination = [];
        let tempPieces = remainingPieces.map(p => ({ ...p }));
        
        // Testere kalınlığını hesaba katarak kesim planı yap
        tempPieces.sort((a, b) => b.length - a.length);

        for (let piece of tempPieces) {
          // Her kesim için testere kalınlığını da hesaba kat
          while (piece.remaining > 0 && 
                currentLength + piece.length + (combination.length > 0 ? BLADE_WIDTH : 0) <= stockItem.length) {
            combination.push(piece.length);
            currentLength += piece.length + (combination.length > 1 ? BLADE_WIDTH : 0);
            piece.remaining--;
          }
        }

        const waste = stockItem.length - currentLength;
        if (waste < bestWaste && combination.length > 0) {
          bestWaste = waste;
          bestCombination = combination;
          bestStockIndex = stockIndex;
        }
      });

      if (bestCombination && bestStockIndex !== -1) {
        stock[bestStockIndex].remaining--;
        
        bestCombination.forEach(cutLength => {
          const piece = remainingPieces.find(p => p.length === cutLength && p.remaining > 0);
          if (piece) piece.remaining--;
        });

        // Toplam fire hesabında testere kalınlığını da ekle
        const totalCutWaste = (bestCombination.length - 1) * BLADE_WIDTH;
        const unusableWaste = bestWaste;

        usedStock.push({
          stockLength: stock[bestStockIndex].length,
          cuts: bestCombination,
          cutWaste: totalCutWaste,
          unusableWaste: unusableWaste,
          totalWaste: totalCutWaste + unusableWaste
        });
        totalWaste += totalCutWaste + unusableWaste;
      } else {
        break;
      }
    }

    const stockUsage = stock.map(item => ({
      length: item.length,
      total: item.quantity,
      used: item.quantity - item.remaining
    }));

    setResults({
      totalWaste,
      usedStock,
      stockUsage,
      isComplete: !remainingPieces.some(p => p.remaining > 0),
      remainingPieces: remainingPieces.filter(p => p.remaining > 0)
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="bg-blue-100 p-4 rounded">
            <p className="text-sm">Testere Kalınlığı: {BLADE_WIDTH}mm</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Stok Profil Uzunlukları ve Adetleri (uzunluk,adet şeklinde noktalı virgülle ayırın)
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="5000,3; 8000,2; 6000,4"
              value={stockLengths}
              onChange={(e) => setStockLengths(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              İhtiyaç Listesi (uzunluk,adet şeklinde noktalı virgülle ayırın)
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="1000,3; 2000,2; 3000,1"
              value={requiredPieces}
              onChange={(e) => setRequiredPieces(e.target.value)}
            />
          </div>

          <button
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            onClick={optimizeCutting}
          >
            Optimize Et
          </button>

          {results && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Sonuçlar:</h3>
              <div className="bg-gray-100 p-4 rounded">
                <p>Toplam Fire: {results.totalWaste} mm</p>
                <p className="text-sm text-gray-600">
                  (Testere kesim kayıpları dahil)
                </p>
              </div>
              
              {/* Stok Kullanım Özeti */}
              <div className="mt-4">
                <h4 className="font-medium">Stok Kullanım Özeti:</h4>
                <div className="space-y-2">
                  {results.stockUsage.map((item, index) => (
                    <p key={index}>
                      {item.length} mm: {item.used}/{item.total} adet kullanıldı
                    </p>
                  ))}
                </div>
              </div>

              {/* Kesim Durumu */}
              <p className={results.isComplete ? "text-green-600" : "text-red-600"}>
                {results.isComplete 
                  ? "Tüm parçalar kesilebilir." 
                  : "Dikkat: Bazı parçalar kesilemiyor!"}
              </p>
              
              {/* Kesilemeyen Parçalar */}
              {!results.isComplete && (
                <div className="text-red-600">
                  <p>Kesilemeyen parçalar:</p>
                  <ul>
                    {results.remainingPieces.map((piece, index) => (
                      <li key={index}>
                        {piece.length} mm - {piece.remaining} adet
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Kesim Planları */}
              <div className="space-y-4">
                {results.usedStock.map((stock, index) => (
                  <div key={index} className="border p-4 rounded">
                    <p>Profil {index + 1}: {stock.stockLength} mm</p>
                    <p>Kesimler: {stock.cuts.join(', ')} mm</p>
                    <p>Testere Kayıpları: {stock.cutWaste} mm ({stock.cuts.length - 1} kesim)</p>
                    <p>Kullanılamayan Fire: {stock.unusableWaste} mm</p>
                    <p className="font-medium">Toplam Fire: {stock.totalWaste} mm</p>
                    
                    <div className="mt-2 h-8 w-full bg-gray-200 rounded overflow-hidden">
                      {stock.cuts.map((cut, cutIndex) => (
                        <React.Fragment key={cutIndex}>
                          <div
                            className="h-full float-left bg-blue-500"
                            style={{
                              width: `${(cut / stock.stockLength) * 100}%`
                            }}
                          />
                          {cutIndex < stock.cuts.length - 1 && (
                            <div
                              className="h-full float-left bg-yellow-500"
                              style={{
                                width: `${(BLADE_WIDTH / stock.stockLength) * 100}%`
                              }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                      {stock.unusableWaste > 0 && (
                        <div
                          className="h-full float-left bg-red-500"
                          style={{
                            width: `${(stock.unusableWaste / stock.stockLength) * 100}%`
                          }}
                        />
                      )}
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Kesilen Parçalar
                      <span className="inline-block w-3 h-3 bg-yellow-500 ml-3 mr-1"></span> Testere Kayıpları
                      <span className="inline-block w-3 h-3 bg-red-500 ml-3 mr-1"></span> Kullanılamayan Fire
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

export default CuttingStockOptimizer;