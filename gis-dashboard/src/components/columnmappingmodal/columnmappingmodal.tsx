import React, { useState, useEffect } from 'react';
import { ArrowRight, X, AlertCircle, ChevronLeft, ChevronRight, Upload, FileText } from 'lucide-react';

export default function MainPage() {
  const [showMainModal, setShowMainModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            📁 SHP File Management System
          </h1>
          <p className="text-gray-600 text-lg">
            Kelola dan upload file Shapefile (SHP) ke database dengan mudah
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <FileText className="text-blue-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Upload Shapefile
            </h2>
            <p className="text-gray-600">
              Klik tombol di bawah untuk memulai proses upload dan mapping kolom SHP
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowMainModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-lg font-semibold flex items-center gap-3"
            >
              <Upload size={24} />
              Buka Popup Modal Upload
            </button>
          </div>

          {/* Info Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-blue-800 mb-1">Step 1</div>
              <div className="text-sm text-blue-700">Edit Column Mapping</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="font-semibold text-purple-800 mb-1">Step 2</div>
              <div className="text-sm text-purple-700">Simplifikasi Geometri</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-semibold text-green-800 mb-1">Step 3</div>
              <div className="text-sm text-green-700">Upload ke Database</div>
            </div>
          </div>
        </div>

        {/* Testing Info */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>Testing Nested Modals:</strong> Popup modal ini akan berisi halaman Edit Column Mapping dan Simplifikasi. 
              Di dalam modal tersebut, Anda bisa membuka modal lainnya (Auto-generate, Manual Table, Upload Progress) 
              untuk menguji apakah nested modal berfungsi dengan baik tanpa tabrakan z-index.
            </div>
          </div>
        </div>
      </div>

      {/* Main Modal - Contains the entire workflow */}
      {showMainModal && (
        <MainWorkflowModal onClose={() => setShowMainModal(false)} />
      )}
    </div>
  );
}

// Main Workflow Modal (z-40)
function MainWorkflowModal({ onClose }) {
  const [currentPage, setCurrentPage] = useState('mapping');
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [showManualTableModal, setShowManualTableModal] = useState(false);
  const [currentEditColumn, setCurrentEditColumn] = useState(null);
  const [autoGenConfig, setAutoGenConfig] = useState({});
  const [manualTableData, setManualTableData] = useState({});
  
  const shpColumns = ['PROVINSI', 'KODE', 'PULAU'];
  const selectedYear = '2019';
  
  const dbColumns = [
    { name: 'gid', type: 'integer', required: false },
    { name: 'kode_prov', type: 'integer', required: false },
    { name: 'provinsi', type: 'string', required: true },
    { name: 'fid', type: 'string', required: false },
    { name: 'tahun_data', type: 'integer', required: true }
  ];
  
  const shpData = [
    { PROVINSI: 'Aceh', KODE: '11', PULAU: 'Sumatera' },
    { PROVINSI: 'Sumatera Utara', KODE: '12', PULAU: 'Sumatera' },
    { PROVINSI: 'Sumatera Barat', KODE: '13', PULAU: 'Sumatera' },
    { PROVINSI: 'Riau', KODE: '14', PULAU: 'Sumatera' },
    { PROVINSI: 'Jambi', KODE: '15', PULAU: 'Sumatera' },
  ];
  
  const [columnMapping, setColumnMapping] = useState({
    'provinsi': { source: 'PROVINSI', type: 'shp_column' },
    'kode_prov': { source: '', type: '' },
    'fid': { source: '', type: '' },
    'gid': { source: '', type: '' },
    'tahun_data': { source: '', type: '' }
  });

  const handleMappingChange = (dbCol, value) => {
    if (value === '__AUTO_GENERATE__') {
      setCurrentEditColumn(dbCol);
      setShowAutoGenModal(true);
    } else if (value === '__MANUAL_TABLE__') {
      setCurrentEditColumn(dbCol);
      setShowManualTableModal(true);
    } else if (value === '__NULL__') {
      setColumnMapping({
        ...columnMapping,
        [dbCol]: { source: 'NULL', type: 'null' }
      });
    } else if (value === '__TAHUN_DATA__') {
      setColumnMapping({
        ...columnMapping,
        [dbCol]: { source: `tahun_data (${selectedYear})`, type: 'year_dropdown' }
      });
    } else {
      setColumnMapping({
        ...columnMapping,
        [dbCol]: { source: value, type: 'shp_column' }
      });
    }
  };

  const handleAutoGenSave = (config) => {
    setAutoGenConfig({
      ...autoGenConfig,
      [currentEditColumn]: config
    });
    
    let displayText = '';
    if (config.mode === 'sequence') {
      displayText = `Auto-gen: ${config.startFrom} (increment ${config.increment})`;
    } else if (config.mode === 'continue') {
      displayText = `Auto-gen: Continue from DB (increment ${config.increment})`;
    } else if (config.mode === 'random') {
      displayText = `Auto-gen: Random string (${config.length} chars)`;
    }
    
    setColumnMapping({
      ...columnMapping,
      [currentEditColumn]: { source: displayText, type: 'auto_generate', config }
    });
    
    setShowAutoGenModal(false);
    setCurrentEditColumn(null);
  };

  const handleManualTableSave = (data) => {
    setManualTableData({
      ...manualTableData,
      [currentEditColumn]: data
    });
    
    setColumnMapping({
      ...columnMapping,
      [currentEditColumn]: { source: 'Manual Input Mapping Tabel', type: 'manual_table', data }
    });
    
    setShowManualTableModal(false);
    setCurrentEditColumn(null);
  };

  const renderSourceLabel = (mapping) => {
    if (!mapping.source) return '-- Pilih mapping --';
    if (mapping.type === 'null') return '⊘ NULL';
    if (mapping.type === 'year_dropdown') return `📅 ${mapping.source}`;
    if (mapping.type === 'auto_generate') return `🔧 ${mapping.source}`;
    if (mapping.type === 'manual_table') return `📊 ${mapping.source}`;
    return mapping.source;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-8 max-h-[95vh] overflow-y-auto">
        {/* Modal Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {currentPage === 'mapping' ? 'Edit Column Mapping' : 'Simplifikasi Geometri'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {currentPage === 'mapping' 
                ? 'Mapping kolom dari file SHP ke database' 
                : 'Lakukan simplifikasi terhadap geometri'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8">
          {currentPage === 'mapping' ? (
            <MappingContent
              dbColumns={dbColumns}
              shpColumns={shpColumns}
              selectedYear={selectedYear}
              columnMapping={columnMapping}
              handleMappingChange={handleMappingChange}
              renderSourceLabel={renderSourceLabel}
              onNext={() => setCurrentPage('simplification')}
            />
          ) : (
            <SimplificationContent
              onBack={() => setCurrentPage('mapping')}
            />
          )}
        </div>

        {/* Nested Modals - z-50 */}
        {showAutoGenModal && (
          <AutoGenerateModal
            columnName={currentEditColumn}
            columnType={dbColumns.find(c => c.name === currentEditColumn)?.type}
            onSave={handleAutoGenSave}
            onClose={() => {
              setShowAutoGenModal(false);
              setCurrentEditColumn(null);
            }}
            existingConfig={autoGenConfig[currentEditColumn]}
          />
        )}

        {showManualTableModal && (
          <ManualTableModal
            columnName={currentEditColumn}
            dbColumns={dbColumns}
            shpData={shpData}
            columnMapping={columnMapping}
            onSave={handleManualTableSave}
            onClose={() => {
              setShowManualTableModal(false);
              setCurrentEditColumn(null);
            }}
            existingData={manualTableData[currentEditColumn]}
          />
        )}
      </div>
    </div>
  );
}

// Mapping Content Component
function MappingContent({ dbColumns, shpColumns, selectedYear, columnMapping, handleMappingChange, renderSourceLabel, onNext }) {
  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <strong>File:</strong> provinsi_2019.shp → <strong>Tabel:</strong> provinsi
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm font-semibold text-gray-600 px-4">
        <div>Kolom di SHP</div>
        <div className="text-center">→</div>
        <div>Kolom di Database</div>
      </div>

      <div className="space-y-3 mb-8">
        {dbColumns.map((dbCol) => {
          const currentMapping = columnMapping[dbCol.name];
          
          return (
            <div key={dbCol.name} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <select
                    value={
                      currentMapping?.type === 'shp_column' ? currentMapping.source :
                      currentMapping?.type === 'null' ? '__NULL__' :
                      currentMapping?.type === 'year_dropdown' ? '__TAHUN_DATA__' :
                      currentMapping?.type === 'auto_generate' ? '__AUTO_GENERATE__' :
                      currentMapping?.type === 'manual_table' ? '__MANUAL_TABLE__' :
                      ''
                    }
                    onChange={(e) => handleMappingChange(dbCol.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">-- Pilih mapping --</option>
                    
                    <optgroup label="Kolom dari SHP">
                      {shpColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                      {dbCol.name === 'tahun_data' && (
                        <option value="__TAHUN_DATA__">tahun_data ({selectedYear})</option>
                      )}
                    </optgroup>
                    
                    <optgroup label="Auto Strategy">
                      <option value="__AUTO_GENERATE__">🔧 Auto-generate...</option>
                      <option value="__MANUAL_TABLE__">📊 Manual Input Mapping Tabel...</option>
                      <option value="__NULL__">⊘ NULL</option>
                    </optgroup>
                  </select>
                  
                  {currentMapping?.source && currentMapping.type !== 'shp_column' && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {renderSourceLabel(currentMapping)}
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="text-gray-400" size={24} />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">
                      {dbCol.name}
                    </span>
                    {dbCol.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Type: {dbCol.type}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
        >
          Lanjut ke Simplifikasi
        </button>
      </div>
    </>
  );
}

// Simplification Content Component
function SimplificationContent({ onBack }) {
  const [preventShapeRemoval, setPreventShapeRemoval] = useState(false);
  const [method, setMethod] = useState('douglas-pecker');
  const [percentage, setPercentage] = useState(50);
  const [isApplied, setIsApplied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const mockData = [
    { id: 1, provinsi: 'Aceh', original_points: 15420, simplified_points: 7710, reduction: '50%' },
    { id: 2, provinsi: 'Sumatera Utara', original_points: 18350, simplified_points: 9175, reduction: '50%' },
    { id: 3, provinsi: 'Sumatera Barat', original_points: 12890, simplified_points: 6445, reduction: '50%' },
    { id: 4, provinsi: 'Riau', original_points: 16720, simplified_points: 8360, reduction: '50%' },
    { id: 5, provinsi: 'Jambi', original_points: 14560, simplified_points: 7280, reduction: '50%' },
    { id: 6, provinsi: 'Sumatera Selatan', original_points: 13890, simplified_points: 6945, reduction: '50%' },
    { id: 7, provinsi: 'Bengkulu', original_points: 11230, simplified_points: 5615, reduction: '50%' },
    { id: 8, provinsi: 'Lampung', original_points: 12450, simplified_points: 6225, reduction: '50%' },
    { id: 9, provinsi: 'Kepulauan Bangka Belitung', original_points: 9840, simplified_points: 4920, reduction: '50%' },
    { id: 10, provinsi: 'Kepulauan Riau', original_points: 10560, simplified_points: 5280, reduction: '50%' },
    { id: 11, provinsi: 'DKI Jakarta', original_points: 8920, simplified_points: 4460, reduction: '50%' },
    { id: 12, provinsi: 'Jawa Barat', original_points: 19840, simplified_points: 9920, reduction: '50%' },
  ];
  
  const rowsPerPage = 10;
  const totalPages = Math.ceil(mockData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = mockData.slice(startIdx, endIdx);

  const handleApply = () => {
    setIsApplied(true);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setIsApplied(false);
    setPercentage(50);
  };

  return (
    <>
      <div className="space-y-6 mb-8">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="preventShapeRemoval"
            checked={preventShapeRemoval}
            onChange={(e) => setPreventShapeRemoval(e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="preventShapeRemoval" className="text-gray-700 font-medium cursor-pointer">
            Prevent shape removal
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Metode Simplifikasi
          </label>
          <div className="space-y-2">
            <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-3 ${
              method === 'douglas-pecker' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="method"
                value="douglas-pecker"
                checked={method === 'douglas-pecker'}
                onChange={(e) => setMethod(e.target.value)}
              />
              <span className="font-medium text-gray-800">Douglas-Peucker</span>
            </label>

            <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-3 ${
              method === 'visvalingam-effective' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="method"
                value="visvalingam-effective"
                checked={method === 'visvalingam-effective'}
                onChange={(e) => setMethod(e.target.value)}
              />
              <span className="font-medium text-gray-800">Visvalingam/Effective-Area</span>
            </label>

            <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-3 ${
              method === 'visvalingam-weighted' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="method"
                value="visvalingam-weighted"
                checked={method === 'visvalingam-weighted'}
                onChange={(e) => setMethod(e.target.value)}
              />
              <span className="font-medium text-gray-800">Visvalingam/Weighted-Area</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Persentase Simplifikasi
          </label>
          <div className="space-y-4">
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    setPercentage(value);
                  }
                }}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-600 font-medium">%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {isApplied && (
        <div className="border-t border-gray-200 pt-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Hasil Simplifikasi
          </h3>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">Provinsi</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 border-b">Original Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 border-b">Simplified Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 border-b">Reduction</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 border-b">{row.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-b">{row.provinsi}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right border-b">{row.original_points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right border-b">{row.simplified_points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold text-right border-b">{row.reduction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Menampilkan {startIdx + 1} - {Math.min(endIdx, mockData.length)} dari {mockData.length} data
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === idx + 1
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Kembali
        </button>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
        >
          Upload
        </button>
      </div>

      {showUploadModal && (
        <UploadProgressModal onClose={() => setShowUploadModal(false)} />
      )}
    </>
  );
}

// Upload Progress Modal (z-60)
function UploadProgressModal({ onClose }) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const duration = 30000;
    const interval = 100;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          setIsComplete(true);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {isComplete ? 'Upload Selesai!' : 'Uploading Data...'}
          </h2>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {isComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 text-center font-medium">
                ✓ Data berhasil diupload ke database!
              </p>
            </div>
          )}

          {!isComplete && (
            <p className="text-gray-600 text-sm text-center">
              Mohon tunggu, sedang mengupload data ke database...
            </p>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onClose}
            disabled={!isComplete}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isComplete
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// Auto-Generate Modal (z-50)
function AutoGenerateModal({ columnName, columnType, onSave, onClose, existingConfig }) {
  const [mode, setMode] = useState(existingConfig?.mode || 'sequence');
  const [startFrom, setStartFrom] = useState(existingConfig?.startFrom || 1);
  const [increment, setIncrement] = useState(existingConfig?.increment || 1);
  const [length, setLength] = useState(existingConfig?.length || 8);
  const [generatedData, setGeneratedData] = useState(existingConfig?.generatedData || []);
  
  const isNumeric = columnType === 'integer';

  const handleGenerate = () => {
    let data = [];
    if (mode === 'sequence') {
      for (let i = 0; i < 5; i++) {
        data.push(parseInt(startFrom) + (parseInt(increment) * i));
      }
    } else if (mode === 'continue') {
      const maxValue = 100;
      for (let i = 0; i < 5; i++) {
        data.push(maxValue + (parseInt(increment) * (i + 1)));
      }
    } else if (mode === 'random') {
      for (let i = 0; i < 5; i++) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let j = 0; j < parseInt(length); j++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        data.push(result);
      }
    }
    setGeneratedData(data);
  };

  const handleSave = () => {
    if (mode === 'sequence') {
      onSave({ mode, startFrom: parseInt(startFrom), increment: parseInt(increment), generatedData });
    } else if (mode === 'continue') {
      onSave({ mode, increment: parseInt(increment), generatedData });
    } else if (mode === 'random') {
      onSave({ mode, length: parseInt(length), generatedData });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Auto-Generate Configuration</h2>
              <p className="text-gray-600 mt-1">
                Kolom: <span className="font-semibold text-blue-600">{columnName}</span> ({columnType})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {(isNumeric || !isNumeric) && (
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                mode === 'sequence' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mode"
                    value="sequence"
                    checked={mode === 'sequence'}
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 mb-1">
                      Sequence dari angka tertentu
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Generate angka berurutan mulai dari angka yang ditentukan
                    </p>
                    {mode === 'sequence' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Mulai dari:</label>
                            <input
                              type="number"
                              value={startFrom}
                              onChange={(e) => setStartFrom(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Increment:</label>
                            <input
                              type="number"
                              value={increment}
                              onChange={(e) => setIncrement(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-xs bg-blue-100 text-blue-800 p-2 rounded">
                          Preview: {startFrom}, {parseInt(startFrom) + parseInt(increment)}, {parseInt(startFrom) + parseInt(increment) * 2}, ...
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </label>
            )}

            {(isNumeric || !isNumeric) && (
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                mode === 'continue' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mode"
                    value="continue"
                    checked={mode === 'continue'}
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 mb-1">
                      Lanjutkan dari database
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Ambil angka terakhir dari kolom database dan lanjutkan sequence
                    </p>
                    {mode === 'continue' && (
                      <>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Increment:</label>
                          <input
                            type="number"
                            value={increment}
                            onChange={(e) => setIncrement(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="1"
                          />
                        </div>
                        <div className="mt-2 text-xs bg-blue-100 text-blue-800 p-2 rounded">
                          Preview: (Max DB value) + {increment}, (Max DB value) + {parseInt(increment) * 2}, ...
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </label>
            )}

            {!isNumeric && (
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                mode === 'random' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="mode"
                    value="random"
                    checked={mode === 'random'}
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 mb-1">
                      Random string (angka + huruf)
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Generate ID unik dengan kombinasi angka dan huruf
                    </p>
                    {mode === 'random' && (
                      <>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Panjang string:</label>
                          <input
                            type="number"
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="8"
                            min="4"
                            max="32"
                          />
                        </div>
                        <div className="mt-2 text-xs bg-blue-100 text-blue-800 p-2 rounded">
                          Preview: a7k9m2x{length > 7 ? 'p' : ''}{length > 8 ? '4' : ''}... ({length} karakter)
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </label>
            )}
          </div>
          
          {generatedData.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-green-800 mb-2">Data yang akan di-generate:</div>
              <div className="text-sm text-green-700">
                {generatedData.join(', ')}...
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Generate Sekarang
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}

// Manual Table Input Modal Component (z-50)
function ManualTableModal({ columnName, dbColumns, shpData, columnMapping, onSave, onClose, existingData }) {
  const [tableData, setTableData] = useState(() => {
    if (existingData) return existingData;
    
    return shpData.map((row, idx) => {
      const newRow = { _rowId: idx };
      
      dbColumns.forEach(dbCol => {
        const mapping = columnMapping[dbCol.name];
        if (mapping?.type === 'shp_column' && row[mapping.source] !== undefined) {
          newRow[dbCol.name] = row[mapping.source];
        } else if (mapping?.type === 'year_dropdown') {
          const yearMatch = mapping.source.match(/\((\d{4})\)/);
          newRow[dbCol.name] = yearMatch ? yearMatch[1] : '';
        } else if (mapping?.type === 'auto_generate' && mapping.config?.generatedData) {
          newRow[dbCol.name] = mapping.config.generatedData[idx] || '';
        } else {
          newRow[dbCol.name] = '';
        }
      });
      
      return newRow;
    });
  });

  const handleCellChange = (rowId, columnName, value) => {
    setTableData(tableData.map(row => 
      row._rowId === rowId ? { ...row, [columnName]: value } : row
    ));
  };

  const handleSave = () => {
    const processedData = tableData.map(row => {
      const processedRow = { ...row };
      dbColumns.forEach(col => {
        if (processedRow[col.name] === '' || processedRow[col.name] === null) {
          processedRow[col.name] = col.type === 'integer' ? 0 : 'NaN';
        }
      });
      return processedRow;
    });
    
    onSave(processedData);
  };
  
  const isColumnLocked = (colName) => {
    const mapping = columnMapping[colName];
    return mapping?.type === 'shp_column' || 
           mapping?.type === 'year_dropdown' || 
           mapping?.type === 'auto_generate';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Manual Input Mapping Tabel</h2>
              <p className="text-gray-600 mt-1">
                Preview dan edit data untuk semua kolom
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <strong>Info:</strong> Kolom yang sudah di-mapping (dari SHP, tahun dropdown, atau auto-generate) akan otomatis terisi dan di-lock. 
                Isi kolom yang kosong secara manual. Sel kosong akan otomatis diisi: 
                <span className="font-semibold"> 0 (integer)</span> atau 
                <span className="font-semibold"> "NaN" (string)</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">
                    #
                  </th>
                  {dbColumns.map(col => (
                    <th key={col.name} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        {col.name}
                        {col.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        {col.type}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr key={row._rowId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                      {idx + 1}
                    </td>
                    {dbColumns.map(col => {
                      const mapping = columnMapping[col.name];
                      const isLocked = isColumnLocked(col.name);
                      
                      return (
                        <td key={col.name} className="px-4 py-2 border-b border-gray-100">
                          <input
                            type={col.type === 'integer' ? 'number' : 'text'}
                            value={row[col.name] || ''}
                            onChange={(e) => handleCellChange(row._rowId, col.name, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              isLocked
                                ? 'bg-blue-50 border-blue-200 cursor-not-allowed' 
                                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                            placeholder={
                              mapping?.type === 'shp_column' ? `Auto dari ${mapping.source}` :
                              mapping?.type === 'year_dropdown' ? 'Auto dari tahun dropdown' :
                              mapping?.type === 'auto_generate' ? 'Auto-generated' :
                              `Isi ${col.name}...`
                            }
                            disabled={isLocked}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Simpan Data Manual
          </button>
        </div>
      </div>
    </div>
  );
}