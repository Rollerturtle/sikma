import React, { useState, useEffect, useRef } from 'react';
import './filter.css';
import { 
  ArrowRight, 
  X, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

// =============== MODAL: Input Nama Tabel Baru ===============
function NewTableModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [tableName, setTableName] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!tableName.trim()) {
      setError('Nama tabel tidak boleh kosong');
      return;
    }

    const validPattern = /^[a-z][a-z0-9_]*$/;
    if (!validPattern.test(tableName)) {
      setError('Nama tabel harus lowercase, dimulai dengan huruf, hanya boleh huruf, angka, dan underscore');
      return;
    }

    if (tableName.length < 3 || tableName.length > 50) {
      setError('Nama tabel harus antara 3-50 karakter');
      return;
    }
    onSave(tableName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Buat Tabel Baru</h2>
          <p className="text-sm text-gray-600 mt-1">
            Masukkan nama tabel yang akan dibuat di database
          </p>
        </div>

        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nama Tabel
          </label>

          <input
            type="text"
            value={tableName}
            onChange={(e) => {
              setTableName(e.target.value.toLowerCase());
              setError('');
            }}
            placeholder="contoh: peta_karhutla_2024"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Aturan penamaan:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• Harus lowercase (huruf kecil semua)</li>
              <li>• Dimulai dengan huruf</li>
              <li>• Hanya boleh huruf, angka, dan underscore (_)</li>
              <li>• Panjang 3-50 karakter</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// =============== MODAL: Upload Langsung Tabel Baru ===============
function DirectUploadNewTableModal({ 
  onClose,
  uploadedFiles,
  selectedTable,
  selectedYear,
  dbfColumns,
  dbfData
}: any) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Memulai proses...');
  const [uploadStats, setUploadStats] = useState<any>(null);
  const uploadStartedRef = useRef(false);

  useEffect(() => {
    if (uploadStartedRef.current) return;
    uploadStartedRef.current = true;
    const autoMapping: any = {};
    dbfColumns.forEach((col: string) => {
      autoMapping[col.toLowerCase()] = {
        source: col,
        type: 'shp_column'
      };
    });

    autoMapping['tahun_data'] = {
      source: selectedYear,
      type: 'year_dropdown'
    };

    performUpload(autoMapping);
  }, []);

  const performUpload = async (mapping: any) => {
    try {
      setStatusMessage('Membuat tabel baru...');

      const formData = new FormData();
      uploadedFiles.forEach((file: File) => {
        formData.append('shpFiles', file);
      });

      formData.append('tableName', selectedTable);
      formData.append('year', selectedYear);
      formData.append('columnMapping', JSON.stringify(mapping));
      formData.append('isNewTable', 'true');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {

        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
          setStatusMessage(`Mengupload file... ${Math.round(percentComplete)}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setProgress(100);
            setIsComplete(true);
            setUploadStats(response);
            setStatusMessage(`Berhasil! Tabel '${selectedTable}' dibuat dan ${response.insertedCount} features diupload`);
          } catch (e) {
            setStatusMessage('Upload selesai!');
            setIsComplete(true);
            setProgress(100);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setStatusMessage('Upload gagal! ' + (errorResponse.details || xhr.statusText));
          } catch (e) {
            setStatusMessage('Upload gagal! ' + xhr.statusText);
          }
        }
      });
      xhr.addEventListener('error', () => {
        setStatusMessage('Terjadi kesalahan saat upload');
      });
      xhr.open('POST', 'http://localhost:3001/api/shp/create-table-and-upload');
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage('Gagal melakukan upload');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {isComplete ? 'Upload Selesai!' : 'Membuat Tabel & Upload...'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Tabel: <span className="font-semibold">{selectedTable}</span>
          </p>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{statusMessage}</span>
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
          {isComplete && uploadStats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 text-center font-medium mb-2">
                ✓ Tabel berhasil dibuat dan data diupload!
              </p>
              <div className="text-sm text-green-700 space-y-1">
                <div>• Tabel: <strong>{uploadStats.tableName}</strong></div>
                <div>• Features diupload: <strong>{uploadStats.insertedCount}</strong></div>
                {uploadStats.tableCreated && (
                  <div className="text-xs mt-2 text-green-600">
                    ℹ️ Tabel baru dibuat dengan struktur dari file SHP
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={!isComplete && progress > 0}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isComplete || progress === 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isComplete ? 'Selesai' : 'Batal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============== MODAL: Simplifikasi untuk Tabel Baru (Tanpa Mapping) ===============
function SimplifyNewTableModal({ 
  onClose,
  uploadedFiles,
  selectedTable,
  selectedYear,
  dbfColumns,
  dbfData
}: any) {
  const [preventShapeRemoval, setPreventShapeRemoval] = useState(false);
  const [method, setMethod] = useState('douglas-peucker');
  const [percentage, setPercentage] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleUpload = async () => {
    setIsUploading(true);
    setStatusMessage('Membuat tabel baru...');
    
    try {
      // ✅ PERBAIKAN: Auto-mapping sama seperti DirectUpload
      const autoMapping: any = {};
      
      dbfColumns.forEach((col: string) => {
        autoMapping[col.toLowerCase()] = {
          source: col,
          type: 'shp_column'
        };
      });
      
      autoMapping['tahun_data'] = {
        source: selectedYear,
        type: 'year_dropdown'
      };
      
      const formData = new FormData();
      uploadedFiles.forEach((file: File) => {
        formData.append('shpFiles', file);
      });
      formData.append('tableName', selectedTable);
      formData.append('year', selectedYear);
      formData.append('columnMapping', JSON.stringify(autoMapping));
      formData.append('isNewTable', 'true');
      formData.append('simplificationApplied', 'true');
      formData.append('method', method);
      formData.append('percentage', percentage.toString());
      formData.append('preventShapeRemoval', preventShapeRemoval.toString());

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
          setStatusMessage(`Mengupload dan menyederhanakan geometri... ${Math.round(percentComplete)}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setProgress(100);
            setUploadComplete(true);
            setUploadStats(response);
            setStatusMessage('Upload selesai!');
          } catch (e) {
            setStatusMessage('Upload selesai!');
            setUploadComplete(true);
            setProgress(100);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setStatusMessage('Upload gagal! ' + (errorResponse.details || xhr.statusText));
            setIsUploading(false);
          } catch (e) {
            setStatusMessage('Upload gagal! ' + xhr.statusText);
            setIsUploading(false);
          }
        }
      });

      xhr.addEventListener('error', () => {
        setStatusMessage('Terjadi kesalahan saat upload');
        setIsUploading(false);
      });

      xhr.open('POST', 'http://localhost:3001/api/shp/create-table-and-simplify');
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage('Gagal melakukan upload');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {uploadComplete ? 'Upload Selesai!' : 'Simplifikasi & Buat Tabel'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Tabel: <span className="font-semibold">{selectedTable}</span>
          </p>
          <p className="text-xs text-green-600 mt-1">
            🆕 Tabel akan dibuat otomatis dengan struktur dari file SHP
          </p>
        </div>

        <div className="p-6">
          {!isUploading && !uploadComplete ? (
            <>
              {/* Settings */}
              <div className="space-y-6 mb-6">
                {/* Prevent Shape Removal */}
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

                {/* Method Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Metode Simplifikasi
                  </label>
                  <div className="space-y-2">
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-3 ${
                      method === 'douglas-peucker' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}>
                      <input
                        type="radio"
                        name="method"
                        value="douglas-peucker"
                        checked={method === 'douglas-peucker'}
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
                  </div>
                </div>

                {/* Percentage Slider */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Target Simplifikasi (Maksimal)
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
                      <span className="text-gray-600 font-medium">% maksimal pengurangan per feature</span>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <strong>Info:</strong> Tabel akan dibuat otomatis dan simplifikasi diterapkan saat upload. 
                      Setiap geometri akan disederhanakan maksimal {percentage}% dari titik aslinya.
                      {preventShapeRemoval && ' Shape removal protection aktif.'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Upload Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{statusMessage}</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      uploadComplete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {uploadComplete && uploadStats && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-center font-medium mb-3">
                    ✓ Tabel berhasil dibuat dan data diupload dengan simplifikasi!
                  </p>
                  <div className="text-sm text-green-700 space-y-2">
                    <div className="flex justify-between">
                      <span>Tabel:</span>
                      <strong>{uploadStats.tableName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Features diupload:</span>
                      <strong>{uploadStats.insertedCount}</strong>
                    </div>
                    {uploadStats.simplifiedCount > 0 && (
                      <div className="flex justify-between">
                        <span>Features disederhanakan:</span>
                        <strong>{uploadStats.simplifiedCount}</strong>
                      </div>
                    )}
                    {uploadStats.simplificationDetails && (
                      <>
                        <hr className="border-green-200" />
                        <div className="flex justify-between">
                          <span>Target simplifikasi:</span>
                          <strong>{uploadStats.simplificationDetails.targetPercentage}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Actual reduction:</span>
                          <strong>{uploadStats.simplificationDetails.overallReduction}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          {!isUploading && !uploadComplete && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buat Tabel & Upload
              </button>
            </>
          )}
          {uploadComplete && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============== MODAL COMPONENTS ===============
// Main Workflow Modal (z-40) - NO BLACK BACKGROUND
function ShpUploadWorkflowModal({ 
  onClose, 
  uploadedFiles, 
  selectedTable, 
  selectedYear, 
  dbfColumns,
  dbfData,
  isNewTable = false
}: { 
  onClose: () => void;
  uploadedFiles: File[];
  selectedTable: string;
  selectedYear: string;
  dbfColumns: string[];
  dbfData: any[];
  isNewTable?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState<'mapping' | 'simplification'>('mapping');
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [showManualTableModal, setShowManualTableModal] = useState(false);
  const [currentEditColumn, setCurrentEditColumn] = useState<string | null>(null);
  const [autoGenConfig, setAutoGenConfig] = useState<Record<string, any>>({});
  const [manualTableData, setManualTableData] = useState<Record<string, any>>({});
  const [dbColumns, setDbColumns] = useState<any[]>([]);
  // const [dbfData, setDbfData] = useState<any[]>([]);
  const [skipSimplification, setSkipSimplification] = useState(false);
  const [fullShpFiles, setFullShpFiles] = useState<File[]>([]);
  const [fullFilesReady, setFullFilesReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedTempFiles, setUploadedTempFiles] = useState<string[]>([]);
  const [showDirectUploadModal, setShowDirectUploadModal] = useState(false);

  useEffect(() => {
    const hasShp = uploadedFiles.some(f => f.name.toLowerCase().endsWith('.shp'));
    const hasShx = uploadedFiles.some(f => f.name.toLowerCase().endsWith('.shx'));
    const hasDbf = uploadedFiles.some(f => f.name.toLowerCase().endsWith('.dbf'));
    
    if (hasShp && hasShx && hasDbf) {
      setFullShpFiles(uploadedFiles);
      setFullFilesReady(true);
      console.log('✅ Files dari upload awal sudah lengkap!');
    }
  }, [uploadedFiles]);

  // Fetch database columns for selected table
  useEffect(() => {
    const fetchTableColumns = async () => {

      if (isNewTable) {
        // Untuk tabel baru, buat kolom default dari DBF
        const defaultColumns = dbfColumns.map((col: string) => ({
          name: col.toLowerCase(),
          type: 'text',
          required: false,
          hasDefault: false,
          shouldSkip: false
        }));

        defaultColumns.push({
          name: 'tahun_data',
          type: 'integer',
          required: false,
          hasDefault: false,
          shouldSkip: false
        });
        setDbColumns(defaultColumns);
        return;
      }

      try {
        const response = await fetch(`http://localhost:3001/api/table-columns/${selectedTable}`);
        const columns = await response.json();
        setDbColumns(columns);
      } catch (error) {
        console.error('Error fetching table columns:', error);
      }
    };
    if (selectedTable) {
      fetchTableColumns();
    }
  }, [selectedTable, isNewTable, dbfColumns]);

  const dbfFileName = uploadedFiles.find(f => f.name.toLowerCase().endsWith('.dbf'))?.name || 'unknown.dbf';

  const [columnMapping, setColumnMapping] = useState<Record<string, any>>({});

  // Initialize column mapping when dbColumns are loaded
  useEffect(() => {
    if (dbColumns.length > 0) {
      const initialMapping: Record<string, any> = {};
      dbColumns.forEach(col => {
        if (col.shouldSkip) {
        initialMapping[col.name] = { source: 'SKIP', type: 'skip' };
      } else {
        initialMapping[col.name] = { source: '', type: '' };
      }
      });
      setColumnMapping(initialMapping);
    }
  }, [dbColumns]);

  const handleMappingChange = (dbCol: string, value: string) => {
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

  const handleAutoGenSave = (config: any) => {
    setAutoGenConfig({
      ...autoGenConfig,
      [currentEditColumn!]: config
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
      [currentEditColumn!]: { source: displayText, type: 'auto_generate', config }
    });
    setShowAutoGenModal(false);
    setCurrentEditColumn(null);
  };

  const handleManualTableSave = (data: any) => {
    setManualTableData({
      ...manualTableData,
      [currentEditColumn!]: data
    });
    setColumnMapping({
      ...columnMapping,
      [currentEditColumn!]: { source: 'Manual Input Mapping Tabel', type: 'manual_table', data }
    });
    setShowManualTableModal(false);
    setCurrentEditColumn(null);
  };

  // Fungsi untuk handle upload file SHP lengkap
const handleFullShpUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  const fileArray = Array.from(files);
  
  // Check required files
  const hasShp = fileArray.some(f => f.name.toLowerCase().endsWith('.shp'));
  const hasShx = fileArray.some(f => f.name.toLowerCase().endsWith('.shx'));
  const hasDbf = fileArray.some(f => f.name.toLowerCase().endsWith('.dbf'));
  
  if (!hasShp || !hasShx || !hasDbf) {
    alert('File SHP tidak lengkap!\n\nFile yang wajib:\n- .shp (geometri)\n- .shx (index)\n- .dbf (atribut)\n\nFile opsional:\n- .prj (proyeksi)');
    event.target.value = '';
    return;
  }
  
  setFullShpFiles(fileArray);
  setFullFilesReady(true);
  alert(`File SHP lengkap berhasil diupload!\n\nFile:\n${fileArray.map(f => '- ' + f.name).join('\n')}\n\nSilakan lanjutkan ke proses simplifikasi atau upload langsung.`);
  event.target.value = '';
};

  const renderSourceLabel = (mapping: any) => {
    if (!mapping.source) return '-- Pilih mapping --';
    if (mapping.type === 'null') return '⊘ NULL';
    if (mapping.type === 'skip') return '⏭️ SKIP (Auto dari Database)';
    if (mapping.type === 'year_dropdown') return `📅 ${mapping.source}`;
    if (mapping.type === 'auto_generate') return `🔧 ${mapping.source}`;
    if (mapping.type === 'manual_table') return `📊 ${mapping.source}`;
    return mapping.source;
  };

  // Direct upload function (skip simplification)
  async function handleDirectUpload() {
    if (!fullFilesReady || fullShpFiles.length === 0) {
      alert('Silakan upload file SHP lengkap terlebih dahulu!');
      return;
    }
    
    // Show upload modal instead of direct upload
    setShowDirectUploadModal(true);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-40 p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-8 max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {currentPage === 'mapping' ? 'Edit Column Mapping' : 'Simplifikasi Geometri'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {currentPage === 'mapping'
                ? `Mapping kolom dari file SHP ke ${isNewTable ? 'tabel baru' : 'database'}`
                : 'Lakukan simplifikasi terhadap geometri'}
            </p>
            {isNewTable && (
              <p className="text-green-600 text-xs mt-1 font-semibold">
                🆕 Tabel "{selectedTable}" akan dibuat otomatis
              </p>
            )}
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
              shpColumns={dbfColumns}
              selectedYear={selectedYear}
              selectedTable={selectedTable}
              dbfFileName={dbfFileName}
              columnMapping={columnMapping}
              handleMappingChange={handleMappingChange}
              renderSourceLabel={renderSourceLabel}
              fullFilesReady={fullFilesReady}
            onFullShpUpload={handleFullShpUpload}
            isUploading={isUploading}
            onNext={() => {
              setCurrentPage('simplification');
            }}
            onSkipSimplification={handleDirectUpload}
            />
          ) : (
            <SimplificationContent 
              onBack={() => setCurrentPage('mapping')}
              fullShpFiles={fullShpFiles}
              columnMapping={columnMapping}
              selectedTable={selectedTable}
              selectedYear={selectedYear}
              onUploadComplete={onClose}
            />
          )}
        </div>

        {/* Nested Modals */}
        {showAutoGenModal && currentEditColumn && (
          <AutoGenerateModal
            columnName={currentEditColumn}
            columnType={dbColumns.find(c => c.name === currentEditColumn)?.type || 'string'}
            onSave={handleAutoGenSave}
            onClose={() => {
              setShowAutoGenModal(false);
              setCurrentEditColumn(null);
            }}
            existingConfig={autoGenConfig[currentEditColumn]}
          />
        )}

        {showManualTableModal && currentEditColumn && (
          <ManualTableModal
            columnName={currentEditColumn}
            dbColumns={dbColumns}
            shpData={dbfData}
            columnMapping={columnMapping}
            onSave={handleManualTableSave}
            onClose={() => {
              setShowManualTableModal(false);
              setCurrentEditColumn(null);
            }}
            existingData={manualTableData[currentEditColumn]}
          />
        )}
        {/* Direct Upload Modal (tanpa simplifikasi) */}
        {showDirectUploadModal && (
          <DirectUploadProgressModal
            onClose={() => {
              setShowDirectUploadModal(false);
              onClose();
            }}
            fullShpFiles={fullShpFiles}
            columnMapping={columnMapping}
            selectedTable={selectedTable}
            selectedYear={selectedYear}
          />
        )}
      </div>
    </div>
  );
}

// Mapping Content Component
function MappingContent({ 
  dbColumns, 
  shpColumns, 
  selectedYear, 
  selectedTable,
  dbfFileName,
  columnMapping, 
  handleMappingChange, 
  renderSourceLabel, 
  onNext,
  onSkipSimplification,
  fullFilesReady,
  onFullShpUpload,
  isUploading 
}: any) {
  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <strong>File:</strong> {dbfFileName} → <strong>Tabel:</strong> {selectedTable}
          </div>
        </div>
      </div>

      {/* Upload File SHP Lengkap */}
      {/* <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
          <div className="text-sm text-yellow-800">
            <strong>Langkah selanjutnya:</strong> Upload file SHP lengkap (.shp, .shx, .dbf, .prj) untuk melanjutkan proses
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer">
            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              fullFilesReady 
                ? 'border-green-400 bg-green-50' 
                : 'border-yellow-400 bg-white hover:bg-yellow-50'
            }`}>
              <input
                type="file"
                multiple
                accept=".shp,.shx,.dbf,.prj,.cpg"
                onChange={onFullShpUpload}
                className="hidden"
                disabled={isUploading}
              />
              {fullFilesReady ? (
                <div className="text-green-700 font-semibold">
                  ✓ File SHP lengkap sudah diupload
                </div>
              ) : (
                <div className="text-yellow-700">
                  📁 Klik untuk upload file SHP lengkap
                </div>
              )}
            </div>
          </label>
        </div>
      </div> */}

      {!fullFilesReady && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>File belum lengkap:</strong> Upload file SHP lengkap (.shp, .shx, .dbf, .prj) untuk melanjutkan
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-yellow-400 bg-white hover:bg-yellow-50 rounded-lg p-4 text-center transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".shp,.shx,.dbf,.prj,.cpg"
                  onChange={onFullShpUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <div className="text-yellow-700">
                  📁 Klik untuk upload file SHP lengkap
                </div>
              </div>
            </label>
          </div>
        </div>
      )} {/* Kode ini yang diubah */}
      
      {fullFilesReady && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-green-600 text-2xl">✓</div>
            <div className="text-sm text-green-800">
              <strong>File SHP lengkap siap!</strong> Silakan lanjutkan ke simplifikasi atau upload langsung.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm font-semibold text-gray-600 px-4">
        <div>Kolom di SHP</div>
        <div className="text-center">→</div>
        <div>Kolom di Database</div>
      </div>
      <div className="space-y-3 mb-8">
        {dbColumns.map((dbCol: any) => {
          const currentMapping = columnMapping[dbCol.name];
          return (
            <div key={dbCol.name} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <select
                    value={
                      currentMapping?.type === 'shp_column' ? currentMapping.source :
                      currentMapping?.type === 'null' ? '__NULL__' :
                      currentMapping?.type === 'skip' ? '__SKIP__' :
                      currentMapping?.type === 'year_dropdown' ? '__TAHUN_DATA__' :
                      currentMapping?.type === 'auto_generate' ? '__AUTO_GENERATE__' :
                      currentMapping?.type === 'manual_table' ? '__MANUAL_TABLE__' :
                      ''
                    }
                    onChange={(e) => handleMappingChange(dbCol.name, e.target.value)}
                    disabled={currentMapping?.type === 'skip'} // Disable jika auto-skip
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      currentMapping?.type === 'skip' 
                        ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">-- Pilih mapping --</option>
                    <optgroup label="Kolom dari SHP">
                      {shpColumns.map((col: string) => (
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
          onClick={onSkipSimplification}
          disabled={!fullFilesReady || isUploading}
          className={`px-6 py-3 border-2 rounded-lg transition-colors text-lg font-semibold ${
            fullFilesReady && !isUploading
              ? 'border-blue-600 text-blue-600 hover:bg-blue-50'
              : 'border-gray-300 text-gray-400 cursor-not-allowed'
          }`}
          title={!fullFilesReady ? 'Upload file SHP lengkap terlebih dahulu' : ''}
        >
          {isUploading ? 'Uploading...' : 'Upload tanpa Simplifikasi'}
        </button>
        <button
          onClick={onNext}
          disabled={!fullFilesReady || isUploading}
          className={`px-8 py-3 rounded-lg transition-colors text-lg font-semibold ${
            fullFilesReady && !isUploading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!fullFilesReady ? 'Upload file SHP lengkap terlebih dahulu' : ''}
        >
          Lanjut ke Simplifikasi
        </button>
      </div>
    </>
  );
}

// Simplification Content Component
function SimplificationContent({ 
  onBack, 
  fullShpFiles, 
  columnMapping, 
  selectedTable, 
  selectedYear,
  onUploadComplete 
}: { 
  onBack: () => void;
  fullShpFiles: File[];
  columnMapping: any;
  selectedTable: string;
  selectedYear: string;
  onUploadComplete: () => void;
}) {
  const [preventShapeRemoval, setPreventShapeRemoval] = useState(false);
  const [method, setMethod] = useState('douglas-peucker');
  const [percentage, setPercentage] = useState(50);
  const [isApplied, setIsApplied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [simplificationResult, setSimplificationResult] = useState<any[]>([]);
  const [isSimplifying, setIsSimplifying] = useState(false);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(simplificationResult.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = simplificationResult.slice(startIdx, endIdx);

  const handleApply = async () => {
    setIsSimplifying(true);
    try {
      const formData = new FormData();
      fullShpFiles.forEach(file => {
        formData.append('shpFiles', file);
      });
      formData.append('method', method);
      formData.append('percentage', percentage.toString());
      formData.append('preventShapeRemoval', preventShapeRemoval.toString());
      
      console.log('🔄 Starting simplification with:', {
        method,
        percentage,
        preventShapeRemoval,
        fileCount: fullShpFiles.length
      });

      const response = await fetch('http://localhost:3001/api/shp/simplify', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Simplification failed');
      }
      
      const result = await response.json();
      setSimplificationResult(result.statistics);
      setIsApplied(true);
      setCurrentPage(1);
      alert(`✅ Simplifikasi berhasil!\n\n${result.statistics.length} features telah disederhanakan.`);
    } catch (error: any) {
      console.error('❌ Error during simplification:', error);
      alert(`❌ Gagal melakukan simplifikasi:\n${error.message}`);
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleReset = () => {
    setIsApplied(false);
    setPercentage(50);
    setSimplificationResult([]);
  };

  return (
    <>
    {/* Loading Overlay */}
      {isSimplifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Memproses Simplifikasi</h3>
              <p className="text-gray-600 text-center text-sm">
                Sedang menyederhanakan geometri menggunakan metode {method === 'douglas-peucker' ? 'Douglas-Peucker' : method === 'visvalingam-effective' ? 'Visvalingam/Effective-Area' : 'Visvalingam/Weighted-Area'}...
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Mohon tunggu, proses ini mungkin memakan waktu beberapa saat
              </p>
            </div>
          </div>
        </div>
      )}

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
              method === 'douglas-peucker' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="method"
                value="douglas-peucker"
                checked={method === 'douglas-peucker'}
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
            disabled={isSimplifying || !fullShpFiles || fullShpFiles.length === 0}
            className={`px-6 py-2 rounded-lg transition-colors font-medium ${
              isSimplifying || !fullShpFiles || fullShpFiles.length === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={!fullShpFiles || fullShpFiles.length === 0 ? 'Upload file SHP terlebih dahulu' : ''}
          >
            {isSimplifying ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
            ) : 'Apply'}
          </button>
          <button
            onClick={handleReset}
            disabled={isSimplifying}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
      {isApplied && simplificationResult.length > 0 && (
        <div className="border-t border-gray-200 pt-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <strong>Hasil Simplifikasi:</strong> {simplificationResult.length} features berhasil disederhanakan menggunakan metode <strong>{method === 'douglas-peucker' ? 'Douglas-Peucker' : method === 'visvalingam-effective' ? 'Visvalingam/Effective-Area' : 'Visvalingam/Weighted-Area'}</strong> dengan tingkat simplifikasi <strong>{percentage}%</strong>
                {preventShapeRemoval && ' (dengan perlindungan penghapusan shape)'}
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-600 mb-1">Total Points (Original)</div>
              <div className="text-2xl font-bold text-blue-900">
                {simplificationResult.reduce((sum, row) => sum + row.original_points, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-green-600 mb-1">Total Points (Simplified)</div>
              <div className="text-2xl font-bold text-green-900">
                {simplificationResult.reduce((sum, row) => sum + row.simplified_points, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-purple-600 mb-1">Average Reduction</div>
              <div className="text-2xl font-bold text-purple-900">
                {(simplificationResult.reduce((sum, row) => {
                  const reduction = parseFloat(row.reduction.replace('%', ''));
                  return sum + reduction;
                }, 0) / simplificationResult.length).toFixed(1)}%
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Hasil Simplifikasi
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-b">Feature</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 border-b">Original Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 border-b">Simplified Points</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 border-b">Reduction</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 border-b">{startIdx + idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-b">{row.feature_name || `Feature ${startIdx + idx + 1}`}</td>
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
              Menampilkan {startIdx + 1} - {Math.min(endIdx, simplificationResult.length)} dari {simplificationResult.length} data
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
        {!isApplied && (

          <button

            onClick={handleApply}

            disabled={isSimplifying}

            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold disabled:bg-gray-400"

          >

            {isSimplifying ? 'Memproses...' : 'Terapkan Simplifikasi'}

          </button>

        )}

        {isApplied && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
          >
            Upload ke Database
          </button>
        )}
      </div>
      {showUploadModal && (
        <UploadProgressModal 
          onClose={() => {
            setShowUploadModal(false);
            onUploadComplete();
          }}
          fullShpFiles={fullShpFiles}
          columnMapping={columnMapping}
          selectedTable={selectedTable}
          selectedYear={selectedYear}
          simplificationApplied={true}
          method={method}
          percentage={percentage}
          preventShapeRemoval={preventShapeRemoval}
        />
      )}
    </>
  );
}

// ============== DIRECT UPLOAD PROGRESS MODAL (TANPA SIMPLIFIKASI) ==============

function DirectUploadProgressModal({ 
  onClose,
  fullShpFiles,
  columnMapping,
  selectedTable,
  selectedYear
}: { 
  onClose: () => void;
  fullShpFiles: File[];
  columnMapping: any;
  selectedTable: string;
  selectedYear: string;
}) {

  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Memulai upload...');
  const [uploadStats, setUploadStats] = useState<any>(null);

  useEffect(() => {
    performUpload();
  }, []);

  const performUpload = async () => {
    try {
      const formData = new FormData();
      fullShpFiles.forEach(file => {
        formData.append('shpFiles', file);
      });
      formData.append('tableName', selectedTable);
      formData.append('year', selectedYear);
      formData.append('columnMapping', JSON.stringify(columnMapping));

      console.log('📤 Direct upload (no simplification):', {
        table: selectedTable,
        year: selectedYear,
        files: fullShpFiles.length
      });

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
          setStatusMessage(`Mengupload file... ${Math.round(percentComplete)}%`);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setProgress(100);
            setIsComplete(true);
            setUploadStats(response);
            setStatusMessage(`Upload selesai! ${response.insertedCount} features diupload`);
          } catch (e) {
            setStatusMessage('Upload selesai!');
            setIsComplete(true);
            setProgress(100);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setStatusMessage('Upload gagal! ' + (errorResponse.details || xhr.statusText));
          } catch (e) {
            setStatusMessage('Upload gagal! ' + xhr.statusText);
          }
        }
      });

      xhr.addEventListener('error', () => {
        setStatusMessage('Terjadi kesalahan saat upload');
      });
      xhr.open('POST', 'http://localhost:3001/api/shp/upload-direct');
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage('Gagal melakukan upload');
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {isComplete ? 'Upload Selesai!' : 'Uploading Data...'}
          </h2>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{statusMessage}</span>
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
              <p className="text-green-800 text-center font-medium mb-2">
                ✓ Data berhasil diupload ke database!
              </p>
              {uploadStats && (
                <div className="text-sm text-green-700 space-y-1">
                  <div>• Features diupload: <strong>{uploadStats.insertedCount}</strong></div>
                  <div className="text-xs mt-2 text-green-600">
                    ℹ️ Upload langsung tanpa simplifikasi geometri
                  </div>
                </div>
              )}
            </div>
          )}
          {!isComplete && progress > 0 && (
            <p className="text-gray-600 text-sm text-center">
              Mohon tunggu, sedang mengupload data ke database...
            </p>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={!isComplete && progress > 0}
          >
            {!isComplete && progress > 0 ? 'Uploading...' : 'Batal'}
          </button>
          <button
            onClick={handleFinish}
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

// ============== UPLOAD PROGRESS MODAL (DENGAN SIMPLIFIKASI) ==============
// Upload Progress Modal (z-60)
function UploadProgressModal({ 
  onClose,
  fullShpFiles,
  columnMapping,
  selectedTable,
  selectedYear,
  simplificationApplied,
  method,
  percentage,
  preventShapeRemoval
}: { 
  onClose: () => void;
  fullShpFiles: File[];
  columnMapping: any;
  selectedTable: string;
  selectedYear: string;
  simplificationApplied: boolean;
  method?: string;
  percentage?: number;
  preventShapeRemoval?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Memulai upload...');
  const [uploadStats, setUploadStats] = useState<any>(null);

  useEffect(() => {
    performUpload();
  }, []);

  const performUpload = async () => {
    try {
      const formData = new FormData();
      fullShpFiles.forEach(file => {
        formData.append('shpFiles', file);
      });
      formData.append('tableName', selectedTable);
      formData.append('year', selectedYear);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      formData.append('simplificationApplied', simplificationApplied.toString());

      if (simplificationApplied && method) {
        formData.append('method', method);
        formData.append('percentage', percentage?.toString() || '50');
        formData.append('preventShapeRemoval', preventShapeRemoval?.toString() || 'false');
        console.log('📤 Uploading with simplification:', { method, percentage, preventShapeRemoval });
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
          setStatusMessage(`Mengupload file... ${Math.round(percentComplete)}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setProgress(100);
            setIsComplete(true);
            setUploadStats(response);
            const message = simplificationApplied 
              ? `Upload selesai! ${response.insertedCount} features diupload${response.simplifiedCount ? ` (${response.simplifiedCount} disederhanakan)` : ''}`
              : `Upload selesai! ${response.insertedCount} features diupload`;
            setStatusMessage(message);
          } catch (e) {
            setStatusMessage('Upload selesai!');
            setIsComplete(true);
            setProgress(100);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setStatusMessage('Upload gagal! ' + (errorResponse.details || xhr.statusText));
          } catch (e) {
            setStatusMessage('Upload gagal! ' + xhr.statusText);
          }
        }
      });

      xhr.addEventListener('error', () => {
        setStatusMessage('Terjadi kesalahan saat upload');
      });

      xhr.open('POST', 'http://localhost:3001/api/shp/upload-to-db');
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage('Gagal melakukan upload');
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {isComplete ? 'Upload Selesai!' : 'Uploading Data...'}
          </h2>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{statusMessage}</span>
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
              {uploadStats && (
                <div className="text-sm text-green-700 space-y-1">
                  <div>• Features diupload: <strong>{uploadStats.insertedCount}</strong></div>
                  {uploadStats.simplifiedCount > 0 && (
                    <div>• Features disederhanakan: <strong>{uploadStats.simplifiedCount}</strong></div>
                  )}
                  {uploadStats.simplificationApplied && (
                    <div className="text-xs mt-2 text-green-600">
                      ℹ️ Simplifikasi geometri telah diterapkan
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!isComplete && progress > 0 && (
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
            onClick={handleFinish}
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
function AutoGenerateModal({ columnName, columnType, onSave, onClose, existingConfig }: any) {
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
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
function ManualTableModal({ columnName, dbColumns, shpData, columnMapping, onSave, onClose, existingData }: any) {
  const [tableData, setTableData] = useState(() => {
    if (existingData) return existingData;
    return shpData.map((row: any, idx: number) => {
      const newRow: any = { _rowId: idx };
      dbColumns.forEach((dbCol: any) => {
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

  const handleCellChange = (rowId: number, columnName: string, value: string) => {
    setTableData(tableData.map((row: any) => 
      row._rowId === rowId ? { ...row, [columnName]: value } : row
    ));
  };

  const handleSave = () => {
    const processedData = tableData.map((row: any) => {
      const processedRow = { ...row };
      dbColumns.forEach((col: any) => {
        if (processedRow[col.name] === '' || processedRow[col.name] === null) {
          processedRow[col.name] = col.type === 'integer' ? 0 : 'NaN';
        }
      });
      return processedRow;
    });
    onSave(processedData);
  };

  const isColumnLocked = (colName: string) => {
    const mapping = columnMapping[colName];
    return mapping?.type === 'shp_column' || 
           mapping?.type === 'year_dropdown' || 
           mapping?.type === 'auto_generate';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
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
                  {dbColumns.map((col: any) => (
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
                {tableData.map((row: any, idx: number) => (
                  <tr key={row._rowId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                      {idx + 1}
                    </td>
                    {dbColumns.map((col: any) => {
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

// =============== MAIN FILTER COMPONENT ===============
// Mapping dari selection ke tabel database
const TABLE_MAPPING: Record<string, string> = {
  'Kebencanaan.Kebakaran': 'areal_karhutla_2024',
  'Kebencanaan.Longsor': 'lahan_kritis',
  'Kebencanaan.Banjir': 'penutupan_lahan_2024',
  'Kerawanan.Kebakaran': 'risk_analysis',
  'Kerawanan.Longsor': 'risk_analysis', 
  'Kerawanan.Banjir': 'risk_analysis'
};

// Mapping layer names ke table names untuk Mitigasi/Adaptasi
const MITIGATION_TABLE_MAPPING: Record<string, string> = {
  'Peta Areal Karhutla': 'areal_karhutla_2024',
  'Peta Lahan Kritis': 'lahan_kritis',
  'Peta Penutupan Lahan': 'penutupan_lahan_2024',
  'Peta Rawan Karhutla': 'rawan_karhutla_2024',
  'Peta Rawan Erosi': 'rawan_erosi',
  'Peta Rawan Limpasan': 'rawan_limpasan',
};

const DISASTER_SPECIFIC_LAYERS: Record<string, Array<{label: string, table?: string, disabled: boolean}>> = {
  'Banjir': [
    { label: 'Kawasan Hutan', disabled: true },
    { label: 'Limpasan Air', table: 'rawan_limpasan', disabled: false },
    { label: 'Kerentanan Banjir', disabled: true },
    { label: 'Tutupan Lahan', table: 'penutupan_lahan_2024', disabled: false },
    { label: 'Kemiringan Lereng', disabled: true }
  ],
  'Longsor': [
    { label: 'Kawasan Hutan', disabled: true },
    { label: 'Kerentanan Longsor', disabled: true },
    { label: 'Kemiringan Lereng', disabled: true },
    { label: 'Tutupan Lahan', table: 'penutupan_lahan_2024', disabled: false },
    { label: 'Lahan Kritis', table: 'lahan_kritis', disabled: false },
    { label: 'Geologi', disabled: true },
    { label: 'Jenis Tanah', disabled: true },
    { label: 'Bahaya Erosi', table: 'rawan_erosi', disabled: false }
  ],
  'Kebakaran': [
    { label: 'Kawasan Hutan', disabled: true },
    { label: 'Hotspot', disabled: true },
    { label: 'Kerentanan Kebakaran', table: 'rawan_karhutla_2024', disabled: false },
    { label: 'Tutupan Lahan', table: 'penutupan_lahan_2024', disabled: false }
  ]
};

interface FilterProps {
  onFilterChange: (filterData: any) => void;
  onTabChange: (tab: string) => void;
  onResetToMain?: () => void;
  onMapCountChange?: (count: number) => void;
}

export function Filter({ onFilterChange, onTabChange, onResetToMain, onMapCountChange }: FilterProps) {
  // State untuk tab aktif
  const [activeTab, setActiveTab] = useState<'Kerawanan' | 'Kebencanaan' | 'Mitigasi/Adaptasi' | 'Manajemen File SHP'>('Kerawanan');
  
  // States untuk SHP Management
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isNewTable, setIsNewTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedUploadYear, setSelectedUploadYear] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedTempFiles, setUploadedTempFiles] = useState<string[]>([]);
  const [dbfColumns, setDbfColumns] = useState<string[]>([]);
  const [dbfData, setDbfData] = useState<any[]>([]);
  const [uploadPending, setUploadPending] = useState(false);

  // State untuk modal upload workflow
  const [showUploadWorkflow, setShowUploadWorkflow] = useState(false);
  const [showDirectUploadNewTable, setShowDirectUploadNewTable] = useState(false);

  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [activeLocationLevel, setActiveLocationLevel] = useState<'Provinsi' | 'Kabupaten/Kota' | 'Kecamatan' | 'DAS'>('Provinsi');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedMitigationLayers, setSelectedMitigationLayers] = useState<string[]>([]);
  const [mapCount, setMapCount] = useState<number>(1);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [mitigationMode, setMitigationMode] = useState<'Kerawanan' | 'Kebencanaan' | 'Gabungan'>('Kerawanan');
  const [showMitigationDropdown, setShowMitigationDropdown] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showSimplifyNewTable, setShowSimplifyNewTable] = useState(false);

  const [locationData, setLocationData] = useState<{[key: string]: string[]}>({
    'Provinsi': [],
    'Kabupaten/Kota': [],
    'Kecamatan': [],
    'DAS': []
  });
  const [locationSearch, setLocationSearch] = useState('');
  const yearOptions = ['2020', '2021', '2022', '2023', '2024', '2025'];
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  
  useEffect(() => {
    if (activeTab === 'Mitigasi/Adaptasi') {
      const mapCount = 1 + selectedMitigationLayers.length;
      if (onMapCountChange) {
        onMapCountChange(mapCount);
      }
    }
  }, [selectedMitigationLayers, activeTab, onMapCountChange]);

  // Load available tables from API
  useEffect(() => {
  const fetchTables = async () => {
    try {
      console.log('🔄 Fetching tables...');
      const response = await fetch('http://localhost:3001/api/tables-list');
      console.log('📡 Response status:', response.status);
      
      const tables = await response.json();
      console.log('📋 Tables received:', tables);
      
      setAvailableTables(tables);
    } catch (error) {
      console.error('❌ Error fetching tables:', error);
    }
  };
  fetchTables();
}, []);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    onTabChange(activeTab);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowLocationDropdown(false);
        setShowMitigationDropdown(false);
      }
    };
    if (showLocationDropdown || showMitigationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationDropdown, showMitigationDropdown]);

  const loadFilterOptions = async () => {
    try {
      const provincesResponse = await fetch('http://localhost:3001/api/filter/provinces');
      const provinces = await provincesResponse.json();
      const provinceNames = provinces
        .map((p: any) => p.provinsi)
        .filter((name: any) => name && typeof name === 'string');

      const kabupatenResponse = await fetch('http://localhost:3001/api/filter/kabupaten');
      const kabupaten = await kabupatenResponse.json();
      const kabupatenNames = kabupaten
        .map((k: any) => k.kab_kota)
        .filter((name: any) => name && typeof name === 'string');

      const kecamatanResponse = await fetch('http://localhost:3001/api/filter/kecamatan');
      const kecamatan = await kecamatanResponse.json();
      const kecamatanNames = kecamatan
        .map((k: any) => k.kecamatan)
        .filter((name: any) => name && typeof name === 'string');

      const dasResponse = await fetch('http://localhost:3001/api/filter/das');
      const das = await dasResponse.json();
      const dasNames = das
        .map((d: any) => d.nama_das)
        .filter((name: any) => name && typeof name === 'string');

      setLocationData({
        'Provinsi': provinceNames,
        'Kabupaten/Kota': kabupatenNames,
        'Kecamatan': kecamatanNames,
        'DAS': dasNames
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
      setLocationData({
        'Provinsi': ['DKI Jakarta', 'Jawa Tengah', 'Jawa Barat', 'Jawa Timur'],
        'Kabupaten/Kota': ['Kab. Banyumas', 'Kab. Purbalingga', 'Kota Semarang'],
        'Kecamatan': ['Kec. Purwokerto Utara', 'Kec. Purwokerto Selatan'],
        'DAS': ['DAS Serayu', 'DAS Bogowonto', 'DAS Pemali']
      });
    }
  };

  const handleTabChange = (tab: 'Kerawanan' | 'Kebencanaan' | 'Mitigasi/Adaptasi' | 'Manajemen File SHP') => {
    setActiveTab(tab);
    setSelectedDisaster(null);
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setSelectedYear('');
    setSelectedTable('');
    setSelectedUploadYear('');
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    setShowYearDropdown(false);
    setShowTableDropdown(false);
    setMapCount(1);
    if (onMapCountChange) onMapCountChange(1);
    onFilterChange(null);
    onTabChange(tab);
  };

  const handleMapCountChange = (count: number) => {
    setMapCount(count);
    if (onMapCountChange) onMapCountChange(count);
  };

  // const handleDisasterSelect = (disasterType: string) => {
  //   setSelectedDisaster(disasterType);
  //   setSelectedLocation('');
  //   setSelectedMitigationLayers([]);
  //   setSelectedYear('');
  //   setShowLocationDropdown(false);
  //   setShowMitigationDropdown(false);
  //   setShowYearDropdown(false);
  //   if (selectedLocation && activeTab !== 'Mitigasi/Adaptasi') {
  //     applyFilter(disasterType, activeLocationLevel, selectedLocation);
  //   }
  // };

  const handleDisasterSelect = (disasterType: string) => {
    setSelectedDisaster(disasterType); // Kode ini yang disederhanakan - gunakan 1 state untuk semua tab
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setSelectedYear('');
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    setShowYearDropdown(false);
  };

  // const handleLocationLevelChange = (level: 'Provinsi' | 'Kabupaten/Kota' | 'Kecamatan' | 'DAS') => {
  //   setActiveLocationLevel(level);
  //   setSelectedLocation('');
  //   setSelectedMitigationLayers([]);
  //   setShowLocationDropdown(false);
  //   setShowMitigationDropdown(false);
  //   setLocationSearch('');
  //   onFilterChange(null);
  // };

  const handleLocationLevelChange = (level: 'Indonesia' | 'Provinsi' | 'Kabupaten/Kota' | 'Kecamatan' | 'DAS') => {
    setActiveLocationLevel(level as any);
    
    // Untuk level Indonesia, set lokasi otomatis ke 'Indonesia'
    if (level === 'Indonesia') {
      setSelectedLocation('Indonesia');
      setShowLocationDropdown(false);
      setLocationSearch('');
      
      // Langsung apply filter untuk Indonesia jika disaster sudah dipilih
      if (selectedDisaster) {
        if (activeTab === 'Kerawanan') {
          applyFilter(selectedDisaster, 'Indonesia', 'Indonesia');
        } else if (activeTab === 'Kebencanaan') {
          applyFilter(selectedDisaster, 'Indonesia', 'Indonesia');
        }
      }
    } else {
      setSelectedLocation('');
      setShowLocationDropdown(false);
      setLocationSearch('');
      onFilterChange(null);
    }
    
    setSelectedMitigationLayers([]);
    setShowMitigationDropdown(false);
  };

  // const handleLocationSelect = (location: string) => {
  //   setSelectedLocation(location);
  //   setShowLocationDropdown(false);
  //   setLocationSearch('');
  //   if (selectedDisaster && activeTab !== 'Mitigasi/Adaptasi') {
  //     applyFilter(selectedDisaster, activeLocationLevel, location);
  //   } else if (activeTab === 'Mitigasi/Adaptasi') {
  //     setSelectedMitigationLayers([]);
  //     setShowMitigationDropdown(false);
  //     applyMitigationFilter('', activeLocationLevel, location, []);
  //   }
  // };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
    setLocationSearch('');
    
    if (activeTab === 'Mitigasi/Adaptasi') {
      setSelectedMitigationLayers([]);
      setShowMitigationDropdown(false);
      
      if (selectedDisaster) { // Kode ini yang disederhanakan - gunakan selectedDisaster
        applyMitigationFilter(selectedDisaster, activeLocationLevel, location, []); // Kode ini yang disederhanakan
      }
    } else if (selectedDisaster) {
      applyFilter(selectedDisaster, activeLocationLevel, location);
    }
  };

  // const handleMitigationLayerChange = (layerName: string, checked: boolean) => {
  //   let newSelectedLayers = checked 
  //     ? [...selectedMitigationLayers, layerName] 
  //     : selectedMitigationLayers.filter(layer => layer !== layerName);
  //   setSelectedMitigationLayers(newSelectedLayers);
  //   if (selectedLocation) {
  //     applyMitigationFilter('', activeLocationLevel, selectedLocation, newSelectedLayers);
  //   }
  // };

  const handleMitigationLayerChange = (layerName: string, checked: boolean) => {
    let newSelectedLayers = checked 
      ? [...selectedMitigationLayers, layerName] 
      : selectedMitigationLayers.filter(layer => layer !== layerName);
    setSelectedMitigationLayers(newSelectedLayers);
    
    if (selectedLocation && selectedDisaster) { // Kode ini yang disederhanakan - gunakan selectedDisaster
      applyMitigationFilter(selectedDisaster, activeLocationLevel, selectedLocation, newSelectedLayers); // Kode ini yang disederhanakan
    }
  };

  const applyFilter = (disasterType: string, locationLevel: string, location: string) => {
    if (!disasterType || (!location && locationLevel !== 'Indonesia')) {
      onFilterChange(null);
      return;
    }
    if (activeTab === 'Kerawanan') {
      const filterQuery = {
        category: activeTab,
        disasterType,
        locationType: locationLevel,
        selectedValue: location,
        isRiskAnalysis: true,
        layers: [
          { endpoint: '/api/risk-analysis', type: 'risk', filter: { 
              disaster_type: disasterType,
              level: locationLevel,
              location_name: location
            }
          },
          { endpoint: getBoundaryEndpoint(locationLevel), type: 'boundary', filter: getBoundaryFilter(locationLevel, location) }
        ]
      };
      onFilterChange(filterQuery);
    } else if (activeTab === 'Kebencanaan') {
      // TAMBAHAN: Handle level Indonesia

      if (locationLevel === 'Indonesia') {
        const disasterTableMapping: Record<string, string> = {
          'Banjir': 'penutupan_lahan_2024',
          'Longsor': 'lahan_kritis',
          'Kebakaran': 'areal_karhutla_2024'
        };

        const disasterTable = disasterTableMapping[disasterType];


        if (!disasterTable) {
          console.error('Invalid disaster type for Indonesia Kebencanaan:', disasterType);
          return;
        }

        const filterQuery = {
          category: activeTab,
          disasterType,
          disasterTable,
          locationType: 'Indonesia',
          selectedValue: 'Indonesia',
          layers: [
            { 
              endpoint: '/api/layers/provinsi', 
              type: 'boundary', 
              filter: {} 
            },
            { 
              endpoint: `/api/layers/${disasterTable}`, 
              type: 'disaster', 
              filter: {} 
            }
          ]
        };

        console.log('Applying Indonesia Kebencanaan filter:', filterQuery);
        onFilterChange(filterQuery);
        return;
      }

      // Logika existing untuk Provinsi dan DAS
      const path = `${activeTab}.${disasterType}`;
      const disasterTable = TABLE_MAPPING[path];
      if (!disasterTable) {
        console.error('Table not found for:', path);
        return;
      }
      if (disasterType === 'Kebakaran') {
        console.warn('Kebakaran filter belum tersedia - properties tidak lengkap');
        onFilterChange(null);
        return;
      }
      if (locationLevel !== 'Provinsi' && locationLevel !== 'DAS') {
        console.warn(`Level ${locationLevel} belum didukung untuk Kebencanaan`);
        onFilterChange(null);
        return;
      }
      let filterQuery;
      if (locationLevel === 'Provinsi') {
        filterQuery = {
          category: activeTab,
          disasterType,
          disasterTable,
          locationType: locationLevel,
          selectedValue: location,
          layers: [
            { endpoint: '/api/layers/provinsi', type: 'boundary', filter: { provinsi: location } },
            { endpoint: `/api/layers/${disasterTable}`, type: 'disaster', filter: { filterType: 'province', provinceName: location, disasterTable } }
          ]
        };
      } else if (locationLevel === 'DAS') {
        filterQuery = {
          category: activeTab,
          disasterType,
          disasterTable,
          locationType: locationLevel,
          selectedValue: location,
          layers: [
            { endpoint: '/api/layers/das', type: 'boundary', filter: { nama_das: location } },
            { endpoint: `/api/layers/${disasterTable}`, type: 'disaster', filter: { filterType: 'das', dasName: location, disasterTable } }
          ]
        };
      }
      onFilterChange(filterQuery);
    }
  };

  const getBoundaryEndpoint = (locationLevel: string) => {
    switch (locationLevel) {
      case 'Provinsi': return '/api/layers/provinsi';
      case 'Kabupaten/Kota': return '/api/layers/kab_kota';
      case 'Kecamatan': return '/api/layers/kecamatan';
      case 'DAS': return '/api/layers/das';
      default: return '/api/layers/provinsi';
    }
  };

  const getBoundaryFilter = (locationLevel: string, location: string) => {
    switch (locationLevel) {
      case 'Provinsi': return { provinsi: location };
      case 'Kabupaten/Kota': return { kab_kota: location };
      case 'Kecamatan': return { kecamatan: location };
      case 'DAS': return { nama_das: location };
      default: return { provinsi: location };
    }
  };

  const applyMitigationFilter = (disasterType: string, locationLevel: string, location: string, layers: string[]) => {
    if (!location || !disasterType) {
      onFilterChange(null);
      return;
    }
    
    // ========== UBAH MAPPING INI ==========
    // Mapping untuk mode Kerawanan
    const kerawananTableMapping: Record<string, string> = {
      'Longsor': 'rawan_erosi',
      'Banjir': 'rawan_limpasan', 
      'Kebakaran': 'rawan_karhutla_2024'
    };
    
    // Mapping untuk mode Kebencanaan
    const kebencanaanTableMapping: Record<string, string> = {
      'Longsor': 'lahan_kritis',
      'Banjir': 'penutupan_lahan_2024', 
      'Kebakaran': 'areal_karhutla_2024'
    };
    
    // Tentukan layer berdasarkan mode yang dipilih
    const mainLayers = [
      { endpoint: getBoundaryEndpoint(locationLevel), type: 'boundary', filter: getBoundaryFilter(locationLevel, location) }
    ];
    
    if (mitigationMode === 'Kerawanan') {
      const table = kerawananTableMapping[disasterType];
      if (table) {
        mainLayers.push({
          endpoint: `/api/layers/${table}`, 
          type: 'disaster',
          layerName: `Peta Rawan ${disasterType}`,
          tableName: table,
          filter: {
            filterType: locationLevel === 'Provinsi' ? 'province' : 'das',
            [locationLevel === 'Provinsi' ? 'provinceName' : 'dasName']: location
          }
        });
      }
    } else if (mitigationMode === 'Kebencanaan') {
      const table = kebencanaanTableMapping[disasterType];
      if (table) {
        mainLayers.push({
          endpoint: `/api/layers/${table}`, 
          type: 'disaster',
          layerName: `Peta ${disasterType}`,
          tableName: table,
          filter: {
            filterType: locationLevel === 'Provinsi' ? 'province' : 'das',
            [locationLevel === 'Provinsi' ? 'provinceName' : 'dasName']: location
          }
        });
      }
    } else if (mitigationMode === 'Gabungan') {
      // Tambahkan kedua layer: Kerawanan + Kebencanaan
      const kerawananTable = kerawananTableMapping[disasterType];
      const kebencanaanTable = kebencanaanTableMapping[disasterType];
      
      if (kerawananTable) {
        mainLayers.push({
          endpoint: `/api/layers/${kerawananTable}`, 
          type: 'disaster',
          layerName: `Peta Rawan ${disasterType}`,
          tableName: kerawananTable,
          filter: {
            filterType: locationLevel === 'Provinsi' ? 'province' : 'das',
            [locationLevel === 'Provinsi' ? 'provinceName' : 'dasName']: location
          }
        });
      }
      
      if (kebencanaanTable) {
        mainLayers.push({
          endpoint: `/api/layers/${kebencanaanTable}`, 
          type: 'disaster',
          layerName: `Peta ${disasterType}`,
          tableName: kebencanaanTable,
          filter: {
            filterType: locationLevel === 'Provinsi' ? 'province' : 'das',
            [locationLevel === 'Provinsi' ? 'provinceName' : 'dasName']: location
          }
        });
      }
    }
    // ========== AKHIR PERUBAHAN ==========
    
    // Layer tambahan dari checkbox (jika ada)
    const additionalLayers = layers.map(layerLabel => {
      // Cari table name dari layer label
      const layerConfig = DISASTER_SPECIFIC_LAYERS[disasterType]?.find(l => l.label === layerLabel);
      const tableName = layerConfig?.table;
      
      if (!tableName) {
        console.error('Table mapping not found for layer:', layerLabel);
        return null;
      }
      return {
        endpoint: `/api/layers/${tableName}`,
        type: 'mitigation',
        layerName: layerLabel,
        tableName,
        filter: {
          filterType: locationLevel === 'Provinsi' ? 'province' : 'das',
          [locationLevel === 'Provinsi' ? 'provinceName' : 'dasName']: location
        }
      };
    }).filter(layer => layer !== null);

    const filterQuery = {
      category: 'Mitigasi/Adaptasi',
      disasterType: disasterType,
      mitigationMode: mitigationMode, // Tambahkan info mode
      locationType: locationLevel,
      selectedValue: location,
      selectedLayers: layers,
      layers: [
        ...mainLayers,
        ...additionalLayers
      ]
    };
    
    console.log('✅ Mitigation filter applied:', {
      disasterType,
      mode: mitigationMode,
      location,
      totalLayers: filterQuery.layers.length,
      additionalLayers: layers.length
    });
    
    onFilterChange(filterQuery);
  };

  const handleTableSelect = (table: string) => {
    if (table === '__NEW_TABLE__') {
      setShowNewTableModal(true);
      setShowTableDropdown(false);
    } else {
      setSelectedTable(table);
      setIsNewTable(false);
      setNewTableName('');
      setShowTableDropdown(false);
      setTableSearchQuery('');
    }
  };

  const handleNewTableSave = (tableName: string) => {
    setNewTableName(tableName);
    setSelectedTable(tableName);
    setIsNewTable(true);
    setShowNewTableModal(false);
    alert(`✅ Tabel baru "${tableName}" akan dibuat saat upload.\n\nSilakan lanjutkan dengan:\n1. Masukkan tahun\n2. Upload file SHP\n3. Pilih "Upload Langsung" atau "Simplifikasi"`);
  };
  
  const handleUploadYearSelect = (year: string) => {
    setSelectedUploadYear(year);
  };

  // const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = event.target.files;
  //   if (!files || files.length === 0) return;
  //   if (!selectedTable) {
  //     alert('Pilih tabel terlebih dahulu!');
  //     return;
  //   }
  //   if (!selectedUploadYear || selectedUploadYear.trim() === '') {
  //     alert('Masukkan tahun terlebih dahulu!');
  //     return;
  //   }

  //   const fileArray = Array.from(files);
    
  //   const hasShp = fileArray.some(f => f.name.toLowerCase().endsWith('.shp'));
  //   const hasShx = fileArray.some(f => f.name.toLowerCase().endsWith('.shx'));
  //   const hasDbf = fileArray.some(f => f.name.toLowerCase().endsWith('.dbf'));
    
  //   if (!hasShp || !hasShx || !hasDbf) {
  //     alert('File SHP tidak lengkap!\n\nFile yang wajib:\n- .shp (geometri)\n- .shx (index)\n- .dbf (atribut)\n\nFile opsional:\n- .prj (proyeksi)');
  //     event.target.value = '';
  //     return;
  //   }
    
  //   setUploadedFiles(fileArray);
    
  //   // ✅ TAMBAHKAN: Track filenames untuk cleanup
  //   const filenames = fileArray.map(f => f.name);
  //   setUploadedTempFiles(filenames);
  //   console.log('📁 Files tracked for cleanup:', filenames);
    
  //   try {
  //     const formData = new FormData();
  //     const dbfFile = fileArray.find(f => f.name.toLowerCase().endsWith('.dbf'));
  //     if (dbfFile) {
  //       formData.append('dbfFile', dbfFile);
  //     }
      
  //     const response = await fetch('http://localhost:3001/api/shp/parse-dbf', {
  //       method: 'POST',
  //       body: formData
  //     });
      
  //     if (!response.ok) {
  //       throw new Error('Failed to parse DBF file');
  //     }
      
  //     const data = await response.json();
  //     setDbfColumns(data.columns);
  //     setDbfData(data.data);
  //     setUploadPending(true);
      
  //     alert(`File .dbf berhasil diupload dan diparse.\nKolom: ${data.columns.join(', ')}\nJumlah data: ${data.recordCount}\n\nSilakan tekan tombol "Upload" untuk melanjutkan.`);
  //   } catch (error) {
  //     console.error('Error parsing DBF:', error);
  //     alert('Gagal memparse file .dbf');
  //     setUploadedFiles([]);
  //     setUploadedTempFiles([]);
  //   }
    
  //   event.target.value = '';
  // };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!selectedTable) {
      alert('Pilih tabel terlebih dahulu!');
      return;
    }
    if (!selectedUploadYear || selectedUploadYear.trim() === '') {
      alert('Masukkan tahun terlebih dahulu!');
      return;
    }

    const fileArray = Array.from(files);
    
    // 🔥 PERBAIKAN: Cek file SHP lengkap (bukan hanya .dbf)
    const hasShp = fileArray.some(f => f.name.toLowerCase().endsWith('.shp'));
    const hasShx = fileArray.some(f => f.name.toLowerCase().endsWith('.shx'));
    const hasDbf = fileArray.some(f => f.name.toLowerCase().endsWith('.dbf'));
    
    if (!hasDbf) {
      alert('⚠️ File .dbf tidak ditemukan!\n\nFile .dbf diperlukan untuk melihat kolom yang tersedia.');
      event.target.value = '';
      return;
    }
    
    if (!hasShp || !hasShx) {
      const confirmContinue = confirm(
        '⚠️ File SHP tidak lengkap!\n\nFile yang terdeteksi:\n' +
        (hasShp ? '✓ .shp\n' : '✗ .shp (tidak ada)\n') +
        (hasShx ? '✓ .shx\n' : '✗ .shx (tidak ada)\n') +
        (hasDbf ? '✓ .dbf\n' : '✗ .dbf (tidak ada)\n') +
        '\nFile .shp dan .shx diperlukan untuk upload ke database.\n\n' +
        'Anda bisa melanjutkan untuk melihat kolom, tetapi harus upload file lengkap nanti.\n\n' +
        'Lanjutkan?'
      );
      if (!confirmContinue) {
        event.target.value = '';
        return;
      }
    }
    
    setUploadedFiles(fileArray);
    
    // Track filenames untuk cleanup
    const filenames = fileArray.map(f => f.name);
    setUploadedTempFiles(filenames);
    console.log('📁 Files tracked:', filenames);
    
    try {
      const formData = new FormData();
      const dbfFile = fileArray.find(f => f.name.toLowerCase().endsWith('.dbf'));
      if (dbfFile) {
        formData.append('dbfFile', dbfFile);
      }
      
      const response = await fetch('http://localhost:3001/api/shp/parse-dbf', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse DBF file');
      }
      
      const data = await response.json();
      setDbfColumns(data.columns);
      setDbfData(data.data);
      setUploadPending(true);
      
      const fileStatus = hasShp && hasShx && hasDbf ? 
        '✅ File SHP LENGKAP!' : 
        '⚠️ File tidak lengkap - upload file lengkap di modal berikutnya';
      
      alert(`✅ File berhasil diupload!\n\n📋 Kolom ditemukan: ${data.columns.length}\n📊 Jumlah data: ${data.recordCount}\n\n${fileStatus}\n\n${isNewTable ? '🆕 Tabel baru akan dibuat.\n' : ''}Klik tombol ${isNewTable ? '"Upload Langsung" atau "Simplifikasi"' : '"Upload"'} untuk melanjutkan.`);
    } catch (error) {
      console.error('Error parsing DBF:', error);
      alert('❌ Gagal memparse file .dbf\n\n' + error.message);
      setUploadedFiles([]);
      setUploadedTempFiles([]);
    }
    
    event.target.value = '';
  };

  const cleanupUploadedFiles = async () => {
    if (uploadedTempFiles.length === 0) return;
    
    try {
      console.log('🗑️ Cleaning up uploaded files:', uploadedTempFiles);
      
      const response = await fetch('http://localhost:3001/api/cleanup-temp-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filenames: uploadedTempFiles
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Cleanup result:', result);
      } else {
        console.warn('⚠️ Cleanup failed');
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    } finally {
      // Clear state
      setUploadedTempFiles([]);
      setUploadedFiles([]);
      setUploadPending(false);
      setDbfColumns([]);
      setDbfData([]);
    }
  };

  const handleDirectUpload = () => {
    if (isNewTable) {
      setShowDirectUploadNewTable(true);
    } else {
      setShowUploadWorkflow(true);
    }
  };

  const handleSimplification = () => {
  if (isNewTable) {
    setShowSimplifyNewTable(true);
  } else {
    setShowUploadWorkflow(true);
  }
};

  const filteredTables = availableTables.filter(table =>
    table.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );

  const handleReset = () => {
    setActiveTab('Kerawanan');
    setSelectedDisaster(null);
    setActiveLocationLevel('Provinsi');
    setSelectedLocation('');
    setSelectedMitigationLayers([]);
    setMitigationMode('Kerawanan');
    setShowLocationDropdown(false);
    setShowMitigationDropdown(false);
    setLocationSearch('');
    setMapCount(1);
    if (onMapCountChange) onMapCountChange(1);
    if (onResetToMain) onResetToMain();
    onFilterChange(null);
    onTabChange('Kerawanan');
  };

  const filteredLocations = (locationData[activeLocationLevel] || []).filter(location => {
    if (!location || typeof location !== 'string') return false;
    const searchTerm = locationSearch || '';
    return location.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // const getDropdownPlaceholder = () => {
  //   if (activeTab === 'Mitigasi/Adaptasi') {
  //     const placeholders: Record<string, string> = {
  //       'Provinsi': 'Pilih Provinsi',
  //       'Kabupaten/Kota': 'Pilih Kabupaten/Kota',
  //       'Kecamatan': 'Pilih Kecamatan',
  //       'DAS': 'Pilih DAS'
  //     };
  //     return placeholders[activeLocationLevel];
  //   }
  //   if (!selectedDisaster) return '-- Pilih jenis bencana --';
  //   if (activeTab === 'Kebencanaan' && (activeLocationLevel === 'Kabupaten/Kota' || activeLocationLevel === 'Kecamatan')) {
  //     return `${activeLocationLevel} belum didukung untuk Kebencanaan`;
  //   }
  //   if (activeTab === 'Kebencanaan' && selectedDisaster === 'Kebakaran') {
  //     return 'Kebakaran belum tersedia (data tidak lengkap)';
  //   }
  //   const placeholders: Record<string, string> = {
  //     'Provinsi': 'Pilih Provinsi',
  //     'Kabupaten/Kota': 'Pilih Kabupaten/Kota',
  //     'Kecamatan': 'Pilih Kecamatan',
  //     'DAS': 'Pilih DAS'
  //   };
  //   return placeholders[activeLocationLevel];
  // };

  const getDropdownPlaceholder = () => {
    if (!selectedDisaster) return '-- Pilih jenis bencana terlebih dahulu --'; // Kode ini yang disederhanakan - satu kondisi untuk semua tab
    
    if (activeTab === 'Kebencanaan' && (activeLocationLevel === 'Kabupaten/Kota' || activeLocationLevel === 'Kecamatan')) {
      return `${activeLocationLevel} belum didukung untuk Kebencanaan`;
    }
    if (activeTab === 'Kebencanaan' && selectedDisaster === 'Kebakaran') {
      return 'Kebakaran belum tersedia (data tidak lengkap)';
    }
    
    const placeholders: Record<string, string> = {
      'Provinsi': 'Pilih Provinsi',
      'Kabupaten/Kota': 'Pilih Kabupaten/Kota',
      'Kecamatan': 'Pilih Kecamatan',
      'DAS': 'Pilih DAS'
    };
    return placeholders[activeLocationLevel];
  };

  const getSearchPlaceholder = () => {
    const placeholders: Record<string, string> = {
      'Provinsi': 'Cari provinsi...',
      'Kabupaten/Kota': 'Cari kabupaten/kota...',
      'Kecamatan': 'Cari kecamatan...',
      'DAS': 'Cari DAS...'
    };
    return placeholders[activeLocationLevel];
  };

  // const getMitigationDropdownPlaceholder = () => {
  //   if (!selectedLocation) return 'Pilih lokasi terlebih dahulu';
  //   if (selectedMitigationLayers.length === 0) return 'Pilih Layer Peta';
  //   if (selectedMitigationLayers.length === 1) return `${selectedMitigationLayers[0]}`;
  //   return `${selectedMitigationLayers.length} layer dipilih`;
  // };

  const getMitigationDropdownPlaceholder = () => {
    if (!selectedLocation) return 'Pilih lokasi terlebih dahulu';
    if (!selectedDisaster) return 'Pilih jenis bencana terlebih dahulu'; // Kode ini yang disederhanakan - gunakan selectedDisaster
    if (selectedMitigationLayers.length === 0) return 'Pilih Layer Peta Tambahan (Opsional)';
    if (selectedMitigationLayers.length === 1) return `${selectedMitigationLayers[0]}`;
    return `${selectedMitigationLayers.length} layer tambahan dipilih`;
  };

  const isValidKebencanaan = () => {
    if (activeTab !== 'Kebencanaan') return true;
    if (selectedDisaster === 'Kebakaran') return false;
    if (activeLocationLevel !== 'Provinsi' && activeLocationLevel !== 'DAS') return false;
    return true;
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
  };

  const disasterTypes = [
    { key: 'Longsor', name: 'Longsor', icon: 'longsor.png' },
    { key: 'Banjir', name: 'Banjir', icon: 'banjir.png' },
    { key: 'Kebakaran', name: 'Kebakaran', icon: 'kebakaran.png' }
  ];

  const locationLevels = activeTab === 'Mitigasi/Adaptasi' 
    ? [
        { key: 'Provinsi', name: 'Provinsi' },
        { key: 'DAS', name: 'DAS' }
      ]
    : activeTab === 'Kerawanan'
    ? [
        { key: 'Indonesia', name: 'Indonesia' },
        { key: 'Provinsi', name: 'Provinsi' },
        { key: 'Kabupaten/Kota', name: 'Kab/Kota' },
        { key: 'Kecamatan', name: 'Kecamatan' },
        { key: 'DAS', name: 'DAS' }
      ]
    : [
        { key: 'Indonesia', name: 'Indonesia' },
        { key: 'Provinsi', name: 'Provinsi' },
        { key: 'Kabupaten/Kota', name: 'Kab/Kota' },
        { key: 'Kecamatan', name: 'Kecamatan' },
        { key: 'DAS', name: 'DAS' }
      ];

  const mitigationLayers = [
    'Peta Areal Karhutla',
    'Peta Lahan Kritis',
    'Peta Penutupan Lahan',
    'Peta Rawan Karhutla',
    'Peta Rawan Erosi',
    'Peta Rawan Limpasan',
  ];

  return (
    <div className="filter-container-new">
      {/* Disaster Type Tabs */}
      <div className="filter-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'Kerawanan' ? 'active' : ''}`}
          onClick={() => handleTabChange('Kerawanan')}
        >
          Kerawanan
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'Kebencanaan' ? 'active' : ''}`}
          onClick={() => handleTabChange('Kebencanaan')}
        >
          Kebencanaan
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'Mitigasi/Adaptasi' ? 'active' : ''}`}
          onClick={() => handleTabChange('Mitigasi/Adaptasi')}
        >
          Mitigasi/Adaptasi
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'Manajemen File SHP' ? 'active' : ''}`}
          onClick={() => handleTabChange('Manajemen File SHP')}
        >
          Manajemen File SHP
        </button>
      </div>

      {/* Disaster Type Icons */}
      {activeTab !== 'Manajemen File SHP' && (
        <div className="disaster-icons">
          {disasterTypes.map((disaster) => (
            <button
              key={disaster.key}
              type="button"
              className={`disaster-icon ${selectedDisaster === disaster.key ? 'selected' : ''} ${
                activeTab === 'Kebencanaan' && disaster.key === 'Kebakaran' ? 'disabled' : ''
              }`}
              onClick={() => handleDisasterSelect(disaster.key)}
              title={activeTab === 'Kebencanaan' && disaster.key === 'Kebakaran' 
                ? 'Kebakaran belum tersedia untuk Kebencanaan' 
                : disaster.name}
              disabled={activeTab === 'Kebencanaan' && disaster.key === 'Kebakaran'}
            >
              <div className="icon-placeholder">
                <img 
                  src={`/images/${disaster.icon}`} 
                  alt={disaster.name}
                  width="40" 
                  height="40"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'Mitigasi/Adaptasi' && (
        <div className="mitigation-mode-tabs" style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
          padding: '4px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px'
        }}>
          {['Kerawanan', 'Kebencanaan', 'Gabungan'].map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={!selectedDisaster}
              onClick={() => {
                if (!selectedDisaster) return;
                setMitigationMode(mode as any);
                // Re-apply filter jika sudah ada lokasi terpilih
                if (selectedLocation) {
                  setTimeout(() => {
                    applyMitigationFilter(selectedDisaster, activeLocationLevel, selectedLocation, selectedMitigationLayers);
                  }, 50);
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: mitigationMode === mode ? '600' : '500',
                color: !selectedDisaster ? '#d1d5db' : (mitigationMode === mode ? '#1f2937' : '#6b7280'),
                backgroundColor: !selectedDisaster ? '#f9fafb' : (mitigationMode === mode ? '#ffffff' : 'transparent'),
                border: 'none',
                borderRadius: '6px',
                cursor: !selectedDisaster ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: mitigationMode === mode && selectedDisaster ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                opacity: !selectedDisaster ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (mitigationMode !== mode && selectedDisaster) {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (mitigationMode !== mode && selectedDisaster) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={!selectedDisaster ? 'Pilih jenis bencana terlebih dahulu' : `Mode ${mode}`}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      {/* Location Level Tabs */}
      {activeTab !== 'Manajemen File SHP' && (
        <div className="location-tabs">
          {locationLevels.map((level) => (
            <button
              key={level.key}
              type="button"
              className={`location-tab ${activeLocationLevel === level.key ? 'active' : ''} ${
                activeTab === 'Mitigasi/Adaptasi' ? '' :
                (!selectedDisaster || 
                (activeTab === 'Kebencanaan' && (level.key === 'Kabupaten/Kota' || level.key === 'Kecamatan')))
                ? 'disabled' : ''
              }`}
              onClick={() => {
                if (activeTab === 'Mitigasi/Adaptasi') {
                  if (selectedDisaster && mitigationMode) {
                    handleLocationLevelChange(level.key as any);
                  }
                } else if (selectedDisaster) {
                  handleLocationLevelChange(level.key as any);
                }
              }}
              disabled={
                activeTab === 'Mitigasi/Adaptasi' ? false :
                (!selectedDisaster || 
                (activeTab === 'Kebencanaan' && (level.key === 'Kabupaten/Kota' || level.key === 'Kecamatan')))
              }
              title={
                activeTab === 'Mitigasi/Adaptasi' ? `Pilih ${level.name}` :
                (!selectedDisaster ? 'Pilih jenis bencana terlebih dahulu' : 
                (activeTab === 'Kebencanaan' && (level.key === 'Kabupaten/Kota' || level.key === 'Kecamatan'))
                ? `${level.name} belum didukung untuk Kebencanaan` : `Pilih ${level.name}`)
              }
            >
              {level.name}
            </button>
          ))}
        </div>
      )}

      {/* Year Dropdown */}
      {/* {(activeTab === 'Kebencanaan' || activeTab === 'Kerawanan' || activeTab === 'Mitigasi/Adaptasi') && (
        <div className="year-section" style={{ marginTop: '12px' }}>
          <div className="dropdown-container">
            <button
              type="button"
              className={`location-dropdown ${selectedYear ? 'selected' : ''} ${showYearDropdown ? 'open' : ''}`}
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <span style={{ color: selectedYear ? '#333' : '#999' }}>
                {selectedYear || 'Pilih Tahun (2020-2025)'}
              </span>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                style={{ 
                  transform: showYearDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <path 
                  d="M2 4L6 8L10 4" 
                  stroke="#666" 
                  strokeWidth="1.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showYearDropdown && (
              <>
                <div 
                  className="dropdown-backdrop"
                  onClick={() => setShowYearDropdown(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998
                  }}
                />
                <div 
                  className="dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 999
                  }}
                >
                  {yearOptions.map(year => (
                    <button
                      key={year}
                      type="button"
                      className={`dropdown-item ${selectedYear === year ? 'selected' : ''}`}
                      onClick={() => handleYearSelect(year)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: selectedYear === year ? '#f0f7ff' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: selectedYear === year ? '#0066cc' : '#333'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedYear !== year) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedYear !== year) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )} */}

      {/* Location Section */}
      {activeTab !== 'Manajemen File SHP' && (
        <div className="location-section">
          <div className="dropdown-container">
            <button
              type="button"
              className={`location-dropdown ${selectedLocation ? 'selected' : ''} ${showLocationDropdown ? 'open' : ''} ${
                !selectedDisaster || 
                (activeTab === 'Kebencanaan' && !isValidKebencanaan()) || 
                (activeTab === 'Kerawanan' && activeLocationLevel === 'Indonesia') ||
                (activeTab === 'Kebencanaan' && activeLocationLevel === 'Indonesia') ? 'disabled' : ''
              }`}
              onClick={() => {
                if (activeTab === 'Kerawanan' && activeLocationLevel === 'Indonesia') {
                  // Untuk level Indonesia, set otomatis tanpa dropdown
                  return;
                }
                if (activeTab === 'Kebencanaan' && activeLocationLevel === 'Indonesia') {
                  return;
                }
                if (selectedDisaster && (activeTab !== 'Kebencanaan' || isValidKebencanaan())) {
                  setShowLocationDropdown(!showLocationDropdown);
                }
              }}
              disabled={
                !selectedDisaster || 
                (activeTab === 'Kebencanaan' && !isValidKebencanaan()) || 
                (activeTab === 'Kerawanan' && activeLocationLevel === 'Indonesia') ||
                (activeTab === 'Kebencanaan' && activeLocationLevel === 'Indonesia')
              }
            >
              <span>
                {(activeTab === 'Kerawanan' && activeLocationLevel === 'Indonesia') || 
                 (activeTab === 'Kebencanaan' && activeLocationLevel === 'Indonesia')
                  ? 'Indonesia' 
                  : (selectedLocation || getDropdownPlaceholder())}
              </span>
              <svg className="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            {showLocationDropdown && selectedDisaster && (activeTab !== 'Kebencanaan' || isValidKebencanaan()) && activeLocationLevel !== 'Indonesia' && (
              <div className="dropdown-menu">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder={getSearchPlaceholder()}
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="search-input"
                  />
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="21 21l-4.35-4.35"/>
                  </svg>
                </div>
                <div className="dropdown-options">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((location) => (
                      <button
                        key={location}
                        type="button"
                        className={`dropdown-option ${selectedLocation === location ? 'selected' : ''}`}
                        onClick={() => handleLocationSelect(location)}
                      >
                        {location}
                      </button>
                    ))
                  ) : (
                    <div className="no-results">Tidak ada hasil ditemukan</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      

      {selectedLocation && activeTab === 'Mitigasi/Adaptasi' && selectedDisaster && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <div className="flex-1">
              <div className="text-blue-800 font-semibold">
                Jumlah Peta: {1 + selectedMitigationLayers.length}
              </div>
              <div className="text-xs text-blue-700 mt-0.5">
                1 peta utama (batas + {mitigationMode === 'Gabungan' ? '2 layer ' + selectedDisaster.toLowerCase() : 'layer ' + selectedDisaster.toLowerCase()})
                {selectedMitigationLayers.length > 0 ? ` + ${selectedMitigationLayers.length} peta layer tambahan` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mitigation Section */}
      {activeTab === 'Mitigasi/Adaptasi' && (
        <div className="mitigation-section">
          <div className="dropdown-container">
            <button
                type="button"
                className={`mitigation-dropdown ${selectedMitigationLayers.length > 0 ? 'selected' : ''} ${showMitigationDropdown ? 'open' : ''} ${
                  !selectedLocation || !selectedDisaster ? 'disabled' : '' // Kode ini yang disederhanakan
                }`}
                onClick={() => {
                  if (selectedLocation && selectedDisaster) { // Kode ini yang disederhanakan
                    setShowMitigationDropdown(!showMitigationDropdown);
                  }
                }}
                disabled={!selectedLocation || !selectedDisaster} // Kode ini yang disederhanakan
                title={
                  !selectedLocation ? 'Pilih lokasi terlebih dahulu' : 
                  !selectedDisaster ? 'Pilih jenis bencana terlebih dahulu' : // Kode ini yang disederhanakan
                  'Pilih layer peta tambahan yang ingin ditampilkan'
                }
              >
              <span>{getMitigationDropdownPlaceholder()}</span>
              <svg className="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            {showMitigationDropdown && selectedLocation && selectedDisaster && (
              <div className="mitigation-dropdown-menu">
                <div className="mitigation-dropdown-header">
                  <span className="mitigation-dropdown-title">Pilih Layer Tambahan untuk {selectedDisaster}:</span>
                  <span className="mitigation-dropdown-counter">
                    {selectedMitigationLayers.length} layer dipilih
                  </span>
                </div>
                <div className="mitigation-dropdown-options">
                  {DISASTER_SPECIFIC_LAYERS[selectedDisaster]?.map((layer) => (
                    <label
                      key={layer.label}
                      className={`mitigation-dropdown-option ${layer.disabled ? 'disabled' : ''}`}
                      style={{
                        opacity: layer.disabled ? 0.5 : 1,
                        cursor: layer.disabled ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        className="mitigation-checkbox"
                        checked={selectedMitigationLayers.includes(layer.label)}
                        onChange={(e) => {
                          if (!layer.disabled) {
                            handleMitigationLayerChange(layer.label, e.target.checked);
                          }
                        }}
                        disabled={layer.disabled}
                      />
                      <span className="mitigation-checkbox-text">
                        {layer.label}
                        {layer.disabled && <span style={{ 
                          marginLeft: '6px', 
                          fontSize: '11px', 
                          color: '#9ca3af',
                          fontStyle: 'italic'
                        }}>(Segera Hadir)</span>}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedMitigationLayers.length > 0 && (
                  <div className="mitigation-dropdown-footer">
                    <button
                      type="button"
                      className="clear-selection-btn"
                      onClick={() => {
                        setSelectedMitigationLayers([]);
                        if (selectedLocation) {
                          applyMitigationFilter(selectedDisaster, activeLocationLevel, selectedLocation, []);
                        }
                      }}
                    >
                      Hapus Semua
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Map Count Slider Section
          <div className="map-count-slider-section">
            <div className="slider-container">
              <label className="slider-label">Jumlah Peta yang Ditampilkan</label>
              <div className="slider-controls">
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={mapCount}
                    onChange={(e) => handleMapCountChange(parseInt(e.target.value))}
                    className="map-count-slider"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(mapCount - 1) * 11.11}%, #bfdbfe ${(mapCount - 1) * 11.11}%, #bfdbfe 100%)`
                    }}
                  />
                  <div className="slider-value-badge">
                    {mapCount}
                  </div>
                </div>
                <div className="slider-hints">
                  <span className="slider-hint-min">1 peta</span>
                  <span className="slider-hint-current">{mapCount} peta aktif</span>
                  <span className="slider-hint-max">10 peta</span>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      )}

      {/* Content untuk tab Manajemen File SHP */}
      {activeTab === 'Manajemen File SHP' && (
        <div className="shp-upload-section">
          {/* Table Dropdown */}
          <div className="control-group-vertical">
            <label className="control-label">Pilih Tabel untuk file shp</label>
            <div className="dropdown-wrapper">
              <button
                type="button"
                className={`table-dropdown-btn ${showTableDropdown ? 'open' : ''}`}
                onClick={() => setShowTableDropdown(!showTableDropdown)}
              >
                <span className={selectedTable ? 'selected' : 'placeholder'}>
                  {selectedTable ? (
                    <>
                      {selectedTable}
                      {isNewTable && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">BARU</span>}
                    </>
                  ) : 'Pilih Tabel untuk file shp'}
                </span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 16 16" 
                  className={`dropdown-icon ${showTableDropdown ? 'rotate' : ''}`}
                >
                  <path 
                    d="M4 6L8 10L12 6" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {showTableDropdown && (
                <>
                  <div 
                    className="dropdown-backdrop"
                    onClick={() => setShowTableDropdown(false)}
                  />
                  <div className="dropdown-menu">
                    <div className="dropdown-search">
                      <input
                        type="text"
                        placeholder="Cari tabel..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="search-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button
                      type="button"
                      className="add-table-btn"
                      onClick={() => handleTableSelect('__NEW_TABLE__')}
                    >
                      <span className="add-icon">+</span>
                      <span>Tambah tabel baru</span>
                    </button>
                    <div className="dropdown-list">
                      {filteredTables.map(table => (
                        <button
                          key={table}
                          type="button"
                          className={`dropdown-item ${selectedTable === table ? 'selected' : ''}`}
                          onClick={() => handleTableSelect(table)}
                        >
                          {table}
                        </button>
                      ))}
                      {filteredTables.length === 0 && (
                        <div className="no-results">Tidak ada hasil</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Year Input Field */}
          <div className="control-group-vertical">
            <label className="control-label">Masukan Tahun</label>
            <input
              type="number"
              placeholder="Contoh: 2024"
              value={selectedUploadYear}
              onChange={(e) => handleUploadYearSelect(e.target.value)}
              className="year-input-field"
              min="1900"
              max="2100"
            />
          </div>
          {/* Upload Dropzone */}
          <div className="upload-dropzone-container">
            <div 
              className="upload-dropzone-filter"
              onClick={() => document.getElementById('shp-file-input-filter')?.click()}
            >
              <div className="upload-icon-large">📁</div>
              <div className="upload-text-large">Upload File SHP Disini</div>
              <div className="upload-hint">Klik atau drag & drop file .shp, .shx, .dbf, .prj, dll</div>
              {uploadPending && (
                <div className="upload-pending-notice">
                  ⏳ File .dbf sudah diupload. Tekan tombol {isNewTable ? '"Upload Langsung" atau "Simplifikasi"' : '"Upload"'} untuk melanjutkan.
                </div>
              )}
            </div>
            <input
              id="shp-file-input-filter"
              type="file"
              multiple
              accept=".shp,.shx,.dbf,.prj,.cpg,.sbn,.sbx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {/* Filter Footer */}
      <div className="filter-footer">
        <button type="button" className="reset-btn" onClick={async () => {
          if (uploadPending) {
            await cleanupUploadedFiles();
          }
          handleReset();
        }}>
          {activeTab === 'Manajemen File SHP' ? 'Batal' : 'Reset'}
        </button>
        {activeTab === 'Manajemen File SHP' && uploadPending && (
          <>
            {isNewTable ? (
              <>
                <button
                  type="button"
                  className="upload-btn"
                  style={{ 
                    backgroundColor: '#10b981',
                    marginRight: '8px'
                  }}
                  onClick={handleDirectUpload}
                  title="Upload langsung tanpa simplifikasi"
                >
                  Upload Langsung
                </button>
                <button
                  type="button"
                  className="upload-btn"
                  onClick={handleSimplification}
                  title="Upload dengan simplifikasi geometri"
                >
                  Simplifikasi
                </button>
              </>
            ) : (
              <button
                type="button"
                className="upload-btn"
                onClick={() => setShowUploadWorkflow(true)}
              >
                Upload
              </button>
            )}
          </>
        )}
      </div>

      {/* SHP Upload Workflow Modal */}
      {showNewTableModal && (
        <NewTableModal
          onSave={handleNewTableSave}
          onClose={() => setShowNewTableModal(false)}
        />
      )}

      {showSimplifyNewTable && (
        <SimplifyNewTableModal
          onClose={async () => {
            await cleanupUploadedFiles();
            setShowSimplifyNewTable(false);
            setUploadPending(false);
            setUploadedFiles([]);
            setDbfColumns([]);
            setDbfData([]);
          }}
          uploadedFiles={uploadedFiles}
          selectedTable={selectedTable}
          selectedYear={selectedUploadYear}
          dbfColumns={dbfColumns}
          dbfData={dbfData}
        />
      )}

      {showUploadWorkflow && (
        <ShpUploadWorkflowModal 
          onClose={async () => {
            await cleanupUploadedFiles();
            setShowUploadWorkflow(false);
            setUploadPending(false);
            setUploadedFiles([]);
            setDbfColumns([]);
            setDbfData([]);
          }}
          uploadedFiles={uploadedFiles}
          selectedTable={selectedTable}
          selectedYear={selectedUploadYear}
          dbfColumns={dbfColumns}
          dbfData={dbfData}
          isNewTable={isNewTable}
        />
      )}
      {showDirectUploadNewTable && (
        <DirectUploadNewTableModal
          onClose={async () => {
            await cleanupUploadedFiles();
            setShowDirectUploadNewTable(false);
            setUploadPending(false);
            setUploadedFiles([]);
            setDbfColumns([]);
            setDbfData([]);
          }}
          uploadedFiles={uploadedFiles}
          selectedTable={selectedTable}
          selectedYear={selectedUploadYear}
          dbfColumns={dbfColumns}
          dbfData={dbfData}
        />
      )}
    </div>
  );
}

export default Filter