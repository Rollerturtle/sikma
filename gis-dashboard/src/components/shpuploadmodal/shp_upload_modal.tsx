
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

          onClick={onNext}

          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"

        >

          Lanjut ke Simplifikasi

        </button>

      </div>

    </>

  );

}



// =============== SIMPLIFICATION CONTENT ===============

function SimplificationContent({ onBack }: { onBack: () => void }) {

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



// =============== MAIN WORKFLOW MODAL ===============

export function ShpUploadWorkflowModal({ onClose }: UploadShpModalProps) {

  const [currentPage, setCurrentPage] = useState<'mapping' | 'simplification'>('mapping');

  const [showAutoGenModal, setShowAutoGenModal] = useState(false);

  const [showManualTableModal, setShowManualTableModal] = useState(false);

  const [currentEditColumn, setCurrentEditColumn] = useState<string | null>(null);

  const [autoGenConfig, setAutoGenConfig] = useState<Record<string, any>>({});

  const [manualTableData, setManualTableData] = useState<Record<string, any>>({});



  const shpColumns = ['PROVINSI', 'KODE', 'PULAU'];

  const selectedYear = '2019';

  const dbColumns: DBColumn[] = [

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



  const [columnMapping, setColumnMapping] = useState<Record<string, ColumnMapping>>({

    'provinsi': { source: 'PROVINSI', type: 'shp_column' },

    'kode_prov': { source: '', type: '' },

    'fid': { source: '', type: '' },

    'gid': { source: '', type: '' },

    'tahun_data': { source: '', type: '' }

  });



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



  const renderSourceLabel = (mapping: ColumnMapping) => {

    if (!mapping.source) return '-- Pilih mapping --';

    if (mapping.type === 'null') return '⊘ NULL';

    if (mapping.type === 'year_dropdown') return `📅 ${mapping.source}`;

    if (mapping.type === 'auto_generate') return `🔧 ${mapping.source}`;

    if (mapping.type === 'manual_table') return `📊 ${mapping.source}`;

    return mapping.source;

  };



  return (

    <div className="fixed inset-0 flex items-center justify-center z-40 p-4 overflow-y-auto">

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-8 max-h-[95vh] overflow-y-auto">

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

            <SimplificationContent onBack={() => setCurrentPage('mapping')} />

          )}

        </div>



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

export default ShpUploadWorkflowModal